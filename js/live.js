function init() {
  try {
    show_map();
  }
  catch (err) {
    console.log('Could not load map');
  }
  finally {

    graph();
  }
}


function show_map() {




 L.TimeDimension.Layer.Result = L.TimeDimension.Layer.GeoJson.extend({
   /*extracts the time information from a geojson file
   unit: ms
   feature = feature with time property
   new_id is unique number to display exactly one feature at a timeDiff
   */
   _getFeatureTimes: function(feature) {
       if (!feature.properties) {
         console.log("Fatal: no properties");
           return [];
       }
       if (feature.properties.hasOwnProperty('new_id')) {
           return [feature.properties.new_id * 2000]; //unique id
       }
       if (feature.properties.hasOwnProperty('time')) {
         return [feature.properties.time]; // in ms
       }
       return [];
   },
 });

L.timeDimension.layer.Result = function(layer, options) {
   return new L.TimeDimension.Layer.Result(layer, options);
};

/*read config json*/

config = (function () {
  config = null;
 $.ajax({
   'async': false,
   'global': true,
   'url': 'data/lConfig.json',
   'dataType': "json",
   'success': function (data) {
       config = data;
     }
   });
   return config;
 })();

/* initiales the leaglet map */
map = L.map('leaflet_map', {
   fullscreenControl: config.mapOptions.fullscreenControl,
   timeDimensionControl: true,
   doubleClickZoom: false,
   timeDimensionControlOptions: {
     displayDate : false,
     position: "bottomleft", //problem: doesnt move the info box! has to be moved with css
     autoPlay: config.mapOptions.autoPlay,
     timeSlider: config.mapOptions.timeSlider,
     speedSlider: config.mapOptions.speedSlider,
     backwardButton: config.mapOptions.defaultControl,
     forwardButton: config.mapOptions.defaultControl,
     playButton: config.mapOptions.defaultControl,
     playerOptions: {
         transitionTime: config.mapOptions.transitionTime,
         loop: false,
         startOver: false,
         buffer: 100
     },
   },
   timeDimensionOptions: {
     period: 'PT2S'
   },
   timeDimension: true,
   center: [0, 0],
   zoom: 3,

});

map.attributionControl.setPosition('topright');
//bing layer
createBaseLayer();

loadData();

//liveAnimation();
 map.timeDimension.setCurrentTime(0);

 map.timeDimensionControl._player.start();
}


function loadData() {
  var path = config.mapOptions.dataPath;
  $.getJSON(path, function(data) {
    animate(data);
  });
}

function animate(data) {
  resultLayer = L.geoJson(data, {
      style: function(feature) {
          var color = "#000"; //default value to avoid undefined color
          for (var i = 0; i < config.results.length; i++) {
            if(config.results[i].result == feature.properties.result){
              color = config.results[i].color;
              break;
            }
          }
          return {
              "color": color,
              "weight": 3,
              "opacity": 1,
              "fill": false,
          };
      }
  });

  resultTimeLayer = L.timeDimension.layer.Result(resultLayer, {
      updateTimeDimension: true,
      updateTimeDimensionMode: 'replace',
      addlastPoint: false,
      duration: 'PT1S',
  });
  resultTimeLayer.addTo(map);
  map.timeDimensionControl._player.start();
  //Adjust map and fill info for first feature
  map.fitBounds(resultTimeLayer.getBounds());
  var prop = resultTimeLayer._currentLayer._layers[resultTimeLayer._currentLayer._leaflet_id-1].feature.properties;
  document.getElementById("t_project").innerHTML = "Project: " + "<a href=http://mapswipe.geog.uni-heidelberg.de/?id=" + prop.project_id + " target=_blank>" + prop.project_id + "</a>";
  document.getElementById("t_user").innerHTML = "User: " + prop.user_name;
  document.getElementById("t_result").innerHTML = "Result: " + getRes(prop.result);
  document.getElementById("t_time").innerHTML = "Submitted " + timeDiff(Date.now(), prop.timestamp) + " ago";

  /*
  gets called everytime a new feature is selected.
  Adjusts map and fills info
  */
  map.timeDimension.on('timeload', function(data) {
  var date = new Date(map.timeDimension.getCurrentTime());
  if (data.time == map.timeDimension.getCurrentTime()) {
      var totalTimes = map.timeDimension.getAvailableTimes().length;
      var position = map.timeDimension.getAvailableTimes().indexOf(data.time);
      $(map.getContainer()).find('.animation-progress-bar').width((position*100)/totalTimes + "%");
      // update map bounding box
      map.fitBounds(resultTimeLayer.getBounds());
      var prop = resultTimeLayer._currentLayer._layers[resultTimeLayer._currentLayer._leaflet_id-1].feature.properties;
      document.getElementById("t_project").innerHTML = "Project: " + "<a href=http://mapswipe.geog.uni-heidelberg.de/?id=" + prop.project_id + " target=_blank>" + prop.project_id + "</a>";
      document.getElementById("t_user").innerHTML = "User: " + prop.user_name;
      document.getElementById("t_result").innerHTML = "Result: " + getRes(prop.result);
      document.getElementById("t_time").innerHTML = "Submitted " + timeDiff(Date.now(), prop.timestamp) + " ago";
  }

});
map.timeDimensionControl._player.on('animationfinished', function() {
console.log("Animation finished");
// map.removeLayer(resultTimeLayer);
// map.timeDimensionControl._player.stop()
// console.log("Removing layer...");
//delete resultTimeLayer;
//delete resultLayer;
//loadData(data);
refreshMap();

});
}


function refreshMap() {
  map.remove()

  try {
    show_map();
  } catch (e) {
    console.log('Something went wrong when reloading data');
  }
}

//adds a bing layer and the attribution to the map
function createBaseLayer() {
  var bing_key = 'AopsdXjtTu-IwNoCTiZBtgRJ1g7yPkzAi65nXplc-eLJwZHYlAIf2yuSY_Kjg3Wn'
  bing = L.tileLayer.bing(bing_key);
  map.addLayer(bing);
}


// converts a unix time stamp to ...
function convUnix(t) {
  var date = new Date(parseInt(t) * 1000);
  return date;
}


function graph() {
  id_list = []
  var stats = (function () {
   stats = null;

  $.ajax({
    'async': false,
    'global': false,
    'url': 'http://api.mapswipe.org/projects.json',
    'dataType': "json",
    'success': function (data) {
        stats = data;
      }
    });
    return stats;
  })();
  for(var id in stats) {
    if( stats[id].state == 0) {
      id_list.push(id);
    }
  }


  //plot all active Projects
  userData = []
  progressData = []
  var pres = new Date();
  var pres = Date.parse(pres);
  var past = pres - (60 * 60 * 24 * 2 * 1000);
   // console.log(past);
   console.log(past);
  var timeRange = [String(convUnix(past/1000)), String(convUnix(pres/1000))];
  //var past = pres  - (60 * 60 * 24 * 2 * 1000);
  //var timeRange = ['2018-03-11 15:00:00', '2018-03-13 15:00:00'];
  console.log(timeRange);
  userlayout = {
    title: 'Contributors',
    yaxis: {
      title: 'Number of Contributors',
      // range: [0, 500]
    },
    xaxis: {
      range: timeRange,
      type: 'date'
    },
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    autosize: false,
    width: 400,
    height: 500,
  };
  progressLayout = {
    title: 'Progress',
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    autosize: false,
    width: 400,
    height: 500,
    xaxis: {
      // range: ['2018-03-08 22:23:00', '2018-03-12 22:23:00'],
      type: 'date'
    },
    yaxis: {
      title: 'Progress',
      // range: [0, 1]
    }
  };


  for (var i = 0; i < id_list.length; i++) {
    id = String(id_list[i]);
    //Users
    plot(id);
  }
  // if(id_list = []) {
  //   console.log("Could not find data to plot");
  //   document.getElementById('plot').style.display = 'none';
  // }


}

function parseTime(date) {
  return String(date.getFullYear()) + "-" + String(date.getMonth()) +
   "-" + String(date.getDate()) + " " + String(date.getHours()) + ":"
   + String(date.getMinutes());
  // var timeRange = ['2018-03-11 15:00:00', '2018-03-13 15:00:00'];

}


function plot(id) {
  Papa.parse('http://api.mapswipe.org/contributors/contributors_' + String(id) + '.txt', {
    download: true,
    complete: function(results) {
      // console.log(results);
      var x = [];
      var y = [];

      for (var i = 0; i < results.data.length-1; i++) {
        x.push(convUnix(results.data[i][0]));
        y.push(parseInt(results.data[i][1]));
      }
      trace = {
        x: x,
        y: y,
        type: 'scatter',
        name: id,
      }
      userData.push(trace);
      console.log(userData);
      Plotly.newPlot(userPlot, userData, userlayout);

    }
  });


  //Progress

  Papa.parse('http://api.mapswipe.org/progress/progress_' + String(id) + '.txt', {
    download: true,
    complete: function(results) {
      var x = [];
      var y = [];
      for (var i = 0; i < results.data.length-1; i++) {
        x.push(convUnix(results.data[i][0]));
        y.push(parseFloat(results.data[i][1]));
      }
      trace = {
        x: x,
        y: y,
        type: 'scatter',
        name: id
      }
      progressData.push(trace);
      Plotly.newPlot(progressPlot, progressData, progressLayout);

    }
  });
}


/*
returns the difference between two unix times as a string
t1, t2 = unix time
*/
function timeDiff(t1, t2) {
  var difference = Math.abs(t1-t2);
  var daysDifference = Math.floor(difference/1000/60/60/24);
  difference -= daysDifference*1000*60*60*24;

  var hoursDifference = Math.floor(difference/1000/60/60);
  difference -= hoursDifference*1000*60*60

  var minutesDifference = Math.floor(difference/1000/60);
  difference -= minutesDifference*1000*60

 //  var secondsDifference = Math.floor(difference/1000);
 if(daysDifference > 0) {
   return daysDifference + ' d ' + hoursDifference + ' h ' + minutesDifference + ' min ';
 } else {
   if(hoursDifference > 0) {
     return hoursDifference + ' h ' + minutesDifference + ' min ';

   } else {
     return minutesDifference + ' min ';
   }
 }
}



/*
result = result codes as string numbers
returns a meaningful string
*/
function getRes(result) {
  switch (result) {
    case 0:
     return "No Building";
    case 1:
     return "Yes";
    case 2:
     return "Maybe";
    default:
    return "Bad Imagery";

  }
}

function showContactView() {
  document.getElementById('ContactBtn').style.display = 'none';
  document.getElementById('MapViewBtn').style.display = 'inline';
  document.getElementById('contact').style.display = 'block';
  document.getElementById('leaflet_map').style.display = 'none';

  // stop the animation
  map.timeDimensionControl._player.pause();


}


function showMapView() {
  document.getElementById('ContactBtn').style.display = 'inline';
  document.getElementById('MapViewBtn').style.display = 'none';
  document.getElementById('contact').style.display = 'none';
  document.getElementById('leaflet_map').style.display = 'block';
  map.invalidateSize()

  // continue the animation
  map.timeDimensionControl._player.release();

}

function showDetails() {
  // make central div visible, write json info of feture
}


function openTab(evt, name) {
  var i, tabcontent, tablinks;
  tabcontent = document.getElementsByClassName("tabcontent"); //hide all tabs
  for (i = 0; i < tabcontent.length; i++) {
      tabcontent[i].style.display = "none";
  }
  tablinks = document.getElementsByClassName("tablinks");
  for (i = 0; i < tablinks.length; i++) {
      tablinks[i].className = tablinks[i].className.replace(" active", ""); //adjust style for all headers
      // console.log(tablinks[i].className);
      // console.log(i);
  }
  document.getElementById(name).style.display = "block"; //display targeted tab
  evt.currentTarget.className = "tablinks active"; //adjust style of targeted header
}

// (function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
// (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
// m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
// })(window,document,'script','https://www.google-analytics.com/analytics.js','ga');
//
// ga('create', 'UA-97247301-1', 'auto');
// ga('send', 'pageview');
