
 
function id(element) {
    return document.getElementById(element);
}



function captureApp() {
}

captureApp.prototype = {
    pictureSource:null,
    
    destinationType:null,
    
    run:function() {
        var that = this;
        $("#captureVideo").addEventListener("click", function() {
            that._captureVideo.apply(that, arguments);
        });
        $("#captureAudio").addEventListener("click", function() {
            that._capureAudio.apply(that, arguments);
        });
        $("#captureImage").addEventListener("click", function() {
            that._captureImage.apply(that, arguments);
        });
    },
    
    _captureVideo:function() {
        var that = this;
        navigator.device.capture.captureVideo(function() {
            that._captureSuccess.apply(that, arguments);
        }, function() { 
            captureApp._captureError.apply(that, arguments);
        }, {limit:1});
    },
    
    _capureAudio:function() {
        var that = this;
        navigator.device.capture.captureAudio(function() {
            that._captureSuccess.apply(that, arguments);
        }, function() { 
            captureApp._captureError.apply(that, arguments);
        }, {limit:1});
    },
    
    _captureImage:function() {
        var that = this;
		showstatus("Now taking pic");
        navigator.device.capture.captureImage(function() {
            that._captureSuccess.apply(that, arguments);
        }, function() { 
            captureApp._captureError.apply(that, arguments);
        }, {limit:1});
    },
    
    _captureSuccess:function(capturedFiles) {
        var i, 
			html = '';
        for (i=0;i < capturedFiles.length;i+=1) {
            html +='<p>Capture taken! Its path is: ' + capturedFiles[i].fullPath + '</p>'
        }
		showstatus(html);
    },
    
    _captureError:function(error) {
       showstatus("An error occured! Code:" + error.code);
    },
}
