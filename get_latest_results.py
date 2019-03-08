#!/bin/python3
# -*- coding: UTF-8 -*-
# Author: M. Reinmuth, B. Herfort
########################################################################################################################

import sys
import json
import os
# add some files in different folders to sys.
# these files can than be loaded directly
sys.path.insert(0, './cfg/')

import math
import logging
from auth import mapswipe_psqlDB
from auth import firebase_admin_auth
import ogr
import osr
import time

try:
    from send_email_p3 import send_text_via_mail
except:
    pass

import argparse
# define arguments that can be passed by the user
parser = argparse.ArgumentParser(description='Process some integers.')
parser.add_argument('-l', '--loop', dest='loop', action='store_true',
                    help='if loop is set, the import will be repeated several times. You can specify the behaviour using --sleep_time and/or --max_iterations.')
parser.add_argument('-s', '--sleep_time', required=False, default=None, type=int,
                    help='the time in seconds for which the script will pause in beetween two imports')
parser.add_argument('-m', '--max_iterations', required=False, default=None, type=int,
                    help='the maximum number of imports that should be performed')
parser.add_argument('-c', '--count', nargs='+', required=True, default=None, type=int,
                    help='number of results to download.')
parser.add_argument('-o', '--outfile', required=None, default='live.geojson', type=str,
                    help='output path. please provide a location where the exported file should be stored.')




def get_user_name(user_id):
    # connect to firebase
    firebase = firebase_admin_auth()
    fb_db = firebase.database()

    # get all projects
    user_name = fb_db.child("users").child(user_id).child('username').get().val()

    print('got user name information from firebase.')
    logging.warning('got user name information from firebase.')

    return user_name


def get_project_name(project_id):
    # connect to firebase
    firebase = firebase_admin_auth()
    fb_db = firebase.database()

    # get all projects
    project_name = fb_db.child("projects").child(project_id).child('name').get().val()

    print('got project name information from firebase.')
    logging.warning('got project name information from firebase.')

    return project_name



def geometry_from_tile_coords(TileX, TileY, TileZ):

    # Calculate lat, lon of upper left corner of tile
    PixelX = TileX * 256
    PixelY = TileY * 256
    MapSize = 256 * math.pow(2, TileZ)
    x = (PixelX / MapSize) - 0.5
    y = 0.5 - (PixelY / MapSize)
    lon_left = 360 * x
    lat_top = 90 - 360 * math.atan(math.exp(-y * 2 * math.pi)) / math.pi

    # Calculate lat, lon of lower right corner of tile
    PixelX = (TileX + 1) * 256
    PixelY = (TileY + 1) * 256
    MapSize = 256 * math.pow(2, TileZ)
    x = (PixelX / MapSize) - 0.5
    y = 0.5 - (PixelY / MapSize)
    lon_right = 360 * x
    lat_bottom = 90 - 360 * math.atan(math.exp(-y * 2 * math.pi)) / math.pi

    # Create Geometry
    ring = ogr.Geometry(ogr.wkbLinearRing)
    ring.AddPoint(lon_left, lat_top)
    ring.AddPoint(lon_right, lat_top)
    ring.AddPoint(lon_right, lat_bottom)
    ring.AddPoint(lon_left, lat_bottom)
    ring.AddPoint(lon_left, lat_top)
    poly = ogr.Geometry(ogr.wkbPolygon)
    poly.AddGeometry(ring)

    #wkt_geom = poly.ExportToWkt()
    #return wkt_geom
    return poly


def get_results_from_mysql(count):
    # establish mysql connection
    m_con = mapswipe_psqlDB()
    # sql command
    sql_query = '''
        SELECT
          task_id
         ,project_id
         ,user_id
         ,timestamp
         ,info ->> 'result' as result
         ,split_part(task_id, '-', 2) as task_x
         ,split_part(task_id, '-', 3) as task_y
         ,split_part(task_id, '-', 1) as task_z
        FROM
        results
        ORDER BY timestamp DESC
        LIMIT %s'''

    raw_results = m_con.retr_query(sql_query, count)
    # delete/close db connection
    del m_con

    print('got results information from mysql. rows = %s' % len(raw_results))
    logging.warning('got results information from mysql. rows = %s' % len(raw_results))

    return raw_results

def rows_to_geojson(raw_results, outfile):

    # create geojson file
    wgs = osr.SpatialReference()
    wgs.ImportFromEPSG(4326)

    driver = ogr.GetDriverByName('GeoJSON')
    if os.path.exists(outfile):
        os.remove(outfile)
    data_final = driver.CreateDataSource(outfile)
    layer_final = data_final.CreateLayer(outfile, wgs, geom_type=ogr.wkbPolygon)
    fdef_final = layer_final.GetLayerDefn()

    # create geojson attributes
    field_user_name = ogr.FieldDefn('user_name', ogr.OFTString)
    layer_final.CreateField(field_user_name)
    field_task = ogr.FieldDefn('task_id', ogr.OFTString)
    layer_final.CreateField(field_task)
    field_project = ogr.FieldDefn('project_id', ogr.OFTString)
    layer_final.CreateField(field_project)
    field_project_name = ogr.FieldDefn('project_name', ogr.OFTString)
    layer_final.CreateField(field_project_name)
    field_timestamp = ogr.FieldDefn('timestamp', ogr.OFTInteger64)
    layer_final.CreateField(field_timestamp)
    field_result = ogr.FieldDefn('result', ogr.OFTInteger)
    layer_final.CreateField(field_result)
    field_new_id = ogr.FieldDefn('new_id', ogr.OFTInteger)
    layer_final.CreateField(field_new_id)

    # now go through results
    counter = 0

    # create empty user dict
    user_dict = {}
    project_dict = {}

    for row in raw_results:
        feature_final = ogr.Feature(fdef_final)

        # set attributes
        feature_final.SetField('task_id', row[0])

        feature_final.SetField('project_id', str(row[1]))
        # get project name from project dict
        if not str(row[1]) in project_dict:
            project = get_project_name(str(row[1]))
            feature_final.SetField('project_name', project)
            project_dict[str(row[1])] = project
        else:
            project = project_dict[str(row[1])]
            feature_final.SetField('project_name', project)

        if not row[2] in user_dict:
            user_name = get_user_name(row[2])
            feature_final.SetField('user_name', user_name)
            user_dict[row[2]] = user_name
        else:
            user_name = user_dict[row[2]]
            feature_final.SetField('user_name', user_name)

        feature_final.SetField('timestamp', row[3])
        feature_final.SetField('result', row[4])
        feature_final.SetField('new_id', len(raw_results) - counter)

        # set geometry
        feature_final.SetGeometry(geometry_from_tile_coords(int(row[5]), int(row[6]), int(row[7])))
        layer_final.CreateFeature(feature_final)
        feature_final = None

        counter += 1

    layer_final = None
    data_final = None


########################################################################################################################

def get_latest_results(count, outfile):

    logging.basicConfig(filename='get_latest_results.log',
                        level=logging.DEBUG,
                        format='%(asctime)s %(levelname)-8s %(message)s',
                        datefmt='%m-%d %H:%M:%S',
                        filemode='a'
                        )

    logging.warning('Start to get latest results')
    # download results from mysql
    raw_results = get_results_from_mysql(count)

    # convert results to geojson
    rows_to_geojson(raw_results, outfile)
    logging.warning('Finished to get latest results')




########################################################################################################################
if __name__ == '__main__':
    try:
        args = parser.parse_args()
    except:
        print('have a look at the input arguments, something went wrong there.')

    # check whether arguments are correct
    if args.loop and (args.max_iterations is None):
        parser.error('if you want to loop the script please provide number of maximum iterations.')
    elif args.loop and (args.sleep_time is None):
        parser.error('if you want to loop the script please provide a sleep interval.')

    # create a variable that counts the number of imports
    counter = 1
    x = 1

    while x > 0:

        print(' ')
        print('###### ###### ###### ######')
        print('###### iteration: %s ######' % counter)
        print('###### ###### ###### ######')

        # this runs the script and sends an email if an error happens within the execution
        #try:
        get_latest_results(args.count, args.outfile)
        #except BaseException:
        '''
            tb = sys.exc_info()
            # log error
            logging.error(str(tb))
            # send mail to mapswipe google group with
            print(tb)
            try:
                msg = str(tb)
                head = 'get_latest_results.py: error occured'
                send_text_via_mail(msg, head)
            except:
                pass
        '''


        # check if the script should be looped
        if args.loop:
            if args.max_iterations > counter:
                counter = counter + 1
                print('import finished. will pause for %s seconds' % args.sleep_time)
                x = 1
                time.sleep(args.sleep_time)
            else:
                x = 0
                # print('import finished and max iterations reached. stop here.')
                print('import finished and max iterations reached. sleeping now.')
                time.sleep(args.sleep_time)
        # the script should run only once
        else:
            print("Don't loop. Stop after the first run.")
            x = 0