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
    document.getElementById("ehuibrowser").contentWindow.helloworld2();
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
    if (!document.getElementById("ehuibrowser").contentWindow.should_popupmenu(element)) {
        //alert(element);
        event.preventDefault(); // prevent the menu from appearing
    }
}




















// =========================== vars ========================================

/*
    appinfo and runtime
*/
var xulappinfo = Components.classes["@mozilla.org/xre/app-info;1"].getService(Components.interfaces.nsIXULAppInfo);
var xulruntime = Components.classes["@mozilla.org/xre/app-info;1"].getService(Components.interfaces.nsIXULRuntime);



/*
    sysinfo: see https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XPCOM/Reference/Interface/nsIPropertyBag
*/
var sysinfo = Components.classes["@mozilla.org/system-info;1"].getService(Components.interfaces.nsIPropertyBag2);




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
prefservice.getBranch("general.").setCharPref("useragent.override", "elearninghelper/" + xulappinfo.version);












// https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XUL/How_to_quit_a_XUL_application

function quit(aForceQuit)
{
    var appStartup = Components.classes['@mozilla.org/toolkit/app-startup;1'].
    getService(Components.interfaces.nsIAppStartup);

    // eAttemptQuit will try to close each XUL window, but the XUL window can cancel the quit
    // process if there is unsaved data. eForceQuit will quit no matter what.
    var quitSeverity = aForceQuit ? Components.interfaces.nsIAppStartup.eForceQuit : Components.interfaces.nsIAppStartup.eAttemptQuit;
    appStartup.quit(quitSeverity);
}



window.addEventListener("close", function (event) {
    try {
        var doquit = function () {
            quit(true);
        };
        document.getElementById("ehuibrowser").contentWindow.eh_unload().then(doquit, doquit);
        event.preventDefault();
    } catch (e) {
        // if some error occured, just do nothing
        // the event.preventDefault() is not called
        // so the application will quit
    }
});


















/* set or reset runtime debug options */
do {
    var dbgon = prefs.getBoolPref("debug");
    var prefstree = prefservice.getBranch("");
    prefstree.setBoolPref("devtools.chrome.enabled", dbgon);
    prefstree.setBoolPref("devtools.debugger.remote-enabled", dbgon);
    prefstree.setBoolPref("browser.dom.window.dump.enabled", dbgon);
    prefstree.setBoolPref("javascript.options.showInConsole", dbgon);
    prefstree.setBoolPref("javascript.options.strict", dbgon);
    prefstree.setBoolPref("nglayout.debug.disable_xul_cache", dbgon);
    prefstree.setBoolPref("nglayout.debug.disable_xul_fastload", dbgon);
} while (0);







/* open jsconsole if needed */
if (prefs.getBoolPref("debug") && prefs.getBoolPref("dbgjsconsole")) {
    window.open('chrome://global/content/console.xul', '_blank',
        'chrome,extrachrome,menubar,resizable,scrollbars,status,toolbar');
}





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
