// JavaScript Document
//

// load libraries required
$.getScript('jslibs/jquery.formparams.js');
$.getScript('jslibs/jsrender/jsrender.min.js');

// example scripts used
$.getScript('scripts/capture-app.js');

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
//-----------------------
var qs = get_url_params();
var server_port = qs.port || 4242;
var server_address = "http://dev.hoodeye.com:" + server_port;

var current_clean = {
    active_community: { name: "unset"},
    user: { username: "NoUser" },
    intype: '',
    communities_to_join: [],
    memberships: {},
    communities: {},
    community_data: {},
    allevents: {},
    event_localinfo: {},
    // TODO: this should prob be new Position or similar...
    position: {},
};
var current = current_clean;
var captureApp;

// Load the public community from localstorage if available
// This is current definition, use that if no network connection
var public_community = {
    _id: "52f5ec9daef933ee6997218a",
    name: "Public Community"
};

var viewportMap;
var infowindow = new google.maps.InfoWindow();
// The next builds an object that allows us to queue callbacks once the map is ready
var mapcheck = new OnceReady();




// PhoneGap is ready
function onDeviceReady() {
    getLocation(init_viewportMap);
    // use credentials on all ajax calls, required for in-browser, may not be required for Cordova
    $(document).ajaxSend(function (event, xhr, settings) {
        settings.xhrFields = {
            withCredentials: true
        };
    });
    
    // Get the latest public community setting
    //// Get latest version from localStorage if set
    if (localStorage.public_community) {
        public_community = localStorage.public_community;
    }
    
    $.get(server_address+'/api/public-community',function(community) {
        // Save the new info as public community and default community
        public_community = community;
        localStorage.public_community = community;
    });
    
    // TODO: This has to be integrated into loading the addevent forms
    //captureApp = new captureApp();
    //captureApp.run();
    //xxx
    
    // Delegations for showing pages
    $(document).delegate('#loginpage','pageshow',function(){
        if (localStorage.login_username) {
            $("#login_username").val(localStorage.login_username);
            $("#login_password").val(localStorage.login_password);
        }
    });
    
    $(document).delegate('#joincommunitypage','pagebeforeshow',function(){
        // Update the list of available communities to join
        update_communities_to_join();
        // Set my default nickname on the join form
        $("#join_nickname").val(current.user.default_nickname);
    });
    
    $(document).delegate('#communityprofilepage','pagebeforeshow',function(){
        updatecommunityprofilepage();
    });
    
    
    
    $(document).delegate('#addeventformpage','pagebeforeshow',function(){
        getLocation();
    });
    
    $(document).delegate('#editeventformpage','pagebeforeshow',function(){
        editeventformpage();
    });
    
    $(document).delegate('#viewportMappage','pageshow',function(){
        debugmsg("pageshow on #viewportMappage");       
        // If we reload on this page, things have to wait till the map is ready, which takes a while
        mapcheck.onready(function() {
          // Resize map so screen things work, needs work!!
          var content = $("#viewportMapcontent");
          content.height(screen.height - 30);
          google.maps.event.trigger(viewportMap, 'resize');
          // By then the active community wlll be loaded 
          viewport_map.showevents(current.community_data[current.active_community._id].all);
          // then check for new events and show them once loaded
          refresh_eventstreams(function () { 
            viewport_map.showevents;
          });
        });
    });
    
    $(document).delegate('#viewportListpage','pageshow',function(){
        debugmsg("pageshow on #viewportListpage");       
        // Immediately show any loaded events
        viewport_list.showevents(current.community_data[current.active_community._id].all);
        // then check for new events and show them once loaded
        refresh_eventstreams(viewport_list.showevents);
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
    
    // Apply common navigation markup to pages
    var common_markup = {};
    common_markup.header =  $('#header_template').html();
    common_markup.footer =  $('#footer_template').html();
    
    $(':jqmData(role="page")').prepend(common_markup.header).append(common_markup.footer);
    $(':jqmData(role="page")').page().enhanceWithin();
    
    // Get my user detail and default community and assign it
    load_session_user(false);
    if (current.user.username == 'Guest') {
        // this will always load memberships
        try_auto_login();  
    } else {
        load_memberships(current.user.default_community_id || public_community._id);
    }
}

function load_session_user(require_memberships) {
    $.get(server_address+'/api/whoami',function(session_user) {
        var isnewuser = current.user.username != session_user.username;
        debugmsg("load_session_user isnewuser: "+isnewuser);
        debugmsg("session username: "+session_user.username," current loaded username:"+current.user.username);
        if (isnewuser) {
            current = current_clean;
            current.user = session_user;
            fix_user_menu();
            // load membershiups and then switch community
            if(require_memberships) {
                load_memberships(current.user.default_community_id || public_community._id);
            }
        }
    });
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
            // check the session user and load memberships
            load_session_user(true);
        });
    } else {
        // No login attempt, just load the memberships
        load_memberships(current.user.default_community_id || public_community._id);
    }
}




function load_memberships(new_community_id) {
    $.get(server_address+'/api/membership',function(memberships) {
        current.memberships = memberships;
        fix_community_switch_menu();
        switchcommunity(current.user.default_community_id || public_community._id);
    });
}

function fix_user_menu() {
    // If logged in, change the usermenu options
    if (current.user.username != "Guest") {
        $("#usermenuoptions").html('<li><a href="#userprofilepage" data-theme="c">Private Profile</a></li>'+
                                   '<li><a href="#logoutpage" data-theme="c">Logout</a></li>');
        $("#usermenuoptions").listview();
        $("#usermenuoptions").listview('refresh');
        debugmsg("Setting usermenu to profile/logout");
    } else {
        $("#usermenuoptions").html('<li><a href="#registerpage" data-theme="c">Register</a></li>'+
                                   '<li><a href="#loginpage" data-theme="c">Login</a></li>');
        $("#usermenuoptions").listview();
        $("#usermenuoptions").listview('refresh');		
        debugmsg("Setting usermenu to login/register");
    }
    $("#usermenupopup").popup();
}

function set_html_to_layout(html_id,layout_name,layout_type) {
    $.get(server_address+'/api/layout?name='+layout_name+'&type='+layout_type,function(html) {
        $(html_id).html(html);
    });
}


function updateHomeTitle() {
    // Update app header.
    var newtitle = current.user.username + " in " + current.active_community.name + " as " + getNickname4Community();
    debugmsg("Setting title to "+newtitle);
    $('.appheader').html(newtitle);
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
            load_session_user(true);
            $.mobile.pageContainer.pagecontainer("change", "#home", {transition: "flow"});
        } else {
            alert(result.message);
            // A failed login attempt could log us out from current user, so always check who I am
            load_session_user(true);
        }
    });
}

function submitRegister() {
    var submitdata = {
        username: encodeURIComponent($("#reg_username").val()),
        password: encodeURIComponent($("#reg_password").val()),
        password_verify: encodeURIComponent($("#reg_password_verify").val()),
    };
    $.post(server_address+'/api/register',submitdata,function(result) {
        if (result.status === 1) {
            showstatus(result.message);
            localStorage.login_username = submitdata.sername;
            localStorage.login_password = submitdata.password;
            load_session_user(true);
            $.mobile.pageContainer.pagecontainer("change", "#home", {transition: "flow"});
        } else {
            load_session_user(true);
            showstatus(result.message);
        }
    });
}

function submitLogout() {
    //debugmsg(event);
    $.post(server_address+'/api/logout',function(result) {
        showstatus(result.message);
        current.active_community = { name: "unset"};
        load_session_user(true);
        $.mobile.pageContainer.pagecontainer("change", "#loginpage", {transition: "flow"});
    });
}

function submitJoincommunity() {
    var community_id = $("#join_community").val();
    var submitdata = {
        community_id: community_id,
        community_name: current.communities_to_join[community_id].name,
        nickname:  $("#join_nickname").val(),
    };
    debugmsg('submitJoincommunity:',submitdata);
    $.post(server_address+'/api/membership',submitdata,function(result) {
        if (result.status === 0) {
            showstatus("Attempt to join " + submitdata.community_name + " failed: " + result.error);
        } else {
            showstatus("Successfully joined " + submitdata.community_name + " as " + submitdata.nickname);
            load_memberships();
            switchcommunity(community_id);
        }
    });
}

function submitLeavecommunity() {
    //var membership_list = $.grep(current.memberships, function(membership){ return membership.community_id == current.active_community._id; });
    //membership = membership_list[0];
    var membership = current.memberships[current.active_community._id];
    var community_id = current.active_community._id;
    
    $.ajax({
        url: server_address+'/api/membership/'+membership._id, 
        type: 'DELETE',
        success: function(result) {
            showstatus("Membership removed for " + current.active_community.name);
            delete current.memberships[community_id];
            delete current.communities[community_id];
            debugmsg("Memberships now:",current.memberships);
            fix_community_switch_menu();
            switchcommunity(public_community._id);
            $.mobile.pageContainer.pagecontainer("change", "#home", {transition: "flow"});
        },
        fail: function(response) {
            showstatus("Failure to remove membership:" + response);
        },
    });
}

function switchcommunity(community_id) {
    if (current.communities[community_id]) {
        // If we had an active community, clean up after it
        if (typeof current.active_community === 'object') {
            viewports_do('clear');
        }
        current.active_community = current.communities[community_id];
        debugmsg("switchcommunity setting current.active_community to "+current.active_community.name);
        // Initialise data object if its not set
        if (typeof current.community_data[community_id] !== 'object') {
            current.community_data[community_id] = {
                all: [],
            };
        }
        // Set title
        updateHomeTitle();
        // Change add event menu
        make_selecteventlist();
        //TODO:
        //change viewport menu
        viewports_do('setup');
        //refresh event data for community
        refresh_eventstreams();
        //switch on map markers for current community
        //switch viewport to default for the community (or membership to this community)
        //Clear eventadd form
        //
        //For now, keep this here, should move to event submission
        $("#eventcommunity").val(current.active_community._id);
    } else {
        //First load the community data, then try again
        debugmsg("Loading community data for "+community_id);
        $.get(server_address+'/api/community/'+community_id,function(cdata) {
            if (cdata.name) {
                debugmsg("Community " + community_id + " " + cdata.name + " has a valid membership, switching");
                current.communities[community_id] = cdata;
                switchcommunity(community_id);
            } else {
                debugmsg("Community " + community_id + " not valid membership");
                // If we don't have an active community, switch to public community
                if (!current.active_community._id) {
                    switchcommunity(public_community._id);
                } 
                // Otherwise, don't switch community
                showstatus("Can't switch community, membership not valid");
            }
        }).fail(function() {
            showstatus("Server not availale, not switching community now"); 
        });
    }
}

function fix_community_switch_menu() {
    var options = '';
    options += '<li data-role="list-divider">Switch active community</li>';           
    $.each(current.memberships, function(community_id, membership) { 
        options += '<li ><a onClick="switchcommunity(\''+community_id+
            '\')" href="#home" data-split-theme="b" > '+
            membership.community_name+' (as '+getNickname4Community(community_id)+')</a></li>';
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

function getNickname4Community(community_id) {
    var cid = community_id || current.active_community._id;
    return current.memberships[cid].nickname || current.user.default_nickname || current.user.username;
}

function update_communities_to_join() {
    var options = '';
    $.get(server_address+'/api/hood/available', function(communities) {
        //debugmsg(communities);
        $.each(communities,function(key,community) {
            options += '<option value="'+community._id+'"> '+community.name+'</option>';
            // save the communities mapping id to name
            current.communities_to_join[community._id] = community;
        });
        $("#join_community").html(options).selectmenu('refresh');
    });
}

function updatecommunityprofilepage() {
    var c = '';
    c += '<h3>Community: ' + current.active_community.name + '</h3>';
    c += 'Known as: ' + getNickname4Community() + '<br/>';
    c += '<h4>Actions:</h4>';
    // Can't leave the Public Community
    if (current.active_community._id != public_community._id) {
        c += '<a href="#leavecommunity">Leave community</a><br/>';
    }
    
    $("#communityprofilecontent").html(c);
}


// End of membership and community management section
//
// Start of Event and display section


function submitEvent() {
    var currentTime = new Date();
    
    //This uses jquery.formparams.js
    var event_data = $('#EventForm').formParams();
    debugmsg('event_data as from form:',event_data);
    
    // Standard event data
    
    event_data.intype = current.intype.name;
    event_data.intype_label = current.intype.label;
    event_data.community_id = current.active_community._id;
    event_data.community_name = current.active_community.name;
    event_data.membership_id = current.memberships[current.active_community._id]._id;
    event_data.user_id_submitted = current.user._id;
    event_data.nickname = getNickname4Community(current.active_community._id);
    event_data.status = "new";
    event_data.create_time = currentTime.toISOString();
    
    // GPS + device info
    event_data.position = current.position;
    event_data.lat = current.position.coords.latitude;
    event_data.long = current.position.coords.longitude;
    //device has some weird characters in that is causing the post to fail, needs encoding or JSON or something
    //event_data.device = device;
    
    // if the manmarker is moved use its location.     
    //if ( current.manmarker !== 0  ) {
    //  event_data.event_latitude = current.manmarker.lat().toString();
    //  event_data.event_longitude = current.manmarker.lng().toString();
    //}

    //showstatus("Saving event to server...");
    //debugmsg("post to event: ",event_data);
    $.post(server_address +'/api/event',event_data,function(response) {
        //debugmsg("post to event succeeded",this);
        //debugmsg("response:",response)
        if (response.status) {
            showstatus("Event saved");
        } else {
            showstatus("Event not saved: "+response.msg);
        }
    }).fail(function() { 
        showstatus("Error saving event: request failed.");
      //debugmsg("post to event failed",this);
    });
    //function(data,textStatus,jqXHR) { 
    //    debugmsg('Save event success:',jqXHR,textStatus,data);
    //    showstatus("Event Saved");
    //});
}



function getLocation(on_success) {
    navigator.geolocation.getCurrentPosition(function(position){
        // this happens on success
        current.position = position;
        console.log(current.position);
        if (on_success && typeof(on_success) == "function") {
            on_success();
        }
    },function(error) {
      showstatus("Could not get the current location");
      debugmsg("getCurrentPosition error: ",error);
      // TODO
      // current.position = ???;
    });
}

function load_addeventform (key) {
    current.intype = current.active_community.intypes[key] ;
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

function editeventformpage() {
    // Get the event _id from where the _id was stored by the click on the edit button, get event from allevents
    // use thisevent as event is ambigious here
    // TODO: this if test not working yet
    console.log('editeventformpage debug');
    console.log(typeof sessionStorage.event_to_edit);
    console.log(typeof current.allevents);
    console.log(typeof current.allevents[sessionStorage.event_to_edit]);
    if (typeof sessionStorage.event_to_edit === 'undefined'  ||
        typeof current.allevents === 'undefined' ||
        typeof current.allevents[sessionStorage.event_to_edit] === 'undefined') {
      debugmsg("editeventformpage: no event to edit, going to #home");
      showstatus("editeventformpage: no event to edit, going to #home");
      $.mobile.pageContainer.pagecontainer("change", "#home", {transition: "flow"});
      return;
    }
    thisevent = current.allevents[sessionStorage.event_to_edit];
    console.log('Creating edit event page for event ' + thisevent._id);
    console.log(thisevent);
    var c = '';
    c += '<h3>Community: ' + thisevent.community_name + '</h3>';
    c += 'Event type: ' + thisevent.intype_label + '<br/>';
    c += '<h4>Detail:</h4>';
    c += thisevent.detail + '<br>';
    c += 'Added by ' + thisevent.nickname + ' at ' + thisevent.create_time + '<br><br>';
    //c += 'Debug: ' + JSON.stringify(thisevent);
    $("#editeventformcontent").html(c);
}


function make_selecteventlist() {
    var items = [];
    var options = '';
    debugmsg("Intypes:", current.active_community.intypes);
    $.each(current.active_community.intypes, function(key, intype) { 
        debugmsg("Adding intype: "+intype.label+" with key"+key);
        
        options += '<li><a onClick="load_addeventform('+key+')" href="#addeventformpage" data-split-theme="d" > '+intype.label+'</a></li>';
        
    });
    
    //$("#selecteventlist").html(options);
    //$("#selecteventlist").listview('refresh');
    $("#selecteventpopuplist").html(options);
    $("#selecteventpopuplist").listview();
    $("#selecteventpopuplist").listview('refresh');
}


// We can make this fancy later, but we don't have to store an icon name for each event
function get_event_icon(event) {
    var basename = event.intype;
    basename = basename.replace(" ","_");
    return "images/"+basename+"_icon.png";
}

// on_new_events will be called if there are new events with the array of new events including their markers
function refresh_eventstreams(on_new_events) {
    var community_id = current.active_community._id;
    //showstatus("Refreshing events for " + current.communities[community_id].name,'debug');
    //debugmsg("Refreshing events for " + current.communities[community_id].name);
    // Now load the new events
    var params = 'community_id=' + community_id;
    if (current.community_data[community_id].all.length === 0) {
        debugmsg("No events found, loading all",'debug');
    } else {
        var last_event_id = current.community_data[community_id].all[0]._id;
        params += '&since=' + last_event_id;
        debugmsg("Last event loaded: " + last_event_id +" loading new events");
        debugmsg('Current events loaded: ' + current.community_data[community_id].all.length);
    }
    
    $.get(server_address+'/api/event?'+params,function(events) {
        debugmsg('New events loaded: ' + events.length);
        // Add map markers for any new events
        current.community_data[community_id].all = events.concat(current.community_data[community_id].all);
        $.each(events,function(index,event) {
            viewports_do('newevent',event);
            // also store all events in a global event object so we can access and edit them from just knowing the _id
            current.allevents[event._id] = event;
        });
        debugmsg('Final events loaded: ' + current.community_data[community_id].all.length);
        if (events.length > 0) {
            showstatus(events.length+ " new events in "+current.active_community.name);
            if (on_new_events && typeof(on_new_events) == "function") {
                on_new_events(events);
            }
        }
    });
}

//------------------try to get cool map with locations   
//
// For now, the default 2 viewports: viewport_map and viewport_list, will make this dynamic later
var viewport_map = {
    name: 'Default map viewport',
    clear: function() {
        if (typeof viewportMap === 'object') {
            viewportMap.clearMarkers();
            viewportMap.latlngbounds = new google.maps.LatLngBounds();
        }
    },
    setup: function() {
        // Map setup is done on system load
    },
    newevent: function(event) {
        event_add_marker(event);
    },
    showevents: function(events) {
        // Switch the map for each of the current markers to viewportMap
        console.log("showevents started");
        $.each(events,function(key,event) {
            var event_marker = current.event_localinfo[event._id].marker;
            var event_mapinfo = current.event_localinfo[event._id].mapinfo;
            //console.log("showing event "+event._id);
            //debugmsg("showing event "+event._id);
            event_marker.setMap(viewportMap);
            viewportMap.latlngbounds.extend(event_marker.position);
            google.maps.event.addListener(event_marker, 'click', function() {
                infowindow.setContent(event_mapinfo);
                infowindow.open(event_marker.map, event_marker);
            });
        });
        console.log("resizing map");
        viewportMap.setCenter(viewportMap.latlngbounds.getCenter());
        viewportMap.fitBounds(viewportMap.latlngbounds);
    },
};


var viewport_list = {
    name: 'Default list viewport',
    clear: function() {
        $("#viewportListcontent").html("<h2>Switching community...</h2>");
    },
    setup: function() {
        // static listview setup
        var markup = {
            header: '<h3>' + current.active_community.name + ': Recent events</h3>' + 
            '<ul id="viewport_eventlist" data-role="listview" data-inset="true" >',
            footer: '</ul>',
        };
        $("#viewportListcontent").html(markup.header+markup.footer);
        $("#viewport_eventlist").listview();
    },
    newevent: function(event) {
        // Nothing to do for listview
    },
    showevents: function(events) {
        // Listview
        var items_html ='';
        $.each(events,function(key,event) {
            //items_html += '<li ><img class="ul-li-icon" style="width: 20px; height: 20px;" src='+get_event_icon(event)+'>'
            items_html += '<li ><img class="ul-li-icon" src='+get_event_icon(event)+'>'
            + event.create_time.substring(0,10) + " @ " + event.create_time.substring(11,16)
            +"  "+event.intype+': ' + event.detail 
            + " (reported by " + event.nickname + ") "
            +" Status: "+event.status
		
            //+ event_edit_link(event)
            + '</li> ';
        });
        $("#viewport_eventlist").prepend(items_html);
        $("#viewport_eventlist").listview('refresh');
    },
};

function viewports_do(action,arg) {
    //debugmsg("viewports_do: doing " + action);
    var viewports = [viewport_map, viewport_list];
    $.each(viewports,function(key,viewport) {
        //debugmsg("viewports_do: doing " + action + " on " + viewport.name);
        viewport[action](arg);
    });
}



function init_viewportMap() {
    // Add a clearMarkers function to google map
    google.maps.Map.prototype.clearMarkers = function() {
        for(var i=0; i < this.markers.length; i++){
            this.markers[i].setMap(null);
        }
        this.markers = [];
    };

    var content = $("#viewportMapcontent");
    var options = {
        zoom : 15,
        center : new google.maps.LatLng(current.position.coords.latitude, current.position.coords.longitude),
        mapTypeId : google.maps.MapTypeId.ROADMAP,
		mapTypeControl: true,
			mapTypeControlOptions: {
									style: google.maps.MapTypeControlStyle.DROPDOWN_MENU
									},
		zoomControl: true,
					zoomControlOptions: {
									style: google.maps.ZoomControlStyle.LARGE
									}


    };
    
    viewportMap = new google.maps.Map(content[0], options);
    viewportMap.markers = [];
    viewportMap.latlngbounds = new google.maps.LatLngBounds();
    mapcheck.setready();
}

function event_add_marker(event) {
    //debugmsg("adding marker for event:",event._id);
    var event_mapinfo = "<b>"+event.intype +"</b>" 
    + "<i>@ " + event.create_time.substring(0,10) + "  " + event.create_time.substring(11,16)
    + " <br/>" 
    + " <img src='images/here.png' alt='dot'>" + event.detail + '<br>'
    + " Reported by: " + event.nickname  + " "
    + '(' + event.status + ")</i><br>"
    //  XXX working on ui concept to edit and event - ;			
    + event_edit_link(event) + "<br>";
   
    var event_marker = new google.maps.Marker({
        position: new google.maps.LatLng(event.lat, event.long),
        animation : google.maps.Animation.DROP,  
        //  draggable: true,
        icon: get_event_icon(event), 
    });
    current.event_localinfo[event._id] = {
      marker: event_marker,
      mapinfo: event_mapinfo,
    };
}

function event_edit_link(event) {
    return "<a  href='#editeventformpage' style='float:right' onClick=\"sessionStorage.event_to_edit='" +event._id + "'\"><img  src='images/edit.png'/>";
}

function manmarker_get_position(do_after_drag) {
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
        current.manmarker = manmarker.getPosition();
        do_after_drag();
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



