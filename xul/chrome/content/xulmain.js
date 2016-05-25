// ========================= useful functions =========================


// log to js console
function mylog(s)
{
    var console;
    console = Components.classes["@mozilla.org/consoleservice;1"].getService(Components.interfaces.nsIConsoleService);
    console.logStringMessage("[MYLOG] " + s);
}





// sample function for calling functions from xul to html
function helloworld()
{
    alert("helloworld");
    open_calc();
    mylog("hello! logging");
    document.getElementById("mybrowser").contentWindow.helloworld2();
}

// sample function for running applications
function open_calc()
{
    var file = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces["nsILocalFile"]);
    file.initWithPath("/usr/bin/xcalc");
    var process = Components.classes["@mozilla.org/process/util;1"].createInstance(Components.interfaces.nsIProcess);
    process.init(file);
    process.run(false, [], 0);
}














/*
    test if we should display popup menu (right click)
    used in 'xulmain.xul'
*/
function mymenu_popupshowing(event)
{
    var element = event.target.triggerNode; // get the clicked object
    
    //var isTextArea = element instanceof HTMLTextAreaElement;
    if (!document.getElementById("mybrowser").contentWindow.should_popupmenu(element)) {
        //alert(element);
        event.preventDefault(); // prevent the menu from appearing
    }
}




















// =========================== vars ========================================

/*
    appinfo
*/
var xulinfo = Components.classes["@mozilla.org/xre/app-info;1"].getService(Components.interfaces.nsIXULAppInfo);


/*
    import Services
*/
Components.utils.import('resource://gre/modules/Services.jsm');





/*
    file io system
*/
Components.utils.import("resource://gre/modules/osfile.jsm")





/*
    clipboard system:
*/
var gClipboardHelper = Components.classes["@mozilla.org/widget/clipboardhelper;1"]
                                       .getService(Components.interfaces.nsIClipboardHelper);

function set_clipboard_text(str)
{
    gClipboardHelper.copyString(str);
}

function get_clipboard_text(str)
{
    var trans = Components.classes["@mozilla.org/widget/transferable;1"].createInstance(Components.interfaces.nsITransferable);
    trans.init(null)
    trans.addDataFlavor("text/unicode");

    Services.clipboard.getData(trans, Services.clipboard.kGlobalClipboard);

    var str       = {};
    var strLength = {};

    trans.getTransferData("text/unicode", str, strLength);


    if (str) {
        var pastetext = str.value.QueryInterface(Components.interfaces.nsISupportsString).data;
        return pastetext;
    } else {
        return "";
    }
}








/*
    preferences system:
    
    https://developer.mozilla.org/en-US/Add-ons/Code_snippets/Preferences

    getBoolPref(), setBoolPref(), getCharPref(), setCharPref(), getIntPref(), setIntPref()

    the data is saved at:

    C:\Users\YOUR_USER_NAME\AppData\Roaming\elearninghelper\Profiles\SOME_UNIQUE_STRING.default
*/

var prefservice = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService);
var prefs = prefservice.getBranch("elearninghelper.");



// override user agent
prefservice.getBranch("general.").setCharPref("useragent.override", "elearninghelper/" + xulinfo.version);

















/* check if we should enable remote debug feature */

if (!prefs.getBoolPref("debug") || !prefs.getBoolPref("dbgserver")) {
    document.getElementById("reloadbtn").style.display = "none";
}

if (prefs.getBoolPref("debug") && prefs.getBoolPref("dbgserver")) {
    /*
        enable remote debugging
        note: this will no longer works when gecko version >= 44
        note: this block of code is moved to tail
              since this block of code will cause error when version >= 44
        
        https://developer.mozilla.org/en-US/docs/Archive/Mozilla/XULRunner/Debugging_XULRunner_applications
    */
    Components.utils.import('resource://gre/modules/devtools/dbg-server.jsm');
    if (!DebuggerServer.initialized) {
        DebuggerServer.init();
        DebuggerServer.addBrowserActors();
        DebuggerServer.allowChromeProcess = true;
    }
    let dbgListener=DebuggerServer.createListener();
    dbgListener.portOrPath=6000;
    dbgListener.open();
}
