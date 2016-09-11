var prefservice = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService);
var prefs = prefservice.getBranch("elearninghelper.");


function set_window_size(left, top, width, height)
{
    window.moveTo(left, top);
    window.resizeTo(width, height);
}
function save_window_size()
{
    if (window.windowState === 3) { // normal state
        prefs.setIntPref("browser_screenX", window.screenX);
        prefs.setIntPref("browser_screenY", window.screenY);
        prefs.setIntPref("browser_width", window.outerWidth);
        prefs.setIntPref("browser_height", window.outerHeight);
    }
}
setInterval("save_window_size()", 1000);
window.addEventListener("resize", save_window_size, false);
window.addEventListener("close", save_window_size, false);
set_window_size(
    prefs.getIntPref("browser_screenX", window.screenX),
    prefs.getIntPref("browser_screenY", window.screenY),
    prefs.getIntPref("browser_width", window.outerWidth),
    prefs.getIntPref("browser_height", window.outerHeight)
);
save_window_size();








function set_window_title(str)
{
    document.title = str + " - eLearning 助手";
}
function updatetitle()
{
    set_window_title(document.getElementById("browser").contentTitle);
}









// nsIWebProgressListener implementation to monitor activity in the browser.
function WebProgressListener() {
}
WebProgressListener.prototype = {
  _requestsStarted: 0,
  _requestsFinished: 0,

  // We need to advertize that we support weak references.  This is done simply
  // by saying that we QI to nsISupportsWeakReference.  XPConnect will take
  // care of actually implementing that interface on our behalf.
  QueryInterface: function(iid) {
    if (iid.equals(Components.interfaces.nsIWebProgressListener) ||
        iid.equals(Components.interfaces.nsISupportsWeakReference) ||
        iid.equals(Components.interfaces.nsISupports))
      return this;
    
    throw Components.results.NS_ERROR_NO_INTERFACE;
  },

  // This method is called to indicate state changes.
  onStateChange: function(webProgress, request, stateFlags, status) {
    updatetitle();
    
    const WPL = Components.interfaces.nsIWebProgressListener;

    var progress = document.getElementById("progress");

    if (stateFlags & WPL.STATE_IS_REQUEST) {
      if (stateFlags & WPL.STATE_START) {
        this._requestsStarted++;
      } else if (stateFlags & WPL.STATE_STOP) {
        this._requestsFinished++;
      }
      if (this._requestsStarted > 1) {
        var value = (100 * this._requestsFinished) / this._requestsStarted;
        progress.setAttribute("mode", "determined");
        progress.setAttribute("value", value + "%");
      }
    }

    if (stateFlags & WPL.STATE_IS_NETWORK) {
      var stop = document.getElementById("stop");
      if (stateFlags & WPL.STATE_START) {
        stop.setAttribute("disabled", false);
        progress.setAttribute("style", "");
      } else if (stateFlags & WPL.STATE_STOP) {
        stop.setAttribute("disabled", true);
        progress.setAttribute("style", "display: none");
        this.onStatusChange(webProgress, request, 0, "就绪");
        this._requestsStarted = this._requestsFinished = 0;
      }
    }
  },

  // This method is called to indicate progress changes for the currently
  // loading page.
  onProgressChange: function(webProgress, request, curSelf, maxSelf,
                             curTotal, maxTotal) {
    if (this._requestsStarted == 1) {
      var progress = document.getElementById("progress");
      if (maxSelf == -1) {
        progress.setAttribute("mode", "undetermined");
      } else {
        progress.setAttribute("mode", "determined");
        progress.setAttribute("value", ((100 * curSelf) / maxSelf) + "%");
      }
    }
    updatetitle();
  },

  // This method is called to indicate a change to the current location.
  onLocationChange: function(webProgress, request, location) {
    var urlbar = document.getElementById("urlbar");
    urlbar.value = location.spec;

    var browser = document.getElementById("browser");
    var back = document.getElementById("back");
    var forward = document.getElementById("forward");

    back.setAttribute("disabled", !browser.canGoBack);
    forward.setAttribute("disabled", !browser.canGoForward);
  },

  // This method is called to indicate a status changes for the currently
  // loading page.  The message is already formatted for display.
  onStatusChange: function(webProgress, request, status, message) {
    var status = document.getElementById("status");
    status.setAttribute("label", message);
  },

};
var listener;

function go() {
  var urlbar = document.getElementById("urlbar");
  var browser = document.getElementById("browser");

  browser.loadURI(urlbar.value, null, null);
}

function back() {
  var browser = document.getElementById("browser");
  browser.stop();
  browser.goBack();
}

function forward() {
  var browser = document.getElementById("browser");
  browser.stop();
  browser.goForward();
}

function reload() {
  var browser = document.getElementById("browser");
  browser.reload();
}

function stop() {
  var browser = document.getElementById("browser");
  browser.stop();
}


function onload() {
  var urlbar = document.getElementById("urlbar");
  
  listener = new WebProgressListener();

  var browser = document.getElementById("browser");
  browser.addProgressListener(listener,
    Components.interfaces.nsIWebProgress.NOTIFY_ALL);
}




addEventListener("load", onload, false);


