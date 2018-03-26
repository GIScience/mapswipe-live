#!/usr/bin/python3
#
# Author: B. Herfort, M. Reinmuth, 2017
############################################

import pyrebase
import pymysql #handle mysql
import json
import sys


# Configuration of the firebase database
def firebase_admin_auth():
    try:
        with open('./cfg/config.cfg') as json_data_file:
            data = json.load(json_data_file)
            api_key = data['firebase']['api_key']
            auth_domain = data['firebase']['auth_domain']
            database_url = data['firebase']['database_url']
            storage_bucket = data['firebase']['storage_bucket']
            service_account = data['firebase']['service_account']
            # print('use configuration for psql as provided by config.json')
    except:
        # Default Configuration
        print('could not get firebase informtaion from config file')
        sys.exit()

    # adapt this to your firebase setting
    config = {
        "apiKey": api_key,
        "authDomain": auth_domain,
        "databaseURL": database_url,
        "storageBucket": storage_bucket,
        # this is important if you want to login as admin
        "serviceAccount": service_account
    }
    firebase = pyrebase.initialize_app(config)
    return firebase


class mysqlDB(object):
    _db_connection = None
    _db_cur = None

    def __init__(self):
        # try to load configuration from config file
        try:
            with open('./cfg/config.cfg') as json_data_file:
                data = json.load(json_data_file)
                dbname = data['mysql']['database']
                user = data['mysql']['username']
                password = data['mysql']['password']
                host = data['mysql']['host']
                #print('use configuration for mysql as provided by config.json')
        except:
            print('we could not load mysql info the config file')
            sys.exit()

        self._db_connection = pymysql.connect(
            database=dbname,
            user=user,
            password=password,
            host=host)

    def query(self, query, data):
        self._db_cur = self._db_connection.cursor()
        self._db_cur.execute(query, data)
        self._db_connection.commit()
        self._db_cur.close()
        return

    def retr_query(self, query, data):
        self._db_cur = self._db_connection.cursor()
        self._db_cur.execute(query, data)
        content = self._db_cur.fetchall()
        self._db_connection.commit()
        self._db_cur.close()
        return content

    def __del__(self):
        #self._db_cur.close()
        self._db_connection.close()
