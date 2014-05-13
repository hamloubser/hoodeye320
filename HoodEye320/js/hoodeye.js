// JavaScript Document
// Wait for PhoneGap to load
document.addEventListener("deviceready", onDeviceReady, false);


//-----------------------
var currentintype ;
var current_community = { name: "unset"};
var community_list;
var intype_list ;
var captureApp;
var anonymous_user = { username: "Guest" };
var current_user = { username: "NoUser" };

var locations = [] ;
var public_community_id = "52f5ec9daef933ee6997218a";
var default_community_id = "52f5ec9daef933ee6997218a";
var newtitle;


//adw: global variable for last position, until we know how to do it better
var hoodeye_last_position;
var manmarker_position = 0;

var common_markup = {};

function showstatus(msg) {
    $("#popupStatus").html("<p>"+msg+"</p>");
    // open with timeout because of browser issues, apparently
    setTimeout(function(){
              $("#popupStatus").popup("open");
       // navigator.notification.beep(1);
        navigator.notification.vibrate(2);
            }, 100);
    setTimeout(function(){
              $("#popupStatus").popup("close");
            }, 2000);
}

function showviewmenu(viewmenu) {
    $("#selectview").html(viewmenu);
    // open with timeout because of browser issues, apparently
    setTimeout(function(){
              $("#selectview").popup("open");
       // navigator.notification.beep(1);
      //  navigator.notification.vibrate(2);
            }, 100);
    setTimeout(function(){
              $("#selectview").popup("close");
            }, 5000);
}


function debugmsg(msg) {
    var encmsg = encodeURIComponent(msg);
    return $.get('http://dev.hoodeye.com:4242/api/debugmsg?msg='+encmsg,function(result) {
        return result;
    });
}

// PhoneGap is ready
function onDeviceReady() {
    
    //common_markup.header =  $('#nav_template :jqmData(role="header")').clone();
    //common_markup.footer =  $('#nav_template :jqmData(role="footer")').clone();
    common_markup.header =  $('#header_template').html();
    common_markup.footer =  $('#footer_template').html();

    

    captureApp = new captureApp();
    captureApp.run();
    
    
    $(document).delegate('#loginpage','pageshow',function(){
        debugmsg("Showing #loginpage");
      if (localStorage.login_username) {
        $("#login_username").val(localStorage.login_username);
        $("#login_password").val(localStorage.login_password);
      }
    });
   
    $(document).delegate('#selectcommunitypage','pagebeforeshow',function(){
       debugmsg("Showing #selectcommunitypage");
       mycommunities();
    }); 
    
    $(document).delegate('#joincommunitypage','pagebeforeshow',function(){
        debugmsg("Showing #joincommunitypage");
        updateAvailableCommunities();
    });
    
    $(document).delegate('#communityeventpage','pagebeforeshow',function(){
        debugmsg("Showing  #communityeventpage");
    });
    
    $(document).delegate('#eventlistpage','pageshow',function(){
        // listevents();
        debugmsg("pageshow on #eventlistpage");       

        getLocation();
       
        listeventLocations() ;
        
    });

    $(document).delegate('#eventcontentpage','pageshow',function(){
        getLocation();
        listeventscontent();
        
        //navigator.splashscreen.hide();
    });    
     $(document).delegate('#simplealert', 'click', function() {
         alert("dont touch me on my button!");
         
     });

  
    // Now do some initialization things
    $("#popupStatus").popup();
    set_html_to_layout("#viewmenu","viewmenu","popup");
    set_html_to_layout("#communityeventpopup","communityeventpopup","popup");  
    set_html_to_layout("#welcometext","msgAnton","msg");
    
    
    $(':jqmData(role="page")').prepend(common_markup.header).append(common_markup.footer).page().trigger('pagecreate');
   
    
    // Get my user detail and default community and assign it
    try_auto_login();  
   
    //populate initiallist
    listcommunityeventtypes();
    $("#communityeventlist").html(options).listview('refresh');
    
    // And refresh the home page height

    $.mobile.resetActivePageHeight();
}


function whoami() {
    $.get('http://dev.hoodeye.com:4242/api/whoami',function(user_info) {
        var isnewuser = current_user.username == user_info.username;
        debugmsg("whoami isnewuser: "+isnewuser);
        
        current_user = user_info;
        if (current_community.name == 'unset' || isnewuser) {
          assigncommunity_byid(current_user.default_community_id || public_community_id);
        }
    });
}

function set_html_to_layout(html_id,layout_name,layout_type) {
    $.get('http://dev.hoodeye.com:4242/api/layout?name='+layout_name+'&type='+layout_type,function(html) {
       $(html_id).html(html);
       // $(html_id).html(html).listview('refresh');
    });
}


function updateHomeTitle() {
    // Update app header.
    var newtitle;
    var nick;
    if(typeof variable_here === 'undefined') {
        nick = current_user.default_nickname;
    } else {	
        nick = current_community.nickname;
    }
    newtitle = current_user.username + " in " + current_community.name + " as " + nick;
    debugmsg("Setting title to "+newtitle);
    $(".appheader").text(newtitle);
}

function try_auto_login() {
    if (localStorage.login_password) {
      $.get('http://dev.hoodeye.com:4242/api/login?username=' + localStorage.login_username + '&password=' + localStorage.login_password,function(result) {
        // Show message only if login worked  
        if (result.status === 1) {
          showstatus(result.message);
        }
        // Always do a whoami after a login attempt;
        whoami();
      });
    } else {
        // No login attempt, but use whoami to init Guest user
        whoami();
    }
}

function submitLogin() {
    var username = encodeURIComponent($("#login_username").val());
    var password = encodeURIComponent($("#login_password").val());

    $.get('http://dev.hoodeye.com:4242/api/login?username=' + username + '&password=' + password,function(result) {
        if (result.status === 1) {
          showstatus(result.message);
          localStorage.login_username=username;
          localStorage.login_password=password;
        } else {
          alert(result.message);
        }
        // A failed login attempt could log us out from current user, so always check who I am
        whoami();
    });
}

function submitRegister() {
    var username = encodeURIComponent($("#reg_username").val());
    var password = encodeURIComponent($("#reg_password").val());
    var password_verify = encodeURIComponent($("#reg_password_verify").val());
    $.get('http://dev.hoodeye.com:4242/api/register?username=' + username + '&password=' + password + '&password_verify=' + password_verify,function(result) {
        if (result.status === 1) {
          localStorage.login_username = $("#reg_username").val();
          localStorage.login_password = $("#reg_password").val();
        }
        alert(result.message);
        whoami();
    });
}

function submitLogout() {
    $.get('http://dev.hoodeye.com:4242/api/logout',function(result) {
      status(result.message);
      current_community = { name: "unset"};
      whoami();
    });
}
  
function submitJoincommunity() {
    var submitdata = {
        community: $("#join_community").val(),
        nickname:  $("#join_nickname").val(),
    };
    debugmsg(submitdata);
    $.post('http://dev.hoodeye.com:4242/api/membership',submitdata,function(result) {
        // Should show success/fail feedback
        whoami();
        $.mobile.changePage("#selectcommunitypage");
    });
    return false;
}
    

function getLocation(on_success) {
    navigator.geolocation.getCurrentPosition(function(position){
        hoodeye_last_position = position;
        //debugmsg("Got location:");       
        //debugmsg(hoodeye_last_position);       
        on_success();
    },onGeolocationError);
}
  
function onGeolocationSuccess(position) {
    hoodeye_last_position = position;
}

function onGeolocationError(error) {
    debugmsg("getLocation gave an error");
    $("#myLocation").html("<span class='err'>" + error.message + "</span>");
}


function onGeolocationSuccess_old(position) {

    $("#panic_event_latitude").val(hoodeye_last_position.coords.latitude);
    $("#panic_event_longitude").val(hoodeye_last_position.coords.longitude);
      
 
    
    // Use Google API to get the location data for the current coordinates
    var geocoder = new google.maps.Geocoder();
    var latlngtmp = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
    geocoder.geocode({ "latLng": latlngtmp }, function (results, status) {
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
        //                       var lat = hoodeye_last_position.coords.latitude;
        //                       var long = hoodeye_last_position.coords.longitude;
    //
    //              $('#map_canvas').gmap().bind('init', function(ev, map) {
        //              $('#map_canvas').gmap('addMarker', {'position': ''+lat+','+long+'', 'bounds': true}).click(function() {
        //              $('#map_canvas').gmap('openInfoWindow', {'content': 'Hello World!'}, this);
        //                              });
        //                      });
   
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

      //adw: jshint says: Don't make functions within a loop.
      //this may lead to issues?
      google.maps.event.addListener(marker, 'click', (function(marker, i) {
        return function() {
          infowindow.setContent(locations[i][0]);
          infowindow.open(map, marker);
        };
      })(marker, i));
     }
}







//=======================Get Community from hoodeye=======================//
//adw: this isn't being called from anywhere, can we remove it?
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

function assigncommunity_byid(community_id) {
    var newhood_list = $.grep(current_user.communities, function(hood){ return hood._id == community_id; });
    newhood = newhood_list[0];
    
    if (newhood) {
     //debugmsg("assigncommunity_byid found "+newhood.name);
     assigncommunity(newhood);
    } else {
        //TODO: this could be more elegant
        //debugmsg("assigncommunity_byid found none, using "+current_user.communities[0].name);
        assigncommunity(current_user.communities[0]);
    }
}

function assigncommunity(community) {
    current_community = community;
    debugmsg("assigncommunity setting current_community to "+current_community.name);
    // Update submitted community id for reportig events
    $("#eventcommunity").val(current_community._id);
    updateHomeTitle();
    //debugmsg("Going for listcommunityeventtypes");
    //listcommunityeventtypes();
     listcommunityeventtypes();
     $("#communityeventlist").html(options).listview('refresh');
}

function assignintype (key) {
    currentintype = intype_list[key] ;
    debugmsg("Assigning intype to "+currentintype.name);
    var content = $("#reportpage div:jqmData(role=content)");
    $.get('input-types/'+currentintype.name+'.html',
        function(html) { 
          content.html(html); 
          debugmsg("loaded input-types/"+currentintype.name+".html");
         })
        .fail(function() { 
           $.get('input-types/default.html', function(def_html){ 
                content.html(def_html); 
                debugmsg("loaded default input the for "+currentintype.name);
           });
        });
}

function mycommunities() {
      community_list = current_user.communities;
        
      var options = '';
      $.each(community_list, function(key, community) { 
          //debugmsg("Adding to communitylist:" + community.name);
          options += '<li ><a onClick="assigncommunity_from_list('+key+
              ')" href="#home" data-split-theme="b" > <h3> '+
              community.name+'</h3>(as '+getNickname4Community(community.name)+')</a></li>';
      });
       if (current_user.username == 'Guest') {
         options += '<li ><a href="#loginpage" data-split-theme="c" > <h3>Log in to join communities</h3></a></li>';           
       }  else {
         options += '<li ><a href="#joincommunitypage" data-split-theme="c" > <h3>Join more communities</h3></a></li>';
       }
     $("#mycommunities").html(options).listview('refresh');
}

function getNickname4Community(community_name) {
    var nick = current_user.default_nickname;
    $.each(current_user.memberships,function(idx,membership) {
        if (membership.community_name == community_name) {
          nick = membership.nickname;
          return false;
        }
    });
    return nick;
}
    
function updateAvailableCommunities() {
    var options = '';
    $.get('http://dev.hoodeye.com:4242/api/hood/available', function(community_names) {
        $("#join_nickname").val(current_user.default_nickname);
        //debugmsg(community_names);
        $.each(community_names,function(key,community_name) {
          options += '<option value='+community_name+'> '+community_name+'</option>';
          //debugmsg('<option value='+community_name+'> '+community_name+'</option>');
        });
        $("#join_community").html(options).selectmenu('refresh');
    });
}



function listcommunityeventtypes() {
   
      
       intype_list = current_community.intypes;
       
      var items = [];
      var options;
     
       $.each(current_community.intypes, function(key, intype) { 
           debugmsg("Adding intype: "+intype.label);
 
          options += '<li><a onClick="assignintype('+key+')" href="#reportpage" data-split-theme="c" > <h3> '+intype.label+'</h3></a></li>';
      
      });
   
     $("#communityeventlist").html(options).listview('refresh');

    
}



function listeventscontent() {
 
   var params = 'community_id=' + current_community._id;
  $("#eventcontentlisttitle").html(current_community.name);
     $("#eventtypelisttitle").html(current_community.name);
   return $.get('http://dev.hoodeye.com:4242/api/event?'+params,function(data) {
      
       var items_html ;
      
      var count = 0;
      $.each(data, function(key, event) { 
         items_html += '<li ><a href="#"> '+event.intype+' </a> '+event.user.username+'<span class="ui-li-count"> 2</span></li> <li> </br ><p><b> '+event.detail+'</b></p> <p class="ui-li-aside"> - '+event.create_time+'</p> </li> ';
        
          
          count += 1;
      });
           if (count === 0) {
              items_html = "<li>No Events found.</li>";
            
          }
       
     
       
     $("#eventcontentlist").html(items_html).listview('refresh');
   

       
   });
    
}

 

//------------------try to get cool map with locations   


function listeventLocations() {
    var lat = hoodeye_last_position.coords.latitude;
    var long = hoodeye_last_position.coords.longitude;
    var event_locations = [];
   var params = 'community_id=' + current_community._id;
   $("#eventlisttitle").html(current_community.name);
   debugmsg("In listeventLocations");
   $.get('http://dev.hoodeye.com:4242/api/event?'+params,function(data) {
       debugmsg("Got Events:" + data.length);

      var items_html;
      var latlngalert;       
      var count = 0;
      var event;
       var i;
       if (data.length > 0) {
                  debugmsg("Hallo1");

         for (i = 0; i < data.length; i++) {  
           event = data[i]; 
             event_locations.push([ " <B>"+event.intype  + "</B><br/>  <img src='images/here.png'  alt='image in infowindow'>   "+ event.detail + "<br/> @ "+event.create_time, event.lat , event.long , i]) ;
         }
       } else {
                  debugmsg("Hallo0");
         event_locations.push(['Nothing Near', lat,long,1] );
       }
 // var googleApis_map_Url = 'http://maps.googleapis.com/maps/api/staticmap?center='+lat+','+long+'&size=300x200&maptype=street&zoom=11&sensor=true&markers=size:mid%7Ccolor:red%7C' +  latlngalert ;
 //  var mapImg = '<src="' + googleApis_map_Url + '" />';
 //   $("#map_canvas_events").html(mapImg);       
       debugmsg("Number of events: "+event_locations.length);
//  return event_locations;
       var latlng = new google.maps.LatLng (lat, long);
          var options = { 
            zoom : 15, 
            center : latlng, 
            mapTypeId : google.maps.MapTypeId.ROADMAP 
          };
        var $content = $("#eventlistpage div:jqmData(role=content)");
        $content.height (screen.height - 50);
        var map = new google.maps.Map ($content[0], options);
        $.mobile.changePage ($("#eventlistpage"));
      var infowindow = new google.maps.InfoWindow();

       
       //----- Trying to add a moveable marker to upgate location
      var manmarker ;
  
 
       manmarker = new google.maps.Marker({
        position: new google.maps.LatLng(lat, long),
        animation : google.maps.Animation.DROP,  
           draggable: true,
          icon: 'images/imgman.png', 
        map: map
           });
       // try to get the position of the manmarker
        google.maps.event.addListener(manmarker, 'dragend',  function() {
     //      var pos = manmarker.getPosition();
         manmarker_position = manmarker.getPosition();
         
            $("#eventlisttitle").html("Alert at Man" );
            
            
        });
       
    //----- ---------------------------------------------------  
       var marker;
       for (i = 0; i < event_locations.length; i++) {  
      marker = new google.maps.Marker({
        position: new google.maps.LatLng(event_locations[i][1], event_locations[i][2]),
        animation : google.maps.Animation.DROP,  
         //  draggable: true,
        //   icon: 'images/here.png', 
        map: map
      });
      
      //adw: jshint says: Don't make functions within a loop.
      //this may lead to issues?
      google.maps.event.addListener(marker, 'click', (function(marker, i) {
        return function() {
          infowindow.setContent(event_locations[i][0]);
          infowindow.open(map, marker);
        };
      })(marker, i));
     }
   });
}

function submitEvent() {
       
     getLocation(function() {
  
       
       $("#event_latitude").val(hoodeye_last_position.coords.latitude);
       $("#event_longitude").val(hoodeye_last_position.coords.longitude);
          // if the manmarker is moved use its location.     
         if ( manmarker_position !== 0  ) {
                   $("#event_latitude").val(manmarkeer_position.lat().toString());
                   $("#event_longitude").val(manmarker_position.lng().toString());
                         }
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
     });
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


