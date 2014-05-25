// JavaScript Document
//
//
// On phone, wait for PhoneGap to load, in browser, use document.ready()
var isphone = true;
if (navigator.userAgent.match(/(iPhone|iPod|iPad|Android|BlackBerry|IEMobile)/)) {
  document.addEventListener("deviceready", onDeviceReady, false);
} else {
  $(document).ready(onDeviceReady);
  isphone = false;
  var device = {
     name: 'Browser',
     uuid: 'AAAAAAAAAAAAAAAAA',
     platform: 'Browser',
     version: '0.0',
  };
}
// Cute way to acess query string parameters as qs["some_param"]
var qs = (function(a) {
    if (a == "") return {};
    var b = {};
    for (var i = 0; i < a.length; ++i)
    {
        var p=a[i].split('=');
        if (p.length != 2) continue;
        b[p[0]] = decodeURIComponent(p[1].replace(/\+/g, " "));
    }
    return b;
})(window.location.search.substr(1).split('&'));

//-----------------------
var server_address = "http://dev.hoodeye.com:4242";
if (qs['mode'] == 'dev') {
  server_address = "http://dev.hoodeye.com:4343";
}
var current = {};
current.community = { name: "unset"};
current.user = { username: "NoUser" };
var community_list;
var captureApp;
var anonymous_user = { username: "Guest", default_nickname: "Guest" };

var locations = [] ;
var public_community_id = "52f5ec9daef933ee6997218a";
var default_community_id = "52f5ec9daef933ee6997218a";


//adw: global variable for last position, until we know how to do it better
var hoodeye_last_position;
var manmarker_position = 0;
var ismapsetup = false;

function showstatus(msg) {
    $("#statuspopup").html("<p>"+msg+"</p>");
    // open with timeout because of browser issues, apparently
    setTimeout(function(){
        $("#statuspopup").popup("open");
        // navigator.notification.beep(1);
        if (isphone) { navigator.notification.vibrate(2) };
    }, 100);
    setTimeout(function(){
        $("#statuspopup").popup("close");
    }, 3000);
}

function debugmsg() {
    var data = {
      msg: "",
    };
    $.each(arguments, function(idx,thisarg) {
      if (typeof thisarg === 'object') {
        data.msg += JSON.stringify(thisarg);
      } else {
        data.msg += thisarg;
      }
      data.msg += ' ';
    });
    $.post(server_address+'/api/debugmsg',data);
}

// PhoneGap is ready
function onDeviceReady() {

    // use credentials on all ajax calls, required for in-browser, may not be required for Cordova
    $(document).ajaxSend(function (event, xhr, settings) {
      settings.xhrFields = {
          withCredentials: true
      };
    });
    
    // TODO: This has to be integrated into loading the addevent forms
    //captureApp = new captureApp();
    //captureApp.run();
    
    getLocation(setup_viewportMap);
    $(document).delegate('#loginpage','pageshow',function(){
        if (localStorage.login_username) {
            $("#login_username").val(localStorage.login_username);
            $("#login_password").val(localStorage.login_password);
        }
    });
    
    $(document).delegate('#joincommunitypage','pagebeforeshow',function(){
        updateAvailableCommunities();
    });

    $(document).delegate('#communityprofilepage','pagebeforeshow',function(){
        updatecommunityprofilepage();
    });



    $(document).delegate('#addeventformpage','pagebeforeshow',function(){
        getLocation();
    });
 
    
    $(document).delegate('#viewportMappage','pageshow',function(){
        debugmsg("pageshow on #viewportMappage");       
        refresh_viewportMap();
        /* if (ismapsetup) { 
          refresh_viewportMap();
        } else {
          getLocation(setup_viewportMap);
        } */
    });

    $(document).delegate('#viewportListpage','pageshow',function(){
        debugmsg("pageshow on #viewportListpage");       
        refresh_viewportList() ;
    });
    
    // page form submit bindings
    
    $('#EventForm').bind("submit",function(event) { event.preventDefault(); return submitEvent(); });
    $('#loginForm').bind("submit",function(event) { event.preventDefault(); submitLogin(); });
    $('#logoutForm').bind("submit",function(event) { event.preventDefault(); submitLogout(); });
    $('#registerForm').bind("submit",function(event) { event.preventDefault(); return submitRegister(); });
    $('#joincommunityForm').bind("submit",function(event) { event.preventDefault(); return submitJoincommunity(); });
    $('#leavecommunityForm').bind("submit",function(event) { event.preventDefault(); return submitLeavecommunity(); });
    
    // Now do some initialization things
    $(':jqmData(role="popup")').popup();
    $(':jqmData(role="listview")').listview();
    set_html_to_layout("#welcometext","msgAnton","msg");
    // This should happen as part of switching community
    // for now back in index.html
    //set_html_to_layout("#viewmenupopup","viewmenu","popup");

    // Apply common navigation markup to pages
    var common_markup = {};
    common_markup.header =  $('#header_template').html();
    common_markup.footer =  $('#footer_template').html();
    
    $(':jqmData(role="page")').prepend(common_markup.header).append(common_markup.footer);
    $(':jqmData(role="page")').page().enhanceWithin();
    
    // Get my user detail and default community and assign it
    whoami();
    if (current.user.username == 'Guest') {
      try_auto_login();  
    }
}


function whoami() {
    $.get(server_address+'/api/whoami',function(user_info) {
        var isnewuser = current.user.username != user_info.username;
        debugmsg("whoami isnewuser: "+isnewuser+" username is "+user_info.username);
        
        current.user = user_info;
        
        if (current.community.name == 'unset' || isnewuser) {
            
            assigncommunity_byid(current.user.default_community_id || public_community_id);
        }
        updateHomeTitle();
        fix_user_menu();
        mycommunities();
    });
}

function fix_user_menu() {
        // If logged in, change the usermenu options
        if (current.user.username != "Guest") {
            $("#usermenuoptions").html('<li><a href="#userprofilepage" data-theme="c">Private Profile</a></li>'+
                '<li><a href="#logoutpage" data-theme="c">Logout</a></li>');
            debugmsg("Setting usermenu to profile/logout");
        } else {
            $("#usermenuoptions").html('<li><a href="#registerpage" data-theme="c">Register</a></li>'+
                '<li><a href="#loginpage" data-theme="c">Login</a></li>');
            debugmsg("Setting usermenu to login/register");
        }
        $("#usermenupopup").popup();
}

function set_html_to_layout(html_id,layout_name,layout_type) {
    $.get(server_address+'/api/layout?name='+layout_name+'&type='+layout_type,function(html) {
        $(html_id).html(html);
        // $(html_id).html(html).listview('refresh');
    });
}


function updateHomeTitle() {
    // Update app header.
    var newtitle;
    var nick;
    if(typeof current.community.nickname === 'undefined') {
        nick = current.user.default_nickname;
    } else {  
        nick = current.community.nickname;
    }
    newtitle = current.user.username + " in " + current.community.name + " as " + nick;
    debugmsg("Setting title to "+newtitle);
    $('.appheader').html(newtitle);
}

function try_auto_login() {
    if (localStorage.login_password) {

      var submitdata = {
        username: localStorage.login_username,
        password: localStorage.login_password,
      };

      $.post(server_address+'/api/login',submitdata,function(result) {
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
    var submitdata = {
      username: encodeURIComponent($("#login_username").val()),
      password: encodeURIComponent($("#login_password").val()),
    };

    var username = encodeURIComponent($("#login_username").val());
    var password = encodeURIComponent($("#login_password").val());
    
    //$.get('/api/login?username=' + username + '&password=' + password,function(result) {
    $.post(server_address+'/api/login',submitdata,function(result) {
        if (result.status === 1) {
            showstatus(result.message);
            localStorage.login_username=username;
            localStorage.login_password=password;
            whoami();
        } else {
            alert(result.message);
            // A failed login attempt could log us out from current user, so always check who I am
            whoami();
        }
    });
}

function submitRegister() {
    var submitdata = {
      username: encodeURIComponent($("#reg_username").val()),
      password: encodeURIComponent($("#reg_password").val()),
      password_verify: encodeURIComponent($("#reg_password_verify").val()),
    }
    $.post(server_address+'/api/register',submitdata,function(result) {
        if (result.status === 1) {
            showstatus(result.message);
            localStorage.login_username = submitdata.sername;
            localStorage.login_password = submitdata.password;
            whoami();
        } else {
          whoami();
          showstatus(result.message);
        }
    });
}

function submitLogout() {
    //debugmsg(event);
    $.post(server_address+'/api/logout',function(result) {
        showstatus(result.message);
        current.community = { name: "unset"};
        whoami();
        $.mobile.pageContainer.pagecontainer("change", "#loginpage", {transition: "flow"});
    });
}

function submitJoincommunity() {
    var submitdata = {
        community: $("#join_community").val(),
        nickname:  $("#join_nickname").val(),
    };
    debugmsg(submitdata);
    $.post(server_address+'/api/membership',submitdata,function(result) {
        if (result.status == 0) {
          showstatus("Attempt to join " + submitdata.community + " failed: " + result.error);
        } else {
          showstatus("Successfully joined " + submitdata.community + " as " + submitdata.nickname);
          whoami();
          assigncommunity_byid(result.community_id);
        }
    });
}

function submitLeavecommunity() {
    var membership_list = $.grep(current.user.memberships, function(membership){ return membership.community_id == current.community._id; });
    membership = membership_list[0];
    
    if (membership) {
      $.ajax({
        url: server_address+'/api/membership/'+membership._id, 
        type: 'DELETE',
        success: function(result) {
          showstatus("Membership removed for " + current.community.name);
          whoami();
          assigncommunity_byid(public_community_id);
          $.mobile.pageContainer.pagecontainer("change", "#home", {transition: "flow"});
        },
      });
    } else {
        showstatus("Can not leave public community " + current.community.name);
        $.mobile.pageContainer.pagecontainer("change", "#home", {transition: "flow"});
    };
}

function submitEvent() {
    
        $("#event_latitude").val(hoodeye_last_position.coords.latitude);
        $("#event_longitude").val(hoodeye_last_position.coords.longitude);
        // if the manmarker is moved use its location.     
        if ( manmarker_position !== 0  ) {
            $("#event_latitude").val(manmarker_position.lat().toString());
            $("#event_longitude").val(manmarker_position.lng().toString());
        }
        $("#eventcommunity").val(current.community._id) ;
        $("#eventintype").val(current.intype.label) ;
        $("#eventdevicedetails").val("devicename : " + device.name + " deviceId: " + device.uuid + " deviceOs: " + device.platform + " deviceosversion : " + device.version) ;
        
        // add timestamp 
        var currentTime = new Date();
        $("#create_time").val(currentTime.toISOString());
        showstatus("Saving event to server...");
        $.ajax({type:'POST', url: server_address+'/api/event', data:$('#EventForm').serialize(), success: function(response)
                {
                    showstatus(response);
                }});
}



function getLocation(on_success) {
    navigator.geolocation.getCurrentPosition(function(position){
        hoodeye_last_position = position;
        debugmsg("Got location:",hoodeye_last_position);
        if (on_success && typeof(on_success) == "function") {
          on_success();
        }
    },onGeolocationError);
}


function onGeolocationError(error) {
    showstatus("Could not get the current location");
    //hoodeye_last_position = TODO;
}


function assigncommunity_byid(community_id) {
    var newhood_list = $.grep(current.user.communities, function(hood){ return hood._id == community_id; });
    newhood = newhood_list[0];
    
    if (newhood) {
        //debugmsg("assigncommunity_byid found "+newhood.name);
        assigncommunity(newhood);
    } else {
        //TODO: this could be more elegant
        //debugmsg("assigncommunity_byid found none, using "+current.user.communities[0].name);
        assigncommunity(current.user.communities[0]);
    }
}

function assigncommunity(community) {
    current.community = community;
    debugmsg("assigncommunity setting current.community to "+current.community.name);
    // Update submitted community id for reportig events
    $("#eventcommunity").val(current.community._id);
    updateHomeTitle();
    //debugmsg("Going for make_selecteventlist");
    make_selecteventlist();
    //$("#selecteventlist").html(options).listview('refresh');
    //TODO: make this a setting from the community
    //$.mobile.pageContainer.pagecontainer("change", "#viewportListpage", {transition: "flow"});
}

function load_addeventform (key) {
    current.intype = current.community.intypes[key] ;
    debugmsg("Loading addevent form for"+current.intype.name);
    var content = $("#addeventformpage div:jqmData(role=content)");
    var filename = current.intype.name.replace(" ","_");
    $.get('input-types/'+filename+'.html',
          function(html) { 
              $("#addeventformcontent").html(html); 
              debugmsg("loaded input-types/"+filename+".html");
              $("#addeventformpage").enhanceWithin();
              $('#EventForm').bind("submit",function(event) { event.preventDefault(); return submitEvent(); });
          })
    .fail(function() { 
        $.get('input-types/default.html', function(def_html){ 
            $("#addeventformcontent").html(def_html); 
            debugmsg("loaded default input the for "+current.intype.name);
            $("#addeventformpage").enhanceWithin();
            $('#EventForm').bind("submit",function(event) { event.preventDefault(); return submitEvent(); });
        });
    });
}

function mycommunities() {
    community_list = current.user.communities;
    
    var options = '';
    options += '<li data-role="list-divider">Switch active community</li>';           
    $.each(community_list, function(key, community) { 
        //debugmsg("Adding to communitylist:" + community.name);
        //options += '<li ><a onClick="assigncommunity_from_list('+key+
        //    ')" href="#home" data-split-theme="b" > '+
        //    community.name+' (as '+getNickname4Community(community.name)+')</a></li>';
        options += '<li ><a onClick="assigncommunity_byid(\''+community._id+
            '\')" href="#home" data-split-theme="b" > '+
            community.name+' (as '+getNickname4Community(community.name)+')</a></li>';
    });
    options += '<li data-role="list-divider">Actions</li>';           
    if (current.user.username == 'Guest') {
        options += '<li ><a href="#loginpage" data-split-theme="c" > <h3>Log in to join communities</h3></a></li>';
    }  else {
        options += '<li ><a href="#joincommunitypage" data-split-theme="c" > <h3>Join more communities</h3></a></li>';
    }
    $("#switchcommunitylist").html(options);
    $("#switchcommunitylist").listview();
    $("#switchcommunitylist").listview('refresh');
}

function getNickname4Community(community_name) {
    var nick = current.user.default_nickname;
    $.each(current.user.memberships,function(idx,membership) {
        if (membership.community_name == community_name) {
            nick = membership.nickname;
            return false;
        }
    });
    return nick;
}

function updateAvailableCommunities() {
    var options = '';
    $.get(server_address+'/api/hood/available', function(community_names) {
        $("#join_nickname").val(current.user.default_nickname);
        //debugmsg(community_names);
        $.each(community_names,function(key,community_name) {
            options += '<option value="'+community_name+'"> '+community_name+'</option>';
            //debugmsg('<option value='+community_name+'> '+community_name+'</option>');
        });
        $("#join_community").html(options).selectmenu('refresh');
    });
}

function updatecommunityprofilepage() {
  var c = '';
  c += '<h3>Community: ' + current.community.name + '</h3>';
  c += 'Known as: ' + getNickname4Community(current.community.name) + '<br/>';
  c += '<h4>Actions:</h4>';
  c += '<a href="#leavecommunity">Leave community</a><br/>';
   
  $("#communityprofilecontent").html(c);
}


function make_selecteventlist() {
    
    var items = [];
    var options = '';
    debugmsg("Intypes:", current.community.intypes);
    
    $.each(current.community.intypes, function(key, intype) { 
        debugmsg("Adding intype: "+intype.label+" with key"+key);
        
        options += '<li><a onClick="load_addeventform('+key+')" href="#addeventformpage" data-split-theme="c" > '+intype.label+'</a></li>';
        
    });
    
    //$("#selecteventlist").html(options);
    //$("#selecteventlist").listview('refresh');
    $("#selecteventpopuplist").html(options);
    $("#selecteventpopuplist").listview();
    $("#selecteventpopuplist").listview('refresh');
}



function refresh_viewportList() {
    var params = 'community_id=' + current.community._id;
    $.get(server_address+'/api/event?'+params,function(data) {
        
        var items_html = "";
        var markup = {
          header: '<h3>' + current.community.name + ': Recent events</h3>' + 
                   '<ul data-role="listview" data-inset="true" >',
          footer: '</ul>',
        }
        
        var count = 0;
        $.each(data, function(key, event) { 
            items_html += '<li >'+event.intype+': '
                            + event.detail + "( reported by "
                            + event.user.username + " at "
                            + event.create_time+')</li> ';
            count += 1;
        });
        if (count === 0) {
            items_html = "<li>No Events found.</li>";
        }
        $("#viewportListcontent").html(markup.header+items_html+markup.footer);
        $("#viewportListcontent").listview();
        $("#viewportListcontent").listview('refresh');
    });
}



//------------------try to get cool map with locations   

var viewportMap;
function setup_viewportMap() {
    var latlng = new google.maps.LatLng (hoodeye_last_position.coords.latitude, hoodeye_last_position.coords.longitude);
        var options = {
            zoom : 15,
            center : latlng,
            mapTypeId : google.maps.MapTypeId.ROADMAP
        };
        var content = $("#viewportMapcontent");
        viewportMap = new google.maps.Map(content[0], options);
}
 

function refresh_viewportMap() {
    // Resize the map as things have changed since init
    var content = $("#viewportMapcontent");
    content.height(screen.height - 30);
    google.maps.event.trigger(viewportMap, 'resize');

    var lat = hoodeye_last_position.coords.latitude;
    var long = hoodeye_last_position.coords.longitude;
    var event_locations = [];
    var params = 'community_id=' + current.community._id;
    $("#eventlisttitle").html(current.community.name);
    debugmsg("In listeventLocations");
    $.get(server_address+'/api/event?'+params,function(data) {
        debugmsg("Got Events:" + data.length);
        
        var items_html;
        var latlngalert;       
        var count = 0;
        var event;
        var i;
        if (data.length > 0) {
            for (i = 0; i < data.length; i++) {  
                event = data[i]; 
                event_locations.push([ "<B>"+event.intype  + "</B><br/>  <img src='images/here.png'  alt='image in infowindow'>   "+ event.detail + "<br/> <i>@ "+event.create_time+"</i>", event.lat , event.long, i]) ;
            }
        } else {
            event_locations.push(['Nothing Near', lat,long,1] );
        }
        debugmsg("Number of events: "+event_locations.length);
        //  return event_locations;
        var infowindow = new google.maps.InfoWindow();
        
        
        //----- Trying to add a moveable marker to upgate location
        var manmarker ;
        
        manmarker = new google.maps.Marker({
            position: new google.maps.LatLng(lat, long),
            animation : google.maps.Animation.DROP,  
            draggable: true,
            icon: 'images/imgman.png', 
            map: viewportMap
        });
        // try to get the position of the manmarker
        google.maps.event.addListener(manmarker, 'dragend',  function() {
            //      var pos = manmarker.getPosition();
            manmarker_position = manmarker.getPosition();
        });
        
        //----- ---------------------------------------------------  
        var marker;
        for (i = 0; i < event_locations.length; i++) {  
            marker = new google.maps.Marker({
                position: new google.maps.LatLng(event_locations[i][1], event_locations[i][2]),
                animation : google.maps.Animation.DROP,  
                //  draggable: true,
                //   icon: 'images/here.png', 
                map: viewportMap
            });
            
            //adw: jshint says: Don't make functions within a loop.
            //this may lead to issues?
            google.maps.event.addListener(marker, 'click', (function(marker, i) {
                return function() {
                    infowindow.setContent(event_locations[i][0]);
                    infowindow.open(viewportMap, marker);
                };
            })(marker, i));
        }
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



