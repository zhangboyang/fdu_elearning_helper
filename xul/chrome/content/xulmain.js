
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
    document.getElementById("mybrowser").contentWindow.helloworld2();
}

function open_calc()
{
    var file = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces["nsILocalFile"]);
    file.initWithPath("/usr/bin/xcalc");
    var process = Components.classes["@mozilla.org/process/util;1"].createInstance(Components.interfaces.nsIProcess);
    process.init(file);
    process.run(false, [], 0);
}

function mymenu_popupshowing(event)
{
    var element = event.target.triggerNode;
    var isTextArea = element instanceof HTMLTextAreaElement;
    //alert(isTextArea);
    if (!isTextArea) {
        event.preventDefault();
    }
}





const gClipboardHelper = Components.classes["@mozilla.org/widget/clipboardhelper;1"]
                                       .getService(Components.interfaces.nsIClipboardHelper);

Components.utils.import('resource://gre/modules/Services.jsm');


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
