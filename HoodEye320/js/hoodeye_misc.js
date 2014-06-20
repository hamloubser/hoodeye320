// Misc utility functions for hoodeye

function get_url_params() {
  var a = window.location.search.substr(1).split('&');
  if (a === "") return {};
  var b = {};
  for (var i = 0; i < a.length; ++i)
  {
    var p=a[i].split('=');
    if (p.length != 2) continue;
    b[p[0]] = decodeURIComponent(p[1].replace(/\+/g, " "));
  }
  return b;
}


function OnceReady() {
  this.isready =  false;
  this.callbacks = [];
  this.onready = function (new_callback) {
    if (this.isready) {
      //console.log("running: "+new_callback);
      new_callback();
    } else {
      //console.log("pushing: "+new_callback);
      this.callbacks.push(new_callback);
    }
  };
  this.setready =  function() {
    $.each(this.callbacks, function (key,callback) {
        callback();
    });
    this.isready = true;
  };
}


// msgtype allows us different behavious, like not vibrating on debug messages
// // or beeping on errors?
function showstatus(msg,msgtype) {
    $("#statuspopup").html("<p>"+msg+"</p>");
    // open with timeout because of browser issues, apparently
    setTimeout(function(){
        $("#statuspopup").popup("open");
        // navigator.notification.beep(1);
        if (isphone || msgtype != 'debug') {
          navigator.notification.vibrate(2);
        }
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
    console.log('debugmsg: ' + data.msg);
    $.post(server_address+'/api/debugmsg',data);

	/*if (!socketcheck.isready) {
      $.post(server_address+'/api/debugmsg',data);
	} else {
	  socketcheck.onready(function() {
	    socket.emit('debugmsg',data.msg);
      });
	}*/
}


function base64toBlob(base64Data, contentType) {
    contentType = contentType || '';
    var sliceSize = 1024;
    var byteCharacters = atob(base64Data);
    var bytesLength = byteCharacters.length;
    var slicesCount = Math.ceil(bytesLength / sliceSize);
    var byteArrays = new Array(slicesCount);

    for (var sliceIndex = 0; sliceIndex < slicesCount; ++sliceIndex) {
        var begin = sliceIndex * sliceSize;
        var end = Math.min(begin + sliceSize, bytesLength);

        var bytes = new Array(end - begin);
        for (var offset = begin, i = 0 ; offset < end; ++i, ++offset) {
            bytes[i] = byteCharacters[offset].charCodeAt(0);
        }
        byteArrays[sliceIndex] = new Uint8Array(bytes);
    }
    return new Blob(byteArrays, { type: contentType });
}


//sync_get: mostly for loading templates from local files, returns the result of the get or undefined on any failure
function sync_get(url) {
  var result;
  $.ajax({ url: url, async: false, success: function(response) { result = response; }});
  return result;
}

// Load template with fallback, call next(rendered_html)
var loaded_fragments = { };
//var load_fragment_path = '/fragments/';
var load_fragment_path = '';
function load_fragment(fragment_spec) {
   // if no path given, assume relative local path
	if (!loaded_fragments[fragment_spec]) {
      loaded_fragments[fragment_spec] = sync_get(fragment_spec);
	}
	return loaded_fragments[fragment_spec];
}

String.prototype.capitalize = function() {
	return this.charAt(0).toUpperCase() + this.slice(1);
}

function object_to_html (data) {
  var html = '';
  if (typeof data == 'string') {
    return data;
  }
	      console.log('data: ' + typeof data);
	      console.log(data);
  if (typeof data == 'array') {
	  _.each(data,function(index,avalue) {
		  html += object_to_html(avalue) + ', ';
	  });
	  return html;
  }
  if (typeof data == 'object') {
      var html_end = '';
      var html_join = '';
	  _.each(data,function(value,key) {
	      console.log('value: ' + typeof value + '....' + value);
	      console.log('key: ' + typeof key);
		  if (typeof key == 'string') {
		    html += key.capitalize().replace("_"," ") + ': ';
		    html += object_to_html(value) + '<br>';
		  } else {
		    // should be a number..
		    html += html_join + object_to_html(value);
            html_join = ', ';
            html_end = '<br>';
		  }
		  //html += key.replace("_"," ") +': ' + object_to_html(value) + '<br>';
	  });
	  html += html_end;
	return html;
  }
  console.log('object_to_html uncaught type:' + typeof data);
  return JSON.stringify(data);
}
