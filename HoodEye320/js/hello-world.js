// JavaScript Document
// Wait for PhoneGap to load
document.addEventListener("deviceready", onDeviceReady, false);


//-----------------------
var currentintype ;
var currentcommunity ;
var community_list;
var intype_list ;

//var locations = [] ;


// PhoneGap is ready
function onDeviceReady() {

   $(document).delegate('#eventlistpage','pageshow',function(){
       listevents();
   });

  
    mycommunities();
    //listcommunityeventtypes();//--- thing for default com
    //listevents();
  
    getLocation(); 
   

    captureApp = new captureApp();
    captureApp.run();
    
    
    navigator.splashscreen.hide();
  

}






function submitLogin() {
    var username = encodeURIComponent($("#login_username").val());
    var password = encodeURIComponent($("#login_password").val());

    $.get('http://dev.hoodeye.com:4242/api/login?username=' + username + '&password=' + password,function(result) {
    });
   
    return false;
    
}

function submitRegister() {
    var username = encodeURIComponent($("#reg_username").val());
    var password = encodeURIComponent($("#reg_password").val());
    var password_verify = encodeURIComponent($("#reg_password_verify").val());
    $.get('http://dev.hoodeye.com:4242/api/register?username=' + username + '&password=' + password + '&password_verify=' + password_verify,function(result) {
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
    
       listevents();
   
}
  
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

//=======================Geolocation Operations=======================//
// onGeolocationSuccess Geolocation

//adw: global variable for last position, until we know how to do it better
var hoodeye_last_position;


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
             
    var locations  ;
    locations = listevents() ;
 	//locations.push(['1 you are here', lat,long,1] );     // works
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



function assigncommunity (key) {
           currentcommunity = community_list[key] ;
    $("#eventcommunity").val(currentcommunity._id);
    listcommunityeventtypes();
    
}

function assignintype (key) {
           currentintype = intype_list[key] ;
      $("#eventintype").val(currentintype.label) ;
    
}

function mycommunities() {
   $.get('http://dev.hoodeye.com:4242/api/community', function(data) {
       // default to first community listed for now
       currentcommunity = data[0];


      community_list = data;
      assigncommunity(0);
        
      var items = [];
      var options;
      $.each(data, function(key, community) { 
       
          options += '<li><a onClick="assigncommunity('+key+')" href="#home"> <img src="images/redbullhorn.jpg" /> <h3> '+community.name+'</h3><p> '+'com-'+community._id+'</p></a></li>';
  
          
      });
     
     $("#mycommunities").html(options);
       
    });
}



function listcommunityeventtypes() {
   
      
       intype_list = currentcommunity.intypes;
       
      var items = [];
      var options;
     
       $.each(currentcommunity.intypes, function(key, intype) { 
 
          options += '<li><a onClick="assignintype('+key+')" href="#reportpage"> <img style="width: 50px; height: 50px;" src="images/redface.jpg" /> <h3> '+intype.label+'</h3><p> '+'--thing of community---'+'</p></a></li>';
      
      });
   
     $("#communityeventlist").html(options);

    
}



function listevents() {
   var event_locations = [];
   var params = 'community_id=' + currentcommunity._id;
   $("#eventlisttitle").html("inf " + currentcommunity.name);
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




      

 function submitEvent() {
       
  
     
     $("#eventcommunity").val(currentcommunity._id) ;
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

 


