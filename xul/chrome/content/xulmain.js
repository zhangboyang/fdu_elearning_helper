
// enable remote debugging

Components.utils.import('resource://gre/modules/devtools/dbg-server.jsm');
if (!DebuggerServer.initialized) {
    DebuggerServer.init();
    DebuggerServer.addBrowserActors();
    DebuggerServer.allowChromeProcess = true;
}

let dbgListener=DebuggerServer.createListener();
dbgListener.portOrPath=6000;
dbgListener.open();


function mylog(s)
{
    var console;
    console = Components.classes["@mozilla.org/consoleservice;1"].getService(Components.interfaces.nsIConsoleService);
    console.logStringMessage(s);
}

function helloworld()
{
    alert("helloworld");
    open_calc();
    mylog("hello! logging");
}

function open_calc()
{
    var file = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces["nsILocalFile"]);
    file.initWithPath("/usr/bin/xcalc");
    var process = Components.classes["@mozilla.org/process/util;1"].createInstance(Components.interfaces.nsIProcess);
    process.init(file);
    process.run(false, [], 0);
}


