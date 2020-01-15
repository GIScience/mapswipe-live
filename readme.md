# MapSwipe Analytics Live

A [tool to display the most recent contributions](http://mapswipe.geog.uni-heidelberg.de/live) of the [MapSwipe App](http://mapswipe.org/).

Created at [HeiGIT](http://www.geog.uni-heidelberg.de/gis/heigit_en.html) for [MapSwipeAnalytics](http://mapswipe.geog.uni-heidelberg.de/).

![screenshot](https://mapswipe.geog.uni-heidelberg.de/img/liveScreen.png")

The purpose of this project is to create a display service for Mapswipe data inspired by [OSM Show me the way](https://osmlab.github.io/show-me-the-way/).
Feel free to use this service for your Mapathon or to get a look at examples of Mapswipe.



## How it works

The most recent contributions are shown over a  Bing imagery background using [Leaflet.js](http://leafletjs.com/). The Live Animation has been created using [Leaflet Time Dimension](https://github.com/socib/Leaflet.TimeDimension). Recent data is read from a file on the server. See below for data acqusition and processing. The number of features in the example data is the number of features shown before loading new results (Currently N = 500). When all feautures have been shown, the input file has been overwritten with new results and is loaded once again.

## How to use the code

You can use this project as a base for your own online display for Maspwipe data or other projects.

Use a [geojson](http://geojson.org/) as input file for the data aswell as a json file for configuration.

    data/live_examples.geojson
The features need to following properties:

| Attribute     | Type          | Description  |
| ------------- |:-------------:| -----:|
| result      | `Integer` | Result coded as Integer |
| project_id      | `String`      |   ID of the mapswipe project |
| user_name      | `String`      |   Mapswipe user name |
| timestamp      | `Integer`      |   Time the result has been uploaded. Unix time |
| result      | `Integer` | Result coded as Integer |
| new_id | `Integer`      |    Unique, continious ID starting from 1. Features will be shown in this order |

Furthermore, the file needs to contain a valid geometry. Use WGS 84 (angular unit!).

	data/lconfig.json

| Attribute     | Type          | Description  |
| ------------- |:-------------:| -----:|
| results      | `Array` | Contains information about the result: Coded result, color and description |
| mapOptions      | `Object`      |   Contains options for display and interactions of the leaflet map |

  Elements of 'results'

| Attribute     | Type          | Description  |
| ------------- |:-------------:| -----:|
| result      | `String` | Result coded as number |
| string      | `String`      |   Description of the result |
| color      | `String`      |   color the result will be shown in. Using RGB |

  Elements of 'mapOptions'

| Attribute     | Type          | Description  |
| ------------- |:-------------:| -----:|
| dataPath      | `String` | Relative path to the data file |
| fullscreenControl      | `Boolean`      |   Enables or disables Leaflet Fullscreen Control |
| autoplay      | `Boolean`      |   Enables or disables automatic play |
| timeSlider      | `Boolean`      |   Enables or disables the Leaflet Time Dimension time slider  |
| speedSlider      | `Boolean`      |   Enables or disables the Leaflet Time Dimension speed slider  |
| defaultControl      | `Boolean`      |   Enables or disables the Leaflet Time Dimension standart control (back, pause, forwards)  |

## How to gather example data

P. e. using [Mapswipe API](https://docs.google.com/document/d/1RwN4BNhgMT5Nj9EWYRBWxIZck5iaawg9i_5FdAAderw/edit#heading=h.wp1a8ue6nwhv)

[Mapswipe Analytics](http://mapswipe.geog.uni-heidelberg.de/download/)

Use [QGis](https://www.qgis.org/de) to work with geojson data.
The [OpenLayers Plugin](https://plugins.qgis.org/plugins/openlayers_plugin/) can help to show the Bing Imagery used in the app.
Add the fields specified above.


## Bugs, issues and contributions

Feedback is always welcome!
For any wishes or notes about bugs please use a [issue](https://gitlab.gistools.geog.uni-heidelberg.de/giscience/mapswipe/MapSwipeTutorial/issues)!
