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
      new_callback();
    } else {
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
    $.post(server_address+'/api/debugmsg',data);
}

