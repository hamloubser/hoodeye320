// JavaScript Document
// Wait for PhoneGap to load
document.addEventListener("deviceready", onDeviceReady, false);


//-----------------------
var currentintype ;
var current_community = { name: "No Community"}
var community_list;
var intype_list ;
var captureApp;
var anonymous_user = { username: "Anonymous" };
var current_user = anonymous_user;

var locations = [] ;
var default_community_id = "51c8ad43caa81c7d28000002";
var newtitle;

//adw: global variable for last position, until we know how to do it better
var hoodeye_last_position;

function debugmsg(msg) {
    var encmsg = encodeURIComponent(msg);
    return $.get('http://dev.hoodeye.com:4242/api/debugmsg?msg='+encmsg,function(result) {
        return result;
    });
}

// PhoneGap is ready
function onDeviceReady() {
    
   captureApp = new captureApp();
   captureApp.run();

    // Get my user detail and default community and assign it
    $.get('http://dev.hoodeye.com:4242/api/whoami',function(user_info) {
      current_user = user_info;
      $.get('http://dev.hoodeye.com:4242/api/community/'+default_community_id,function(community) {
          assigncommunity(community);
      });
    });
    
    $(document).delegate('#selectcommunity','pageshow',function(){
       mycommunities();
   });
    $(document).delegate('#communityeventpage','pageshow',function(){
       mycommunities();
   });
    
   $(document).delegate('#eventlistpage','pageshow',function(){
      // listevents();
       listeventLocations() ;
   });

   $(document).delegate('#pagemap','pageshow',function(){
       getLocation();
       navigator.splashscreen.hide();
   });    
}

function updateHomeTitle() {
    // Update app header.
    newtitle = "Hoodeye: " + current_user.username + " in " + current_community.name;
    debugmsg("Setting title to "+newtitle);
    $("#appheader").html(newtitle);
}

function submitLogin() {
    var username = encodeURIComponent($("#login_username").val());
    var password = encodeURIComponent($("#login_password").val());

    return $.get('http://dev.hoodeye.com:4242/api/login?username=' + username + '&password=' + password,function(result) {
        if (result.status == 1) {
          current_user = result.user;
          updateHomeTitle();  
          return true;
        } else {
          return false;
        }
    });
}

function submitRegister() {
    var username = encodeURIComponent($("#reg_username").val());
    var password = encodeURIComponent($("#reg_password").val());
    var password_verify = encodeURIComponent($("#reg_password_verify").val());
    $.get('http://dev.hoodeye.com:4242/api/register?username=' + username + '&password=' + password + '&password_verify=' + password_verify,function(result) {
        if (result.status == 0) {
            $("#registerstatus").val("")
        } else {
          current_user = result.user;
            
            
        }
    });
   
    return false;
    
}

function submitLogout() {
    $.get('http://dev.hoodeye.com:4242/api/logout',function(result) {
    });
   
    return false;
    
}
  

function getLocation() {
    navigator.geolocation.getCurrentPosition(onGeolocationSuccess, onGeolocationError);
    listeventLocations() ;
  //   listevents();
   
}
  

//=======================Geolocation Operations=======================//
// onGeolocationSuccess Geolocation



function onGeolocationSuccess(position) {
    hoodeye_last_position = position;
    
    $("#event_latitude").val(hoodeye_last_position.coords.latitude);
    $("#event_longitude").val(hoodeye_last_position.coords.longitude);
    $("#panic_event_latitude").val(hoodeye_last_position.coords.latitude);
    $("#panic_event_longitude").val(hoodeye_last_position.coords.longitude);
      
 
    
    // Use Google API to get the location data for the current coordinates
    var geocoder = new google.maps.Geocoder();
    var latlng = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
    geocoder.geocode({ "latLng": latlng }, function (results, status) {
        if (status == google.maps.GeocoderStatus.OK) {
            if ((results.length > 1) && results[1]) {
                $("#myLocation").html(results[1].formatted_address);
                $("#myLocation1").html(results[1].formatted_address);
            }
        }
    });
    
   // Use Google API to get a map of the current location
    // http://maps.googleapis.com/maps/api/staticmap?size=280x300&maptype=hybrid&zoom=16&markers=size:mid%7Ccolor:red%7C42.375022,-71.273729&sensor=true
    //var googleApis_map_Url = 'http://maps.googleapis.com/maps/api/staticmap?size=300x200&maptype=street&zoom=13&sensor=true&markers=size:mid%7Ccolor:red%7C' + latlng + latlngalert ;
 	//      		 var lat = hoodeye_last_position.coords.latitude;
  	//			 var long = hoodeye_last_position.coords.longitude;
    //
    //   	    $('#map_canvas').gmap().bind('init', function(ev, map) {
	//		$('#map_canvas').gmap('addMarker', {'position': ''+lat+','+long+'', 'bounds': true}).click(function() {
	//		$('#map_canvas').gmap('openInfoWindow', {'content': 'Hello World!'}, this);
	//				});
	//			});
   
  //  -----------good  
   // var latlngalert = "|-26.11305892469931,27.984621|-26.113058924691,27.984620891537|-26.1130589249,27.984620892"
 //   var latlngalert = ""
 //   var googleApis_map_Url = 'http://maps.googleapis.com/maps/api/staticmap?size=300x200&maptype=street&zoom=13&sensor=true&markers=size:mid%7Ccolor:red%7C' + latlng + latlngalert ;
 //   var mapImg = '<img src="' + googleApis_map_Url + '" />';
 //   $("#map_canvas").html(mapImg);
    
    
    //------------hear follows a cool map
    
	var lat = hoodeye_last_position.coords.latitude;
    var long = hoodeye_last_position.coords.longitude;
             
  //  var locations  ;
  //  locations = listevents() ;
 	locations.push(['1 you are here', lat,long,1] );     // works
   // locations.push(['ilze', -26.113057,27.984621 , 2])   ;  // need to loop this.
 
          var latlng = new google.maps.LatLng (lat, long);
          var options = { 
            zoom : 15, 
            center : latlng, 
            mapTypeId : google.maps.MapTypeId.ROADMAP 
          };
          var $content = $("#pagemap div:jqmData(role=content)");
          $content.height (screen.height - 50);
          var map = new google.maps.Map ($content[0], options);
          $.mobile.changePage ($("#pagemap"));
          
			
    var infowindow = new google.maps.InfoWindow();

    var marker, i;

    for (i = 0; i < locations.length; i++) {  
      marker = new google.maps.Marker({
        position: new google.maps.LatLng(locations[i][1], locations[i][2]),
        animation : google.maps.Animation.DROP,  
        map: map
      });

      google.maps.event.addListener(marker, 'click', (function(marker, i) {
        return function() {
          infowindow.setContent(locations[i][0]);
          infowindow.open(map, marker);
        }
      })(marker, i));
     }

    
}



//google.maps.event.addDomListener(window, 'load', initialize);

//        <img width="288" height="200" id="mapmarker" 
//        src="https://maps.googleapis.com/maps/api/staticmap?center=-26.11305892469931,27.9846208915375&amp;
//            zoom=11&amp;size=288x200&amp;
 //           markers=-26.11305892469931,27.984621|-26.113058924691,27.9846208915375&amp;
 //           sensor=false">

// onGeolocationError Callback receives a PositionError object
function onGeolocationError(error) {
    $("#myLocation").html("<span class='err'>" + error.message + "</span>");
}




//=======================Get Community from hoodeye=======================//

function listCommunities() {
    var mydevice =  device.uuid;
    var lat = hoodeye_last_position.coords.latitude;
    var long = hoodeye_last_position.coords.longitude;
    

    $.get('http://dev.hoodeye.com:4242/api/community?device='+mydevice+'&lat='+lat+'&long='+long, function(data) {
        
      var items = [];
      var options;
      $.each(data, function(key, community) { 
         items.push(community.name);
          options += '<option value="'+community._id+'">'+community.name+'</option>';
     });
     $("#community_index").html(items.join('<br/>'));
     $("#event_community").html(options);

    });
}



function assigncommunity_from_list (key) {
    assigncommunity(community_list[key]);
}


function assigncommunity(community) {
    current_community = community;
    // Update submitted community id for reportig events
    $("#eventcommunity").val(current_community._id);
    updateHomeTitle();
    listcommunityeventtypes();
}


function assignintype (key) {
           currentintype = intype_list[key] ;
      $("#eventintype").val(currentintype.label) ;
    
}

function mycommunities() {
   $.get('http://dev.hoodeye.com:4242/api/community', function(data) {
       // default to first community listed for now
      community_list = data;
        
      var items = [];
      var options;
      $.each(data, function(key, community) { 
         options += '<li><a onClick="assigncommunity_from_list('+key+')" href="#home"> <img src="images/redbullhorn.jpg" /> <h3> '+community.name+'</h3><p> '+'com-'+community._id+'</p></a></li>';
      });
     
     $("#mycommunities").html(options);
       
    });
}



function listcommunityeventtypes() {
   
      
       intype_list = current_community.intypes;
       
      var items = [];
      var options;
     
       $.each(current_community.intypes, function(key, intype) { 
 
          options += '<li><a onClick="assignintype('+key+')" href="#reportpage"> <img style="width: 50px; height: 50px;" src="images/redface.jpg" /> <h3> '+intype.label+'</h3><p> '+'--thing of community---'+'</p></a></li>';
      
      });
   
     $("#communityeventlist").html(options);

    
}



function listevents() {
   var event_locations = [];
   var params = 'community_id=' + current_community._id;
   $("#eventlisttitle").html("inf " + current_community.name);
   return $.get('http://dev.hoodeye.com:4242/api/event?'+params,function(data) {
      var items_html;
       var latlngalert;
    
       
      var count = 0;
      $.each(data, function(key, event) { 
         items_html += '<li><img src="images/imgviewalerts.png" style="width: 20px; height: 20px;" /> '+event.intype+''+event.detail+'<br>|'+event.lat+','+event.long+'|</br></li>';
     	
          latlngalert += '|'+event.lat+','+event.long ;
          
          
         	// and event locations to loacation variable		  //--bad == bad	/--bad == bad/--bad == bad/--bad == bad		
           event_locations.push([ 'event'+$count, event.lat , event.long , $count]) ;
          
          count += 1;
      });
       	   if (count == 0) {
              items_html = "<li>No Events found.</li>";
            
               ;
          }
     $("#eventlist").html(items_html);
   
   // var latlngalert = "|-26.11305892469931,27.984621|-26.113058924691,27.984620891537|-26.1130589249,27.984620892"
    
    var lat = hoodeye_last_position.coords.latitude;
    var long = hoodeye_last_position.coords.longitude;
       
       
   var googleApis_map_Url = 'http://maps.googleapis.com/maps/api/staticmap?center='+lat+','+long+'&size=300x200&maptype=street&zoom=11&sensor=true&markers=size:mid%7Ccolor:red%7C' +  latlngalert ;
   var mapImg = '<img src="' + googleApis_map_Url + '" />';
    $("#map_canvas_events").html(mapImg);       
    
   return event_locations;
       
   });
    
}

 

//------------------try to get cool map with locations   


function listeventLocations() {
  
    var lat = hoodeye_last_position.coords.latitude;
    var long = hoodeye_last_position.coords.longitude;
    var event_locations = [];
   var params = 'community_id=' + current_community._id;
   $("#eventlisttitle").html(current_community.name);
   $.get('http://dev.hoodeye.com:4242/api/event?'+params,function(data) {
      var items_html;
       var latlngalert;
    
       
      var count = 0;
      $.each(data, function(key, event) { 
        
          event_locations.push([ 'event'+$count, event.lat , event.long , $count]) ;
          
          count += 1;
      });
       	   if (count == 0) {
             event_locations.push(['Nothing Near', lat,long,1] );
              }
 // var googleApis_map_Url = 'http://maps.googleapis.com/maps/api/staticmap?center='+lat+','+long+'&size=300x200&maptype=street&zoom=11&sensor=true&markers=size:mid%7Ccolor:red%7C' +  latlngalert ;
 //  var mapImg = '<img src="' + googleApis_map_Url + '" />';
 //   $("#map_canvas_events").html(mapImg);       
    
//  return event_locations;
       var latlng = new google.maps.LatLng (lat, long);
          var options = { 
            zoom : 15, 
            center : latlng, 
            mapTypeId : google.maps.MapTypeId.ROADMAP 
          };
          var $content = $("#map_canvas_events div:jqmData(role=content)");
          $content.height (screen.height - 50);
          var map = new google.maps.Map ($content[0], options);
          $.mobile.changePage ($("#eventlistpage"));
          
			
    var infowindow = new google.maps.InfoWindow();

    var marker, i;

    for (i = 0; i < event_locations.length; i++) {  
      marker = new google.maps.Marker({
        position: new google.maps.LatLng(event_locations[i][1], event_locations[i][2]),
        animation : google.maps.Animation.DROP,  
        map: map
      });

      google.maps.event.addListener(marker, 'click', (function(marker, i) {
        return function() {
          infowindow.setContent(event_locations[i][0]);
          infowindow.open(map, marker);
        }
      })(marker, i));
     }
       
       
       
       
   });
    
}

      

 function submitEvent() {
       
  
     
     $("#eventcommunity").val(current_community._id) ;
     $("#eventintype").val(currentintype.label) ;
     $("#eventdevicedetails").val("devicename : " + device.name + " deviceId: " + device.uuid + " deviceOs: " + device.platform + " deviceosversion : " + device.version) ;
   
     // add timestamp 
     var currentTime = new Date();
     $("#create_time").val(currentTime.toISOString());
     
     
     
     
     $.ajax({type:'POST', url: 'http://dev.hoodeye.com:4242/api/event', data:$('#EventForm').serialize(), success: function(response)
                            {
                            $('#result').html(response);
                            }});
                    return false;

 }







//------------------------ capture stuff

 
//=======================Say Hello (Page 1) Operations=======================//
function sayHello() {
    var sayHelloInputElem = document.getElementById('helloWorldInput');
    var sayHelloTextElem = document.getElementById('helloWorldText');
    var inputText = document.getElementById('txtName');
    
    sayHelloTextElem.innerHTML = 'Hello you bad ass, ' + inputText.value + '!';
    sayHelloTextElem.style.display = 'block';
    sayHelloInputElem.style.display = 'none';
}

function sayHelloReset() {
    var sayHelloInputElem = document.getElementById('helloWorldInput');
    var sayHelloTextElem = document.getElementById('helloWorldText');
    var inputText = document.getElementById('txtName');
    
    inputText.value = '';
    sayHelloTextElem.style.display = 'none';
    sayHelloInputElem.style.display = 'block';
}


