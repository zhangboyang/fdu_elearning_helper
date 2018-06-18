// ======================== global variables ===========================

var OS; // it's a copy of window.parent.OS
var Services; // it's a copy of window.parent.Services
var prefs; // it's a copy of window.parent.prefs

// https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XPCOM/Reference/Interface/nsIPromptService
var prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                        .getService(Components.interfaces.nsIPromptService);


// prefs
var eh_debug, eh_dbglocallog;
var el_username; // elearning username
var el_password; // elearning password
var el_rememberme;
var usebuiltinviewer; // use builtin pdfviewer or not
var page_limit; // pdfviewer page limit
var usebuiltinbrowser; // use builtin browser or not
var syncoverwrite; // overwrite files while sync or not
var syncsizelimit; // size limit for single file, files exceed this limit will be ignored
var syncignoreext_str; // filename with exts in this list should be ignored, string format, like "exe, zip, rar"
var syncignoreext; // set format

function load_prefs()
{
    eh_debug = prefs.getBoolPref("debug");
    eh_dbglocallog = prefs.getBoolPref("dbglocallog");
    
    el_username = prefs.getCharPref("username");
    el_password = prefs.getCharPref("password");
    el_rememberme = prefs.getBoolPref("rememberme");
    usebuiltinviewer = prefs.getBoolPref("usebuiltinviewer");
    page_limit = prefs.getIntPref("pagelimit");
    usebuiltinbrowser = prefs.getBoolPref("usebuiltinbrowser");

    syncoverwrite = prefs.getBoolPref("syncoverwrite");

    syncsizelimit = prefs.getIntPref("syncsizelimit");
    syncignoreext_str = prefs.getCharPref("syncignoreext");
    syncignoreext = new Set(syncignoreext_str.split(",").map( function (str) { return str.trim(); } ));
}

function save_prefs()
{
    prefs.setCharPref("username", el_username);
    prefs.setCharPref("password", el_rememberme ? el_password : "");
    prefs.setBoolPref("rememberme", el_rememberme);
    prefs.setBoolPref("usebuiltinviewer", usebuiltinviewer);
    prefs.setIntPref("pagelimit", page_limit);
    prefs.setBoolPref("usebuiltinbrowser", usebuiltinbrowser);
    prefs.setBoolPref("syncoverwrite", syncoverwrite);
    prefs.setIntPref("syncsizelimit", syncsizelimit);
    prefs.setCharPref("syncignoreext", syncignoreext_str);
    
    load_prefs(); // load prefs just saved
}

// https://developer.mozilla.org/en-US/Add-ons/Code_snippets/Preferences
function set_unicode_pref(prefs, key, value)
{
    var str = Components.classes["@mozilla.org/supports-string;1"].createInstance(Components.interfaces.nsISupportsString);
    str.data = value;
    prefs.setComplexValue(key, Components.interfaces.nsISupportsString, str);
}
function get_unicode_pref(prefs, key)
{
    return prefs.getComplexValue(key, Components.interfaces.nsISupportsString).data;
}


var eh_version; // app version string, a copy of window.parent.xulappinfo.version
var eh_os; // "WINNT" / "Linux" / "Darwin", a copy of window.parent.xulruntime.OS

var docfolder; // document folder, FILE URI style, like file:///foo/bar....
var ndocfolder; // document folder, NATIVE style, like C:\foo\bar.....
var dbfolder; // db folder, FILE URI style, like file:///foo/bar....
var ndbfolder; // db folder, NATIVE style, like C:\foo\bar.....
var datafolder; // internal data folder, NATIVE style, like C:\foo\bar.....

var eh_logfile; // NATIVE path to local log file

var ppt2pdf_path; // NATIVE path to ppt2pdf.vbs



var chsweekday = ["日", "一", "二", "三", "四", "五", "六", "日"];
function timetable(id, flag) // 作息时间表
{
    var timetable_array = [
        undefined, undefined,
        "8:00", "8:45",
        "8:55", "9:40",
        "9:55", "10:40",
        "10:50", "11:35",
        "11:45", "12:30",
        "13:30", "14:15",
        "14:25", "15:10",
        "15:25", "16:10",
        "16:20", "17:05",
        "17:15", "18:00",
        "18:30", "19:15",
        "19:25", "20:10",
        "20:20", "21:05",
        "21:15", "22:10",
    ];
    return timetable_array[id * 2 + flag];
}

    
function preventdefaultfunc (e) { e.preventDefault(); };



function replace_special_char(str, chlist)
{
    var ret = "";
    for (var i = 0; i < str.length; i++) {
        if (chlist.indexOf(str.charAt(i)) >= 0) {
            ret += "_";
        } else {
            ret += str.charAt(i);
        }
    }
    return ret;
}

var filename_ilchar = "*|\\:\"<>?/"; // FIXME: is this enough?
var path_ilchar = "*|:\"<>?";

/*
    change special chars (like *|\:"<>?/) to '_'
*/
function escape_filename(filename)
{
    return replace_special_char(filename, filename_ilchar);
}

/*
    remove illegal chars in path
*/
function escape_path(str)
{
    return replace_special_char(str, path_ilchar);
}




/*
    check if filename is legal
    filename can be a directory
    throw exception when filename is illegal
*/
function check_filename(filename)
{
    for (var i = 0; i < filename_ilchar.length; i++) {
        if (filename.indexOf(filename_ilchar.charAt(i)) >= 0) {
            throw "illegal filename: " + filename;
        }
    }
}
/*
    check if fileuri inside baseuri
    throw exception when fileuri is not inside baseuri
*/
function check_path_with_base(fileuri, baseuri)
{
    // FIXME: is this enough?
    var npath = OS.Path.normalize(OS.Path.fromFileURI(fileuri));
    var nbase = OS.Path.normalize(OS.Path.fromFileURI(baseuri));
    if (!npath.startsWith(nbase)) {
        throw "illegal path = " + fileuri + ", base = " + baseuri;
    }
}



/*
    write string to file
    return value is a promise
*/
function write_string_to_fileuri(str, fileuri)
{
    var encoder = new TextEncoder();
    var array = encoder.encode(str);
    return OS.File.writeAtomic(OS.Path.fromFileURI(fileuri), array);
}
function write_json_to_fileuri(obj, fileuri)
{
    var jsonobj = { app: "elearninghelper", ver: eh_version, obj: obj };
    var jsonstr = eh_debug ? JSON.stringify(jsonobj, null, " ") : JSON.stringify(jsonobj);
    return write_string_to_fileuri(jsonstr, fileuri);
}

/*
    read string from file
    return valuse is a promise
*/
function read_string_from_fileuri(fileuri)
{
    var decoder = new TextDecoder();
    return new Promise( function (resolve, reject) {
        OS.File.read(OS.Path.fromFileURI(fileuri)).then( function (array) {
            resolve(decoder.decode(array));
        }, function (reason) {
            reject("can't read string: " + reason);
        });
    });  
}
function read_json_from_fileuri(fileuri)
{
    return new Promise( function (resolve, reject) {
        read_string_from_fileuri(fileuri).then( function (str) {
            try {
                var data = JSON.parse(str);
                resolve(data.obj);
            } catch (e) {
                reject("JSON parse failed: " + e.message);
            }
        }, function (reason) {
            reject("read_string_from_fileuri() failed: " + reason);
        });
    });
}

/*
    create the dirname part of a fileuri
    return valuse is promise
*/
function create_dirname(fileuri, baseuri)
{
    var file_native = OS.Path.fromFileURI(fileuri);
    var target_native = OS.Path.dirname(file_native);
    if (baseuri) {
        var base_native = OS.Path.fromFileURI(baseuri);
        return OS.File.makeDir(target_native, {
            ignoreExisting: true,
            from: base_native
        });
    } else {
        return OS.File.makeDir(target_native, {
            ignoreExisting: true
        });
    }
}
/*
    create the dir by diruri
    return valuse is promise
*/
function create_dir(diruri, baseuri)
{
    var target_native = OS.Path.fromFileURI(diruri);
    if (baseuri) {
        var base_native = OS.Path.fromFileURI(baseuri);
        return OS.File.makeDir(target_native, {
            ignoreExisting: true,
            from: base_native
        });
    } else {
        return OS.File.makeDir(target_native, {
            ignoreExisting: true
        });
    }
}


/*
    local log related functions
*/
var local_log_queue = new Array();
var local_log_flush_limit = 10;
function flush_local_log() // flush log to file, return promise
{
    if (local_log_queue.length == 0) return Promise.resolve(0);
    
    var logdata = "";
    local_log_queue.forEach( function (str) { logdata += str; } );
    local_log_queue.length = 0;
    
    return new Promise( function (resolve, reject) {
        OS.File.open(eh_logfile, { write: true, append: true }).then( function (f) {
            var encoder = new TextEncoder();
            var bindata = encoder.encode(logdata);
            f.write(bindata).then( function (len) {
                f.close().then( function () {
                    resolve(len);
                }, function (reason) {
                    reject("f.close() failed: " + reason);
                });
            }, function (reason) {
                reject("f.write() failed: " + reason);
            });
        }, function (reason) {
            reject("OS.File.open() failed: " + reason);
        });
    });
}
function local_log(msg) // add log to queue
{
    if (eh_debug && eh_dbglocallog) {
        var str = "[" + format_date(new Date(), "dtsm") + "] " + msg + "\n";
        local_log_queue.push(str);
        console.log("LOCAL LOG: " + str);
        window.parent.mylog("LOCAL LOG: " + str);
        if (local_log_queue.length >= local_log_flush_limit) {
            flush_local_log();
        }
    }
}





// ======================= icon relerated functions =========================


function get_elearning_remote_iconuri(iconname)
{
    if (iconname.startsWith("filetype-")) {
        switch (iconname.substring(9).toLowerCase()) {
            case "ppt": case "pptx": return "https://elearning.fudan.edu.cn/library/image/sakai/ppt.gif";
            case "doc": case "docx": return "https://elearning.fudan.edu.cn/library/image/sakai/word.gif";
            case "xls": case "xlsx": return "https://elearning.fudan.edu.cn/library/image/sakai/excel.gif";
            case "pdf": return "https://elearning.fudan.edu.cn/library/image/sakai/pdf.gif";
            case "jpg": case "jpeg": case "png": case "gif": case "bmp": case "tif": case "tiff":
                return "https://elearning.fudan.edu.cn/library/image/sakai/image.gif";
            case "zip": case "rar": case "dmg": case "7z": case "tar": case "xz": case "gz": case "bz2":
                return "https://elearning.fudan.edu.cn/library/image/sakai/compressed.gif";
            case "txt": case "c": case "cpp": case "h": case "java": case "py": case "sh": case "sql":
                return "https://elearning.fudan.edu.cn/library/image/sakai/text.gif";
            case "htm": case "html": case "js": case "css": case "json":
                return "https://elearning.fudan.edu.cn/library/image/sakai/html.gif";
            case "exe": case "jar": case "class": case "o": case "a":
                return "https://elearning.fudan.edu.cn/library/image/sakai/binary.gif";
            default: return "https://elearning.fudan.edu.cn/library/image/sakai/generic.gif";
        }
    }

    if (iconname == "famfamfam") {
        return "https://elearning.fudan.edu.cn/library/image/silk/fff-sprites/images/famfamfam.png";
    }

    console.log("icon not found: ", iconname);
    return "https://elearning.fudan.edu.cn/library/image/sakai/generic.gif"; // fallback
}

var elearning_icon_set;
function get_elearning_iconuri(iconname)
{
    var remoteuri = get_elearning_remote_iconuri(iconname);
    var filename = get_basename(remoteuri);
    var filepath = OS.Path.join(datafolder, "elearningicons", filename);
    if (elearning_icon_set.has(iconname)) {
        return OS.Path.toFileURI(filepath);
    } else {
        OS.File.exists(filepath).then( function (fe) {
            var addtoset = function (iconname) {
                if (!elearning_icon_set.has(iconname)) {
                    elearning_icon_set.add(iconname);
                    var f = OS.Path.toFileURI(OS.Path.join(datafolder, "elearningicons", "known.json"));
                    var arr = new Array();
                    for (var val of elearning_icon_set) arr.push(val);
                    write_json_to_fileuri({ iconname: arr }, f);
                }
            }
            if (!fe) {
                install_file(remoteuri, filepath).then( function () {
                    addtoset(iconname);
                });
            } else {
                addtoset(iconname);
            }
        });
        
        return remoteuri; // because we can't wait for promise, so we just return remoteuri
    }
}

function initp_elearning_icon()
{
    return new Promise( function (resolve, reject) {
        var f = OS.Path.toFileURI(OS.Path.join(datafolder, "elearningicons", "known.json"));
        read_json_from_fileuri(f).then( function (obj) {
            var arr = obj.ext;
            if (arr !== undefined) elearning_icon_set = new Set(arr);
            else elearning_icon_set = new Set();
            resolve();
        }, function () {
            elearning_icon_set = new Set();
            resolve();
        });
    });
}

function get_filetype_iconuri(ext)
{
    return get_elearning_iconuri("filetype-" + ext);
}

function create_sakai_icon_span(iconname)
{
    var ret = $(document.createElement('span'));
    var pos;
    switch (iconname) {
        case "icon-sakai-syllabus": pos = [-90, -414]; break;
        case "icon-sakai-assignment-grades": pos = [-324, -324]; break;
        case "icon-sakai-iframe-site": pos = [-162, -252]; break;
        default: pos = [-36, -0]; break;
    }
    ret.css("background-position", pos[0].toString() + "px " + pos[1].toString() + "px");
    ret.css("background-image", "url(\"" + get_elearning_iconuri("famfamfam") + "\")");
    ret.css("background-color", "transparent");
    ret.css("background-repeat", "no-repeat");
    ret.css("display", "inline-block");
    ret.css("height", "16px");
    ret.css("width", "16px");
    ret.css("vertical-align", "middle");
    return ret;
}








function launch_fileuri(fileuri)
{
    if (eh_os == "Darwin") {
        // I don't know why file.launch() doesn't work
        // so I use the 'open' command line tool
        var file = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces["nsILocalFile"]);
        file.initWithPath("/bin/bash"); // I don't know why using '/usr/bin/open' directly doesn't work
        var process = Components.classes["@mozilla.org/process/util;1"].createInstance(Components.interfaces.nsIProcess);
        process.init(file);
        process.runw(false, ["-c", "exec /usr/bin/open '" + OS.Path.fromFileURI(fileuri) + "'"], 2);
    } else {
        var file = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces["nsILocalFile"]);
        file.initWithPath(OS.Path.fromFileURI(fileuri));
        file.launch();
    }

    /*var iosvc = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);
    auri = iosvc.newURI(fileuri, null, null);
    var psvc = Components.classes["@mozilla.org/uriloader/external-protocol-service;1"].getService(Components.interfaces.nsIExternalProtocolService);
    psvc.loadUrl(auri);*/
}
function reveal_fileuri(fileuri)
{
    var file = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces["nsILocalFile"]);
    file.initWithPath(OS.Path.fromFileURI(fileuri));
    file.reveal();
}

function get_hour_desc(d)
{
    var h = d.getHours();
    if (h <= 4) return "凌晨";
    if (h <= 11) return "早上";
    if (h <= 13) return "中午";
    if (h <= 17) return "下午";
    return "晚上";
}
/*
    return date offset from now
    return object:
        {
            str: something like "x 天前"
            color: something like "red"
            offset: time diff in ms, <0 means past, >0 means future
        }
*/
function date_offset(d)
{
    var c = new Date(); // current time
    var offset = d.getTime() - c.getTime(); // time diff in ms

    var f;
    var number = -1;
    var unit;
    var suffix;
    
    if (offset <= 0) { f = -1; suffix = "前"; } else { f = 1; suffix = "后" };
    var o = f * offset;

    var str;
    
    if (o < 10 * 1000) {
        str = "现在";
        color = "red";
    } else if (o < 60 * 1000) {
        number = Math.floor(o / 1000);
        unit = "秒";
        color = "red";
    } else if (o < 60 * 60 * 1000) {
        number = Math.floor(o / (60 * 1000));
        unit = "分钟";
        color = "red";
    } else if (o < 12 * 60 * 60 * 1000) {
        number = Math.floor(o / (60 * 60 * 1000));
        unit = "小时";
        color = "red";
    } else {
        do {
            var dd = new Date(d);
            dd.setHours(0, 0, 0, 0);
            
            // recent offset
            var rdesc = ["前天", "昨天", "今天", "明天", "后天"];
            for (var i = -2; i <= 2; i++) {
                var r = new Date(c);
                r.setDate(r.getDate() + i);
                r.setHours(0, 0, 0, 0);
                if (r <= dd && dd <= r) {
                    str = rdesc[i + 2] + get_hour_desc(d);
                    color = "red";
                    o = -1;
                    break;
                }
            }
            if (o < 0) break;

            // weekday offset
            var wdesc = ["上周", "本周", "下周"];
            for (var i = -1; i <= 1; i++) {
                var w = new Date(c);
                w.setDate(w.getDate() - w.getDay() + i * 7);
                for (var j = 1; j <= 7; j++) {
                    var ww = new Date(w);
                    ww.setDate(ww.getDate() + j);
                    ww.setHours(0, 0, 0, 0);
                    if (ww <= dd && dd <= ww) {
                        str = wdesc[i + 1] + chsweekday[j] + get_hour_desc(d);
                        color = "fuchsia";
                        o = -1;
                        break;
                    }
                }
                if (o < 0) break;
            }
            if (o < 0) break;
            
            // other offset
            if (o < 7 * 24 * 60 * 60 * 1000) {
                number = Math.floor(o / (24 * 60 * 60 * 1000));
                unit = "天";
                color = "fuchsia";
            } else if (o < 4 * 7 * 24 * 60 * 60 * 1000) {
                number = Math.round(o / (7 * 24 * 60 * 60 * 1000));
                unit = "周";
                color = "blue";
            } else if (o < 365 * 24 * 60 * 60 * 1000) {
                number = 0;
                var t = new Date(d);
                while (number <= 36) { // set limit in case of infloop
                    t.setMonth(t.getMonth() - f);
                    if (t >= c) break;
                    number++;
                }
                if (number == 0) number = 1;
                /*if ((t.getTime() - c.getTime()) / (24 * 60 * 60 * 1000) < 15) {
                    number++; // do some rounding
                }*/
                
                unit = "个月";
                if (number <= 1) color = "darkgreen";
                else if (number <= 3) color = "black";
                else color = "black";
            } else {
                number = Math.abs(d.getFullYear() - c.getFullYear());
                unit = "年";
                color = "black";
            }
        } while (0);
    }

    if (number >= 0) str = number.toString() + " " + unit + suffix;

    return { str: str, color: color, offset: offset };
}


/*
    format date
    fmt: d -> date, t -> time, s->show seconds, m->show ms, w -> weekday, o -> offset
*/
function format_date(d, fmt)
{
    if (d.getTime() == 0) return "未知";
    var base = "";
    if (fmt.indexOf("d") !== -1) base += " " + d.getFullYear().toString() + "/" + (d.getMonth() + 1).toString() + "/" + d.getDate().toString();
    if (fmt.indexOf("t") !== -1) {
        base += " " + ("0" + d.getHours().toString()).slice(-2) + ":" + ("0" + d.getMinutes().toString()).slice(-2);
        if (fmt.indexOf("s") !== -1) {
            base += ":" + ("0" + d.getSeconds().toString()).slice(-2);
            if (fmt.indexOf("m") !== -1) {
                base += "." + ("00" + d.getMilliseconds().toString()).slice(-3);
            }
        }
    }
    if (base != "") base = base.slice(1);
    
    var desc = "";
    if (fmt.indexOf("w") !== -1) desc += ", 周" + chsweekday[d.getDay()];
    
    var ostr = date_offset(d).str;
    if (fmt.indexOf("o") !== -1 && ostr != "") desc += ", " + ostr;

    if (desc != "") {
        if (base != "") {
            return base + " (" + desc.slice(2) + ")";
        } else {
            return desc.slice(2);
        }
    } else {
        return base;
    }
}

function parse_elearning_date(datestr)  // FIXME: check meaning of 12:00AM and 12:00PM
{
//    datestr = "2016-5-24 下午12:00";
    var chs = datestr.match(/(\d+)-(\d+)-(\d+) (上午|下午)(\d+):(\d+)/);
    if (chs != null) {
        var ret = new Date();
        ret.setFullYear(parseInt(chs[1]), parseInt(chs[2]) - 1, parseInt(chs[3]));
        ret.setHours(parseInt(chs[5]) % 12 + (chs[4] == "上午" ? 0 : 12), parseInt(chs[6]), 0, 0);
        //console.log(datestr, chs, ret.toString());
        return ret;
    }
    var eng = datestr.match(/(.+ \d\d\d\d) (\d+):(\d+) (am|pm)/);
    if (eng != null) {
        var ret = new Date(eng[1]);
        ret.setHours(parseInt(eng[2]) % 12 + (eng[4] == "am" ? 0 : 12), parseInt(eng[3]), 0, 0);
        //console.log(datestr, eng, ret.toString());
        return ret;
    }
    return new Date(0);
}

function format_filesize(sz)
{
    if (sz >= 1024) {
        if (sz < 1024 * 1024) return (sz / 1024).toFixed(2) + " KB";
        if (sz < 1024 * 1024 * 1024) return (sz / (1024 * 1024)).toFixed(2) + " MB";
        if (sz < 1024 * 1024 * 1024 * 1024) return (sz / (1024 * 1024 * 1024)).toFixed(2) + " GB";
    }
    return sz + " 字节";
}
function parse_filesize(str)
{
    str = str.toUpperCase();
    var number = parseFloat(str);
    var unit = 1;
    if (str.indexOf("G") !== -1) unit = 1024 * 1024 * 1024;
    else if (str.indexOf("M") !== -1) unit = 1024 * 1024;
    else if (str.indexOf("K") !== -1) unit = 1024;
    //console.log("PARSE_FILESIZE", str, number, unit);
    return Math.floor(number * unit);
}

/*
    grab the user-friendly part
    reject("some-header####some-user-friendly-message####some-internal-message")
*/
function get_friendly_part(msg)
{
    console.log(msg);
    local_log("get_friendly_part: " + msg);
    var idx = msg.indexOf("####");
    if (idx < 0) {
        return "内部错误: " + msg;
    } else {
        var msg2 = msg.substr(idx + 4);
        var idx2 = msg2.indexOf("####");
        if (idx2 < 0) {
            return "内部错误: " + msg;
        } else {
            return msg2.substr(0, idx2);
        }
    }
}

// remove all cookies
function remove_all_cookies()
{
    Services.cookies.removeAll();
}
// dump cookie
function dump_cookies(domain)
{
    let x = Services.cookies.getCookiesFromHost(domain);
    while (x.hasMoreElements()) {
        var cookie = x.getNext().QueryInterface(Components.interfaces.nsICookie2); 
        console.log(cookie.host + ";" + cookie.name + "=" + cookie.value + "\n");
    }
}


// create universal key-value div
function create_kvdiv(kstr, vstr, vfunc)
{
    if (typeof(vfunc) != "undefined") {
        var divobj = $(document.createElement('div'))
            .addClass("eh_kvdiv")
            .append($(document.createElement('span')).addClass("eh_key").text(kstr))
            .append($(document.createElement('span')).addClass("eh_value eh_link").text(vstr).click(vfunc));
        return divobj[0];
    } else {
        return $(document.createElement('div'))
            .addClass("eh_kvdiv")
            .append($(document.createElement('span')).addClass("eh_key").text(kstr))
            .append($(document.createElement('span')).addClass("eh_value").text(vstr))
            [0];
    }
}



function create_kvdiv_with_obj(kstr, vobj)
{
    return $(document.createElement('div'))
        .addClass("eh_kvdiv")
        .append($(document.createElement('span')).addClass("eh_key").text(kstr))
        .append($(document.createElement('span')).addClass("eh_value").append(vobj))
        [0];
}


// create universal statuslist div
function create_statuslist()
{
    return $(document.createElement('div')).addClass("eh_statuslist")[0];
}
function statuslist_append(list, str, color)
{
    var x = $(document.createElement('div'))
        .addClass("eh_statuslist_item")
        .text(str)
        .appendTo($(list));
    if (typeof(color) != "undefined") {
        x.css("color", color);
    }
    return x[0];
}
function statuslist_appendprogress(list, str, color)
{
    var y;
    var x = $(document.createElement('div'))
        .append(y = $(document.createElement('span'))
            .addClass("eh_statuslist_firsthalf")
            .text(str)
        ).append($(document.createElement('span'))
            .html("&nbsp;...&nbsp;")
        ).append($(document.createElement('span'))
            .addClass("eh_statuslist_secondhalf")
        ).append($(document.createElement('span'))
            .addClass("eh_statuslist_additional")
        ).appendTo($(list));
    if (typeof(color) != "undefined") {
        y.css("color", color);
    }
    return x[0];
}
function statuslist_update(obj, str, color, str2, color2)
{
    var x = $($(obj).children("span")[2]).text(str);

    if (typeof(color) != "undefined") {
        x.css("color", color);
    }

    if (typeof(str2) != "undefined") {
        var x2 = $($(obj).children("span")[3]).text(str2);
        if (typeof(color2) != "undefined") {
            x2.css("color", color2);
        }
    }
}

/*
    install chrome-url data to native path
    used with trusted targetpath only
    return value is promise
*/
function install_file(url, targetpath)
{
    return new Promise( function (resolve, reject) {
        var xhr = new XMLHttpRequest();
        xhr.open("GET", url);
        xhr.responseType = "arraybuffer";
        
        xhr.onload = function (event) {
            var data = new Uint8Array(xhr.response);
            if (xhr.status >= 200 && xhr.status < 300) {
                OS.File.writeAtomic(targetpath, data)
                    .then(function () {
                        // install OK
                        resolve();
                    }, function (reason) {
                        reject("datafolder install failed, OS.File.writeAtomic failed: " + reason);
                    });
            } else {
                reject("datafolder install failed (status = " + xhr.status + "): " + url);
            }
        };

        xhr.onerror = function () {
            reject("datafolder install failed: " + url);
        };

        xhr.send();
    });
}


function get_file_ext(str)
{
    return str.split(".").pop().toLowerCase();
}

function get_basename(str)
{
    return str.split("/").pop();
}

// ======================== vector functions =================================


function sq(x) { return x * x; }
function vnew(x, y) { return { x: x, y: y }; }
function vadd(a, b) { return vnew(a.x + b.x, a.y + b.y); }
function vsub(a, b) { return vnew(a.x - b.x, a.y - b.y); }
function vdot(a, b) { return a.x * b.x + a.y * b.y; }
function vdet(a, b) { return a.x * b.y - a.y * b.x; }
function vlensq(a) { return vdot(a, a); }
function vlen(a) { return Math.sqrt(vlensq(a)); }
function vangle(a) { return Math.acos(vdot(a, b) / vlen(a) / vlen(b)); }
function distsq_p2s(p, a, b)
{
    var v1 = vsub(b, a), v2 = vsub(p, a), v3 = vsub(p, b);
    if (vdot(v1, v2) < 0) return vlensq(v2);
    else if (vdot(v1, v3) > 0) return vlensq(v3);
    else {
        if (vlensq(v1) == 0) return vlensq(v2); // check if a == b
        else return sq(vdet(v1, v2)) / vlensq(v1);
    }
}
function dist_p2s(p, a, b) { return Math.sqrt(distsq_p2s(p, a, b)); }

// ======================== showing debug messages ===========================

function do_output(str)
{
    Materialize.toast($('<div/>').text(str).html(), 10000);
    console.log(str);
}

function show_error(str)
{
    local_log("error: " + str);
    do_output("错误: " + str);
}

function show_msg(str)
{
    local_log("msg: " + str);
    do_output(str);
}

function abort(str)
{
    local_log("abort: " + str);
    msg = get_friendly_part(str);
    show_error(msg);
    throw msg;
}


function friendly_error(str)
{
    local_log("friendly_error: " + str);
    str = "错误: " + str;
    alert(str);
}

function assert(x)
{
    if (!x) {
        throw "assert failed";
    }
}



// =============== page switching related functions ======================


var current_page = "";
function go_back()
{
    local_log("[main] go back to main page");
    show_page("main");
}


function set_page_color(page_name)
{
    var lighten_class = " lighten-4";
    $("#" + page_name + "_header").addClass("blue" + lighten_class);
    $("#" + page_name + "_left").addClass("yellow" + lighten_class);
    $("#" + page_name + "_mid").addClass("white" + lighten_class);
    $("#" + page_name + "_right").addClass("black");
}

function set_page_layout(page_name, min_left_width, left_width, max_left_width, min_right_width, right_width, max_right_width)
{
    $("#" + page_name + "_left").css({
        "width": left_width,
        "min-width": min_left_width,
        "max-width": max_left_width,
    });

    $("#" + page_name + "_right").css({
        "width": right_width,
        "min-width": min_right_width,
        "max-width": max_right_width,
    });
}

function show_page_with_width(page_name, min_left_width, left_width, max_left_width, min_right_width, right_width, max_right_width)
{
    set_page_color(page_name);
    set_page_layout(page_name, min_left_width, left_width, max_left_width, min_right_width, right_width, max_right_width);
    $("#" + page_name + "_page").show();
}

function hide_all_pages()
{
    $("#about_page").hide();
    $("#login_page").hide();
    $("#main_page").hide();
    $("#calendar_page").hide();
    $("#viewfile_page").hide();
    $("#filenav_page").hide();
    $("#settings_page").hide();
}

function show_page(page_name)
{
    current_page = page_name;
    hide_all_pages();
    if (page_name == "login") {
        show_page_with_width("login", "0px", "0px", "0px", "0px", "0px", "0px");
    } else if (page_name == "main") {
        show_page_with_width("main", "0px", "0px", "0px", "0px", "0px", "0px");
    } else if (page_name == "calendar") {
        show_page_with_width("calendar", "200px", "200px", "200px", "0px", "20%", "100%");
    } else if (page_name == "viewfile") {
        show_page_with_width("viewfile", "200px", "200px", "200px", "250px", "20%", "100%");
    } else if (page_name == "filenav") {
        show_page_with_width("filenav", "0px", "0px", "0px", "0px", "0px", "0px");
    } else if (page_name == "about") {
        show_page_with_width("about", "0px", "0px", "0px", "0px", "0px", "0px");
    } else if (page_name == "settings") {
        show_page_with_width("settings", "0px", "0px", "0px", "0px", "0px", "0px");
    } else {
        abort("unknown page_name");
    }
}


/*
    the function is called when unloading whole page (i.e application exit)
    return value is promise
*/
function eh_unload()
{
    var array = new Array();
    if (current_page == "viewfile") {
        array.push(viewfile_leave());
    }
    local_log("==== exit ====");
    array.push(flush_local_log());
    return Promise.all(array);
}



































// ========== color box and thickness box related functions (in the PDF viewer)

/* colorbox */
var colorbox_boxbgcolor_selected, colorbox_boxbgcolor_hover;
var color_count = 8;

var color_selected;

var colorlist = [
    "#ff0000",
    "#00ff00",
    "#0000ff",
    "#ffff00",
    "#00ffff",
    "#ff00ff",
    "#eeeeee",
    "#000000",
];
    
function get_color(id)
{
    return colorlist[id - 1];
}


function get_color_id(str)
{
    for (var i = 0; i < colorlist.length; i++) {
        if (str == colorlist[i])
            return i + 1;
    }
    return 0;
}

function init_colorbox()
{
    colorbox_boxbgcolor_hover = "black";
    colorbox_boxbgcolor_selected = $("#viewfile_colorbox_selected_style").css("background-color");
    
    for (var i = 1; i <= color_count; i++) {
        $("#viewfile_colorbox_sample" + i).css("background-color", get_color(i));
        $("#viewfile_colorbox" + i).hover(
            function () {
                $(this).css("border-color", colorbox_boxbgcolor_hover);
            },
            function () {
                $(this).css("border-color", colorbox_boxbgcolor_selected);
            });
        
    }
    color_selected = 1;
    redraw_colorbox();
}

function redraw_colorbox()
{
    
    for (var i = 1; i <= color_count; i++) {
        if (i == color_selected) {
            $("#viewfile_colorbox" + i).css("background-color", "white");
        } else {
            $("#viewfile_colorbox" + i).css("background-color", colorbox_boxbgcolor_selected);
        }
        $("#viewfile_colorbox" + i).css("border-color", colorbox_boxbgcolor_selected);
    }
}

function select_color(id, shouldcallback)
{
    if (id < 1 || id > colorlist.length) return;
    local_log("[pdfviewer] select color (id = " + id.toString() + ", type = " + get_color(id) + ")");
    color_selected = id;
    redraw_colorbox();
    $("#viewfile_colorbox" + id).css("border-color", colorbox_boxbgcolor_hover);

    var scb = true;
    if (typeof shouldcallback != "undefined") scb = shouldcallback;
    if (scb) canvas_ct_changed_callback();
}

/* thicknessbox */
var thicknessbox_boxbgcolor_selected, thicknessbox_boxbgcolor_hover;
var thickness_count = 4;

var thickness_selected;

var thicknesslist = [
        "1px",
        "3px",
        "5px",
        "7px",
    ];

function get_thickness(id)
{
    return thicknesslist[id - 1];
}

function get_thickness_id(str)
{
    for (var i = 0; i < thicknesslist.length; i++) {
        if (str == thicknesslist[i])
            return i + 1;
    }
    return 0;
}

function init_thicknessbox()
{
    thicknessbox_boxbgcolor_hover = "black";
    thicknessbox_boxbgcolor_selected = $("#viewfile_thicknessbox_selected_style").css("background-color");
    
    for (var i = 1; i <= thickness_count; i++) {
        $("#viewfile_thicknessbox_sample" + i).css("height", get_thickness(i));
        $("#viewfile_thicknessbox" + i).hover(
            function () {
                $(this).css("border-color", thicknessbox_boxbgcolor_hover);


            },
            function () {
                $(this).css("border-color", thicknessbox_boxbgcolor_selected);
            });
        
    }
    thickness_selected = 2;
    redraw_thicknessbox();
}

function redraw_thicknessbox()
{
    
    for (var i = 1; i <= thickness_count; i++) {
        if (i == thickness_selected) {
            $("#viewfile_thicknessbox" + i).css("background-color", "white");
        } else {
            $("#viewfile_thicknessbox" + i).css("background-color", thicknessbox_boxbgcolor_selected);
        }
        $("#viewfile_thicknessbox" + i).css("border-color", thicknessbox_boxbgcolor_selected);
    }
}

function select_thickness(id, shouldcallback)
{
    if (id < 1 || id > thicknesslist.length) return;
    local_log("[pdfviewer] select thickness (id = " + id.toString() + ", type = " + get_thickness(id) + ")");
    
    thickness_selected = id;
    redraw_thicknessbox();
    $("#viewfile_thicknessbox" + id).css("border-color", thicknessbox_boxbgcolor_hover);
    
    var scb = true;
    if (typeof shouldcallback != "undefined") scb = shouldcallback;
    if (scb) canvas_ct_changed_callback();
}















// ============= dtype selector ===========
var dtype_selected;
function is_dtype_drawtype(id) { return id >= 3; }
function get_dtype(id)
{
    var l = [
        //"navigate",
        "select",
        "eraser",
        "rect",
        "ellipse",
        "line",
        "pen",
    ];
    return l[id - 1];
}
function select_dtype(id)
{
    local_log("[pdfviewer] select dtype (id = " + id.toString() + ", type = " + get_dtype(id) + ")");
    dtype_selected = id;
    $(
        $("#viewfile_dtypelist").children("a")
            .removeClass("lighten-1")
            .addClass("darken-3")
        [id - 1]
    ).removeClass("darken-3").addClass("lighten-1");

    canvas_clearselection();

    
    if (is_dtype_drawtype(id)) {
        $("#viewfile_dtoolbox").show();
    } else {
        $("#viewfile_dtoolbox").hide();
    }
}

function reset_dtype()
{
    select_dtype(1);
}






// ============= drawing related functions  (in the PDF viewer) ==========

var is_mousedown = false;
var is_painting = false;
var canvas_offset; // x: left, y: top
var canvas_size; // x: width, y: height

var drawlist; /* currently drawn objects
    {
        type: string, "ellipse", "rect", "line", "pen"
        data: array of mouse pointer route, normalized
            {
                x: left, normalized value in [0, 1]
                y: top, normalized value in [0, 1]

                (0,0)
                *---------->(1,0)
                |
                |
                v(0,1)
            }
        thickness: string
        color: string
        linedash: array of int, see CanvasRenderingContext2D.setLineDash()
        linecap: string, see CanvasRenderingContext2D.lineCap
        linejoin: string, see CanvasRenderingContext2D.lineJoin
    }
*/

var tmp_dobj; // current drawing object
var tmp_lastdraw; // index of last draw coord, for redraw_single()
var lastdraw; // index of last drawn object + 1, for redraw()


var did_selected = -1; // id of selected dobj, -1 if none selected


// ccoord: canvas coord is related to left, top corner, in px
// ncoord: normalzed coord is related to left, top corner, range: [0, 1]
// mcoord: mcoord coord is related to window, in px

function canvas_c2n(c) { return { x: c.x / canvas_size.x, y: c.y / canvas_size.y }; }
function canvas_n2c(n) { return { x: Math.floor(n.x * canvas_size.x + 0.5) + 0.5, y: Math.floor(n.y * canvas_size.y + 0.5) + 0.5 }; }
function canvas_m2c(m) { return { x: m.x - canvas_offset.x, y: m.y - canvas_offset.y }; }

// add new mouse coord to tmp_dobj
function canvas_addmousedata(mcoord)
{
    var ccoord = canvas_m2c(mcoord);
    var ncoord = canvas_c2n(ccoord);
    
    tmp_dobj.data.push(ncoord);

    var tmpctx = document.getElementById("pdf_page_temp").getContext("2d");
    tmp_lastdraw = canvas_redraw_single(tmpctx, tmp_dobj, tmp_lastdraw);
}

// remove unused data from dobj
function canvas_shrink_dobj(dobj)
{
    if (dobj.type != "pen") {
        if (dobj.data.length > 2) {
            dobj.data = [dobj.data[0], dobj.data[dobj.data.length - 1]];
        }
    }
}



function canvas_redraw_single(ctx, dobj, startfrom)
{
    var data = dobj.data;
    if (data.length < 2) { return 0; }

    var ret = 0;
    ctx.strokeStyle = dobj.color;
    ctx.lineWidth = parseInt(dobj.thickness);

    var st = typeof(startfrom) != "undefined" ? startfrom : 0;

    if (st == -1) {
        canvas_clearcontext(ctx);
        st = 0;
    }

    ctx.lineCap = dobj.linecap;
    ctx.lineJoin = dobj.linejoin;
    ctx.setLineDash(dobj.linedash);
    
    if (dobj.type == "pen") {
        ctx.beginPath();
        var lc = canvas_n2c(data[st]);
        for (var i = st + 1; i < data.length; i++) {
            var c = canvas_n2c(data[i]);
            ctx.moveTo(lc.x, lc.y);
            ctx.lineTo(c.x, c.y);
            lc = c;
        }
        ctx.closePath();
        
        ret = data.length - 1;
    } else if (dobj.type == "rect") {
        var lt = canvas_n2c(data[0]);
        var rb = canvas_n2c(data[data.length - 1]);
        ctx.beginPath();
        ctx.rect(lt.x, lt.y, rb.x - lt.x, rb.y - lt.y);
        ctx.closePath();
        ret = -1;
    } else if (dobj.type == "line") {
        var lt = canvas_n2c(data[0]);
        var rb = canvas_n2c(data[data.length - 1]);
        ctx.beginPath();
        ctx.moveTo(lt.x, lt.y);
        ctx.lineTo(rb.x, rb.y);
        ctx.closePath();
        ret = -1;
    } else if (dobj.type == "ellipse") {
        var lt = canvas_n2c(data[0]);


        var rb = canvas_n2c(data[data.length - 1]);
        ctx.beginPath();
        ctx.save();
        ctx.translate(lt.x, lt.y);
        ctx.scale(rb.x - lt.x, rb.y - lt.y);
        ctx.arc(0.5, 0.5, 0.5, 0, 2 * Math.PI, false);
        ctx.restore();
        ctx.closePath();
        ret = -1;
    }
    ctx.stroke();
    return ret;
}

// redraw drawlist
function canvas_redraw(startfrom)
{
    if (drawlist) {
        refresh_canvas_parameters();
                    
        var st = typeof(startfrom) != "undefined" ? startfrom : 0;
        var canvas = document.getElementById("pdf_page_draw");
        if (st == 0) {
            canvas_clearcanvas(canvas);
            canvas_clearsingle('pdf_page_draw');
            canvas_clearsingle('pdf_page_temp');
        }
        var ctx = canvas.getContext("2d");
        for (var i = st; i < drawlist.length; i++) {
            canvas_redraw_single(ctx, drawlist[i]);
        }
        return drawlist.length;
    }
}

// create a new dobj
function new_dobj(type, color, thickness)
{
    return {
        type: type,
        thickness: thickness,
        color: color,
        data: [],
        linedash: [],
        linecap: "round",
        linejoin: "round",
    };
}

// clear canvas
function canvas_clearcontext(context) { context.clearRect(0, 0, context.canvas.width, context.canvas.height); }
function canvas_clearcanvas(canvas) { canvas_clearcontext(canvas.getContext("2d")); }
function canvas_clearsingle(idstr) { canvas_clearcanvas(document.getElementById(idstr)); }


function new_canvas_data()
{
    return { drawlist: new Array() };
}

// clear canvas
function canvas_clearpage()
{
    drawlist = new Array();
    lastdraw = 0;
    canvas_clearselection();
    canvas_clearsingle('pdf_page_draw');
    canvas_clearsingle('pdf_page_temp');
}

// called when loading a new page
function canvas_loaddata(data)
{
    drawlist = data.drawlist;
    lastdraw = 0;
    canvas_clearselection();
    canvas_clearsingle('pdf_page_draw');
    canvas_clearsingle('pdf_page_temp');
    canvas_redraw();
}



/* return distance (screen distance) to object */
function canvas_distance2object(dobj, ccoord)
{
    if (dobj.data.length == 1) {
        return vlen(vsub(canvas_n2c(dobj.data[0]), ccoord));
    }

    if (dobj.type == "line") {
        return dist_p2s(ccoord, canvas_n2c(dobj.data[0]), canvas_n2c(dobj.data[dobj.data.length - 1]));
    } else if (dobj.type == "rect") {
        var a = canvas_n2c(dobj.data[0]);
        var b = canvas_n2c(dobj.data[dobj.data.length - 1]);
        return Math.min(
            dist_p2s(ccoord, a, vnew(a.x, b.y)),
            dist_p2s(ccoord, a, vnew(b.x, a.y)),
            dist_p2s(ccoord, b, vnew(a.x, b.y)),
            dist_p2s(ccoord, b, vnew(b.x, a.y)));
    } else if (dobj.type == "pen") {
        var dist = Infinity;
        for (i = 1; i < dobj.data.length; i++) {
            var a = canvas_n2c(dobj.data[i - 1]);
            var b = canvas_n2c(dobj.data[i]);
            dist = Math.min(dist, dist_p2s(ccoord, a, b));
        }
        return dist;
    } else if (dobj.type == "ellipse") {
        var dist = Infinity;
        var samples = 360; // brute-force
        var p1 = canvas_n2c(dobj.data[0]);
        var p2 = canvas_n2c(dobj.data[dobj.data.length - 1]);
        var o = vnew((p1.x + p2.x) / 2, (p1.y + p2.y) / 2);
        var a = (p1.x - p2.x) / 2;
        var b = (p1.y - p2.y) / 2;
        for (var i = 0; i < samples; i++) {
            var deg = 2 * Math.PI * i / samples;
            var p = vadd(o, vnew(a * Math.sin(deg), b * Math.cos(deg)));
            dist = Math.min(dist, vlen(vsub(ccoord, p)));
        }
        return dist;
    }

    return Infinity;
}

/*  return id of the nearest object by mouse position
    return -1 if none should be selected
    note: we MUSE use CCOORD
*/
function canvas_selectobject(ccoord, limit)
{
    if (limit === undefined) limit = Infinity;
    var ret = -1;
    var mindist = Infinity;
    for (var i = 0; i < drawlist.length; i++) {
        if (drawlist[i].data.length > 0) {
            var dist = canvas_distance2object(drawlist[i], ccoord);
            if (dist < mindist) {
                mindist = dist;
                ret = i;
            }
        }
    }
    if (mindist > limit) return -1;
    else return ret;
}

function canvas_removeselected()
{
    if (did_selected < 0) return;
    local_log("[draw] remove object (id = " + did_selected + ")");
    drawlist.splice(did_selected, 1);
    canvas_clearselection();
    lastdraw = 0;
}

function canvas_clearselection()
{
    if (did_selected >= 0) {
        $("#viewfile_dtoolbox").hide();
        did_selected = -1;
        canvas_redraw();
    }
    $("#viewfile_deditbox").hide();
}

/* select object by mouse */
function canvas_mouseselect(mcoord, limit, change_did_only)
{
    var ccoord = canvas_m2c(mcoord);
    var ncoord = canvas_c2n(ccoord);

    var did = canvas_selectobject(ccoord, limit);
    if (did < 0) {
        canvas_clearselection();
        return;
    }

    did_selected = did;

    if (!change_did_only) {
        local_log("[draw] select object (id = " + did_selected + ")");

        console.log(drawlist[did]);
        
        canvas_redrawselected();

        select_color(get_color_id(drawlist[did_selected].color), false);
        select_thickness(get_thickness_id(drawlist[did_selected].thickness), false);
        
        $("#viewfile_dtoolbox").show();
        $("#viewfile_deditbox").show();
    }
}

function canvas_redrawselected()
{
    if (did_selected < 0) return;
    var dobj = drawlist[did_selected];

    var maxx = 0, maxy = 0;
    var minx = 1, miny = 1;
    for (var i = 0; i < dobj.data.length; i++) {
        maxx = Math.max(maxx, dobj.data[i].x);
        maxy = Math.max(maxy, dobj.data[i].y);
        minx = Math.min(minx, dobj.data[i].x);
        miny = Math.min(miny, dobj.data[i].y);
    }
    
    tmp_dobj = new_dobj("rect", "#777777", "7px");
    tmp_dobj.linedash = [30, 30];
    tmp_dobj.linecap = "butt";
    tmp_dobj.linejoin = "miter";
    tmp_dobj.data = [{x: minx, y: miny}, {x: maxx, y: maxy}];

//    var viewcanvas = document.getElementById("pdf_page_view");
//    var drawcanvas = document.getElementById("pdf_page_draw");
    var tmpctx = document.getElementById("pdf_page_temp").getContext("2d");
    
//    tmpctx.drawImage(viewcanvas, 0, 0);
//    tmpctx.drawImage(drawcanvas, 0, 0);    
//    tmpctx.globalCompositeOperation = "difference";
    canvas_redraw_single(tmpctx, tmp_dobj, -1);
//    tmpctx.globalCompositeOperation = "source-over";
}

// the function is called when 'color_selected' / 'thickness_selected' changed
function canvas_ct_changed_callback()
{
    if (did_selected < 0) return;
    drawlist[did_selected].color = get_color(color_selected);
    drawlist[did_selected].thickness = get_thickness(thickness_selected);
    canvas_redraw();
    canvas_redrawselected();
}


function refresh_canvas_parameters()
{
    // get canvas offset
    var off = $("#pdf_page_temp").offset();
    canvas_offset = { x: off.left, y: off.top };

    // get canvas size
    var canvas = document.getElementById('pdf_page_temp');
    canvas_size = { x: canvas.width, y: canvas.height };
}

function init_canvas()
{
    var check_and_do_eraser_func = function (e) {
        var dtype = get_dtype(dtype_selected);
        if (dtype == "eraser") {
            e.preventDefault();
            refresh_canvas_parameters();
            var mcoord = { x: e.pageX, y: e.pageY };
            canvas_mouseselect(mcoord, 5, true);
            canvas_removeselected();
        }
    };
    $('#pdf_page_front').keypress( function (e) {
        console.log("KEYPRESS", e);
        var f = 0;
        switch (e.keyCode) {
            case 40: case 39: case 34: f = 1; break;
            case 38: case 37: case 33: f = -1; break;
            case 0:
                switch (e.charCode) {
                    case 32: f = 1; break;
                }
                break;
        }
        if (f != 0) {
            local_log("[pdfviewer] switch page by keyboard (keyCode = " + e.keyCode + ", charCode = " + e.charCode + ", f = " + f + ")");
            show_pdf_switchpage(f);
        }
    });
    $('#pdf_page_front').mousedown( function (e) {
        is_mousedown = true;
        check_and_do_eraser_func(e);
        
        if (!is_dtype_drawtype(dtype_selected)) return;
        var dtype = get_dtype(dtype_selected);
        e.preventDefault();
        
        refresh_canvas_parameters();

        is_painting = true;

        local_log("[draw] drawing mousedown (" + dtype + ", " + get_color(color_selected) + ", " + get_thickness(thickness_selected) + ")");
        tmp_lastdraw = -1;

        tmp_dobj = new_dobj(dtype, get_color(color_selected), get_thickness(thickness_selected));
        var mcoord = { x: e.pageX, y: e.pageY };
        canvas_addmousedata(mcoord);
    });
    $('#pdf_page_front').click( function (e) {
        var dtype = get_dtype(dtype_selected);
        local_log("[draw] click (dtype = " + dtype + ")");
        if (dtype == "navigate") {
            show_pdf_switchpage(1);
        } else if (dtype == "select") {
            refresh_canvas_parameters();
            var mcoord = { x: e.pageX, y: e.pageY };
            canvas_mouseselect(mcoord, 50);
        }
        e.preventDefault();
    });
    $(document).mousemove( function (e) {
        if (is_painting) {
            var mcoord = { x: e.pageX, y: e.pageY };
            canvas_addmousedata(mcoord);
        } else if (is_mousedown) {
            check_and_do_eraser_func(e);
        }
    });
    $(document).mouseup( function (e) {
        is_mousedown = false;
        if (is_painting) {
            canvas_clearsingle('pdf_page_temp');
            canvas_shrink_dobj(tmp_dobj);
            drawlist.push(tmp_dobj);
            local_log("[draw] drawing mouseup (id = " + (drawlist.length - 1).toString() + ")");
            lastdraw = canvas_redraw(lastdraw);
        }
        is_painting = false;
    });

    // scroll detection: https://developer.mozilla.org/en-US/Add-ons/Code_snippets/Miscellaneous
    document.getElementById("pdf_page_front").addEventListener("DOMMouseScroll", function (e) {
        var x = e.detail; // scroll value
        local_log("[pdfviewer] mouse scroll event (lines = " + x + ")");
        if (x > 0) {
            show_pdf_switchpage(1);
        } else if (x < 0) {
            show_pdf_switchpage(-1);
        }
    }, false);
}























// ====================== the global init function ======================

/*
    create necessory dirs used by elearning helper
    must be called:
        AFTER docfolder and datafolder is created
        BEFORE any other function that use dirs
*/
function initp_createdirs()
{
    var p = new Array();
    p.push(OS.File.makeDir(OS.Path.join(datafolder, "tools"), { ignoreExisting: true, from: datafolder }));
    p.push(OS.File.makeDir(OS.Path.join(datafolder, "elearningicons"), { ignoreExisting: true, from: datafolder }));
    p.push(OS.File.makeDir(OS.Path.join(ndbfolder, "syncdata"), { ignoreExisting: true, from: ndocfolder }));
    return Promise.all(p);
}

function initp_tools()
{
    var p = new Array();

    ppt2pdf_path = OS.Path.join(datafolder, "tools", "ppt2pdf.vbs");
    p.push(install_file("ppt2pdf.vbs", ppt2pdf_path));
    p.push(install_file("ehdb_readme.txt", OS.Path.join(ndbfolder, "README.txt")));

    return Promise.all(p);
}

/*
    set other folder vars using 'ndocfolder'
*/
function initp_docfolder()
{
    // set other folders
    docfolder = OS.Path.toFileURI(ndocfolder);
    ndbfolder = OS.Path.join(ndocfolder, "ehdb");
    dbfolder = OS.Path.toFileURI(ndbfolder);

    eh_logfile = OS.Path.join(ndbfolder, "ehlog.txt");

    return Promise.all([
        OS.File.makeDir(ndocfolder, { ignoreExisting: true }),
        OS.File.makeDir(datafolder, { ignoreExisting: true, from: OS.Constants.Path.profileDir })
    ]);
}

function init_style()
{
    // add some style rules
    $.fx.off = true;
    
    if (eh_os == "WINNT") {
        /* fix button for Windows */
        $("<style type='text/css'> .btn i { padding-top: 2px !important; } </style>").appendTo("head");
    }
}

$("document").ready( function () {

    prefs = window.parent.prefs;
    OS = window.parent.OS;
    Services = window.parent.Services;
    eh_version = window.parent.xulappinfo.version;
    eh_os = window.parent.xulruntime.OS;
    
    load_prefs();

    if (eh_debug) {
        var str = "";
        str += "调试模式已打开\n";
        str += "v" + eh_version + " with Gecko " + window.parent.xulappinfo.platformVersion + " on " + eh_os + "\n";
        if (eh_dbglocallog) {
            str += "日志模式已打开，您的操作将会被记录到本地文件中\n";
            str += "但您的隐私信息（例如密码）并不会被记录\n";
        }
        $("#dbgwarningbox").text(str).show();
    } else {
        $("#dbgwarningbox").hide();
    }

    $("#main_coursetable_switchbtn").hide();


    // configure datafolder first

    datafolder = get_unicode_pref(prefs, "datafolder");
    if (datafolder == "") {
        datafolder = OS.Path.join(OS.Constants.Path.profileDir, "ehdata");
        set_unicode_pref(prefs, "datafolder", datafolder);
    }

    // use promise to configure docfolder
    new Promise( function (resolve, reject) {
        ndocfolder = get_unicode_pref(prefs, "docfolder");
        if (ndocfolder == "") {
            var basearr = [
                OS.Path.join(OS.Constants.Path.homeDir, "Documents"),
                OS.Path.join(OS.Constants.Path.homeDir, "My Documents"),
                OS.Path.join(OS.Constants.Path.homeDir, "文档"),
                OS.Constants.Path.desktopDir];
            Promise.all(basearr.map( function (base) { return OS.File.exists(base); })).then( function (fearr) {
                console.log(basearr, fearr);
                for (var i = 0; i < fearr.length; i++) {
                    if (fearr[i]) {
                        ndocfolder = OS.Path.join(basearr[i], "eLearning Helper");
                        set_unicode_pref(prefs, "docfolder", ndocfolder);
                        resolve();
                        return;
                    }
                }
                reject("can't find suitable docfolder");
            }, function (reason) {
                reject("OS.File.exists failed: " + reason);
            });
        } else {
            resolve();
        }
    }).then( function () {
        initp_docfolder().then( function () {
            init_colorbox();
            init_thicknessbox();
            reset_dtype();
            init_canvas();
            init_notebox();
            init_style();

            initp_createdirs().then( function () {
                // initp_* returns promises
                Promise.all([
                    initp_elearning_icon(),
                    initp_tools(),
                    initp_about()
                ]).then ( function () {

                    // read some configs
                    load_user_coursemap();
                    load_sitepathmap();
                    
                    $("#splashdiv").hide();
                    local_log("========= init ok ==========");
                    local_log("appversion: " + eh_version);
                    local_log("ostype: " + eh_os);
                    local_log("osname: " + window.parent.sysinfo.getProperty("name"));
                    local_log("osversion: " + window.parent.sysinfo.getProperty("version"));
                    local_log("arch: " + window.parent.sysinfo.getProperty("arch"));
        
                    if (el_username == "" || el_password == "" || !el_rememberme) {
                        init_login_page();
                    } else {
                        init_main_page(); // load course table
                    }
                });
            });
        });
    });
});













// ====================== notebox related functions ======================
var notebox_data;

function notebox_execcmd(arg1, arg2, arg3)
{
    local_log("[notebox] exec command (arg1 = " + arg1 + ", arg2 = " + arg2 + ", arg3 = " + arg3 + ")");
    document.execCommand(arg1, arg2, arg3);
}

function new_notebox_data()
{
    return { html: "" };
}

function load_notebox_data(data)
{
    notebox_data = data;
    window.getSelection().removeAllRanges();
    $("#viewfile_notebox").blur().scrollTop(0).html(notebox_data.html);
}

function save_notebox_data()
{
    if (notebox_data) {
        notebox_data.html = $("#viewfile_notebox").html();
    }
}

function clear_notebox()
{
     $("#viewfile_notebox").empty();
}

function init_notebox()
{
    // make paste become plain paste
    // ref: http://stackoverflow.com/questions/12027137/javascript-trick-for-paste-as-plain-text-in-execcommand
    /*document.getElementById('viewfile_notebox').addEventListener("paste", function (e) {
        e.preventDefault();
        if (e.clipboardData) {
            content = (e.originalEvent || e).clipboardData.getData('text/plain');
            document.execCommand('insertText', false, content);
        } else if (window.clipboardData) {
            content = window.clipboardData.getData('Text');
            document.selection.createRange().pasteHTML(content);
        }  
    });*/
    $("#viewfile_notebox").focusout( function () {
        $("#pdf_page_front").attr("tabindex", 0);
    });
    $("#viewfile_notebox").focusin( function () {
        $("#pdf_page_front").attr("tabindex", -1);
    });
    document.getElementById('viewfile_notebox').addEventListener("input", function () {
        local_log("[notebox] input event, notebox data length = " + $("#viewfile_notebox").html().length);
        save_notebox_data();
    }, false);

}








// ====================== PDF related functions =======================

var pdf_thumbnail_div_list;
var selected_pdf_page;
var pdf_note_data;
var pdf_file_task_id = 0; // task id for loading a pdf file


var pdf_page_loading_task_id = 0; // previous task id

var pdf_page_loading_status = {
    page_id: -1, // the page now rendering
    task_id: 0, // unique task id, increased when creating a new task
    rtask: undefined // rtask: current render task
};


/*
    is called when leaving fileview page
    return value is promise
    dynamicly generated in pdfviewer_show


*/
var viewfile_leave;

/*
    save current notes
    function is dynamicly generated in init_pdf
*/
var save_pdf_notes;


/*
    initialize pdf viewer

    pdf_path: url of pdf file

*/
function init_pdf(pdf_path)
{
    var cur_task_id = ++pdf_file_task_id;
    $('#pdf_page_list').empty();
    clear_notebox();
    canvas_clearsingle("pdf_page_view");
    reset_dtype();
    return new Promise(function (resolve, reject) {

        local_log("[pdfviewer] open document (path = " + pdf_path + ")");

        var ndata_path = pdf_path + ".ehnotes";

        // generate save_pdf_notes() function
        save_pdf_notes = function () {
            return write_json_to_fileuri({ notedata: pdf_note_data }, ndata_path);
        };
        
        // load pdf_note_data first
        new Promise(function (resolve, reject) {
            read_json_from_fileuri(ndata_path).then( function (obj) {
                pdf_note_data = obj.notedata;
                if (pdf_note_data === undefined) pdf_note_data = {};
                resolve();
            }, function () {
                pdf_note_data = {};
                resolve();
            });
        }).then( function () {
            // this function is call when user enters "viewfile" page
            PDFJS.getDocument(pdf_path).then( function (pdf) {
                if (pdf_file_task_id != cur_task_id) { resolve(); return; }
                //show_pdf_jumpto(pdf, 1);

                show_pdf_switchpage = function (delta) {
                    local_log("[pdfviewer] switch page (delta = " + delta.toString() + ")");
                    if (selected_pdf_page + delta < 1 || selected_pdf_page + delta > pdf.numPages) return;
                    show_pdf_jumpto(pdf, selected_pdf_page + delta);
                    pdf_thumbnail_div_list[selected_pdf_page].scrollIntoView();
                };

                if (pdf.numPages > page_limit) {
                    reject("####文件页数过多，无法打开####");
                    return;
                }
                
                pdf_thumbnail_div_list = new Array();
                selected_pdf_page = 1;

                var canvasarray = new Array();
                for (var i = 1; i <= pdf.numPages; i++) {
                    // append an canvas to our thumbnail list

                    let cur_canvas = canvasarray[i] = document.createElement('canvas');

                    let page_id = i;
                    
                    $(pdf_thumbnail_div_list[i] = document.createElement('div'))
                        .addClass('eh_pdf_list_item')
                        .append($(document.createElement('span'))
                                    .html(i.toString())
                               )
                        .append($(document.createElement('div'))
                                    .addClass("eh_flexbox_fill_remaining_wrapper_lr")
                                    .append($(cur_canvas))
                               )
                        .click( function (event) {
                                    show_pdf_jumpto(pdf, page_id);
                                }
                              )
                        .appendTo('#pdf_page_list');
                }

                var preset_canvas_size_flag = false;
                var preset_canvas_size = function (width, height) {
                    var arr = new Array();
                    for (var i = 1; i <= pdf.numPages; i++) {
                        var cur_canvas = canvasarray[i];
                        var cur_canvas_width = cur_canvas.offsetWidth - 2;
                        var scale = cur_canvas_width / width;
                        arr[i] = { w: cur_canvas_width, h: height * scale };
                        // shouldn't update canvas size here
                        // or we will cause a css-recalc
                        // then cur_canvas.offsetWidth will be very slow
                    }
                    for (var i = 1; i <= pdf.numPages; i++) {
                        var cur_canvas = canvasarray[i];
                        cur_canvas.width = arr[i].w;
                        cur_canvas.height = arr[i].h;
                    }
                };
                
                var load_thumbnail = function (page_id) {
                    return new Promise( function (resolve, reject) {
                        if (pdf_file_task_id != cur_task_id) { resolve(); return; }
                        pdf.getPage(page_id).then( function (page) {
                            if (pdf_file_task_id != cur_task_id) { resolve(); return; }
                            var scale = 1.0;
                            var viewport = page.getViewport(scale);
                            var cur_canvas = canvasarray[page_id];
                            var cur_canvas_width = parseInt($(cur_canvas).css("width")) - 2;

                            if (!preset_canvas_size_flag) {
                                preset_canvas_size(viewport.width, viewport.height);
                                preset_canvas_size_flag = true;
                            }
                            
                            scale = cur_canvas_width / viewport.width;
                            viewport = page.getViewport(scale);

                            // Prepare canvas using PDF page dimensions.
                            var canvas = cur_canvas;
                            var context = canvas.getContext('2d');
                            canvas.height = viewport.height;
                            canvas.width = viewport.width;

                            // Render PDF page into canvas context.
                            var renderContext = {
                                canvasContext: context,
                                viewport: viewport
                            };
                            
                            page.render(renderContext).then( function () {
                                resolve();
                            });
                        });
                    });
                };

                var load_thumbnail_all = function (cur) {
                    if (pdf_file_task_id != cur_task_id) { return; }
                    if (cur <= pdf.numPages) {
                        load_thumbnail(cur).then( function () {
                            load_thumbnail_all(cur + 1);
                        });
                    } else {
                        local_log("[pdfviewer] open finished (path = " + pdf_path + ")");
                    }
                }
                
                show_pdf_jumpto(pdf, 1).then( function () {
                    load_thumbnail_all(1);
                });

                $('#pdf_page_list').scrollTop(0);
                resolve();
            }, function (reason) {
                reject("####无法打开 PDF 文件####can't open pdf: " + reason);
            });
        });
    });
}



/*
    switch pdf page ( current += delta )
    the function is dynamicly generated in init_pdf()
    usage:
        show_pdf_switchpage(delta)
*/
var show_pdf_switchpage;

/*
    jump to a pdf page

    WARNING: return promise MAY resolve before finish loading page
             when there are multiple jumpto requests with same page_id
    pdf: the loaded pdf object
    page_id: target page id, start from 1
    
*/
function show_pdf_jumpto(pdf, page_id)
{
    local_log("[pdfviewer] jump to page (page_id = " + page_id.toString() + ")");

    /* task status machine
        FINISHED       ->    STAGE 1       ->    STAGE 2     ->   FINISHED
        task_id = a         task_id = a+1      task_id = a+1     task_id = a+1
        page_id = -1        page_id = p2       page_id = p2      page_id = -1
        rtask = undefined   rtask = undefined  rtask = taskobj   rtask = undefined
    */

    var cur_task_id = ++pdf_page_loading_task_id;
    $("#pdf_page_front").attr("tabindex", 0).focus();
    return Promise.all([
        new Promise( function (resolve, reject) {
            if (pdf_page_loading_status.page_id == page_id) {
                // loading same page, just resolve this promise now
                // note: this will cause promise resolved BEFORE render finish
                resolve();
                return;
            }
            if (pdf_page_loading_status.page_id != -1 && pdf_page_loading_status.rtask !== undefined) {
                // another page is in stage2, cancel it
                local_log("[pdfviewer] cancel previous render task (last = " + pdf_page_loading_status.page_id + ")");
                pdf_page_loading_status.rtask.cancel();
            }
            // set new task status
            pdf_page_loading_status.task_id = cur_task_id;
            pdf_page_loading_status.page_id = page_id;
            pdf_page_loading_status.rtask = undefined;

            // start stage 1
            $(pdf_thumbnail_div_list[selected_pdf_page]).removeClass("eh_selected");
            $(pdf_thumbnail_div_list[selected_pdf_page = page_id]).addClass("eh_selected");


            if (typeof pdf_note_data[page_id.toString()] === "undefined") {
                pdf_note_data[page_id.toString()] = {
                    draw: new_canvas_data(),
                    note: new_notebox_data(),
                };
            }
            var ndata = pdf_note_data[page_id.toString()];
            load_notebox_data(ndata.note);

            pdf.getPage(page_id).then(function (page) {
                // start stage 2
                // check if we should continue
                if (pdf_page_loading_status.task_id != cur_task_id) {
                    // task has canceled
                    resolve();
                    return;
                }
                
                var space_ratio = 0.03;
                
                var scale = 1.0;
                var viewport = page.getViewport(scale);
                var wrapper_width = Math.floor(parseInt($("#pdf_page_view_wrapper").css("width")) * (1.0 - space_ratio));
                var wrapper_height = Math.floor(parseInt($("#pdf_page_view_wrapper").css("height")) * (1.0 - space_ratio));
                
                scale = Math.min(wrapper_width / viewport.width, wrapper_height / viewport.height);
                //show_msg(scale);
                viewport = page.getViewport(scale);

                // Prepare canvas using PDF page dimensions.

                var canvasdraw = document.getElementById('pdf_page_draw');
                var canvastemp = document.getElementById('pdf_page_temp');
                var canvas = document.getElementById('pdf_page_view');
                var context = canvas.getContext('2d');
                canvasdraw.height = canvastemp.height = canvas.height = viewport.height;
                canvasdraw.width = canvastemp.width = canvas.width = viewport.width;
                
                // Render PDF page into canvas context.
                var renderContext = {
                    canvasContext: context,
                    viewport: viewport
                };
                
                // set status to stage 2
                pdf_page_loading_status.rtask = page.render(renderContext);
                pdf_page_loading_status.rtask.then( function () {
                    if (pdf_page_loading_status.task_id == cur_task_id) {
                        // check again for sure
                        // we must load canvas data until page render complete
                        canvas_loaddata(ndata.draw);
                        // set render status to no task
                        pdf_page_loading_status.page_id = -1;
                        pdf_page_loading_status.rtask = undefined;
                    }
                    resolve();
                }, function (reason) {
                    // may be canceled, so just resolve
                    resolve();
                });
            });
        }),
        save_pdf_notes()
    ]);
}


/*
    function is called when go back to filenav
*/
function pdfviewer_cleanup()
{
    pdf_file_task_id++; // increase task id to cancel current task
    $('#pdf_page_list').empty();
    canvas_clearsingle("pdf_page_view");
    canvas_clearpage();
}

/*
    switch to pdf viewer and load file

    fitem: see webdav_listall()
*/

function pdfviewer_show(fitem, coursefolder)
{
    return new Promise( function (resolve, reject) {
        new Promise( function (resolve, reject) {
            var fileuri = docfolder + coursefolder + fitem.path;
            var fileext = get_file_ext(fileuri);
            
            if (fileext == "pdf") {
                // this file is already PDF, no need to convert
                resolve(fileuri);
            } else {
                // this file is not PDF, should convert to PDF
                if (eh_os == "WINNT" && (fileext == "ppt" || fileext == "pptx")) { // FIXME: Windows Only Code

                    var pdfuri = fileuri + ".pdf";
                    var pdfpath = OS.Path.fromFileURI(pdfuri);

                    OS.File.stat(pdfpath).then( function (info) {
                        // pdf file exists, no need to convert
                        local_log("[pdfviewer] PPT2PDF using old pdf");
                        resolve(pdfuri);
                    }, function (reason) {
                        if (reason instanceof OS.File.Error && reason.becauseNoSuchFile) {
                            // pdf file not exists, we need convert
                            // start ppt2pdf.vbs to convert
                            local_log("[pdfviewer] PPT2PDF convert start");
                            var file = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces["nsILocalFile"]);
                            var cscript = OS.Path.join(Components.classes["@mozilla.org/process/environment;1"].getService(Components.interfaces.nsIEnvironment).get("SystemRoot"), "system32", "cscript.exe");
                            file.initWithPath(cscript);
                            var process = Components.classes["@mozilla.org/process/util;1"].createInstance(Components.interfaces.nsIProcess);
                            process.init(file);
                            // process.runw() will crash if argv[] has undefined value in it
                            process.runw(true, ["//Nologo", ppt2pdf_path, OS.Path.fromFileURI(fileuri), pdfpath], 4);
                            // FIXME: check if we have successfully converted
                            local_log("[pdfviewer] PPT2PDF convert OK");
                            resolve(pdfuri);
                        } else {
                            // other error
                            reject("unknown stat() error: " + reason);
                        }
                    });
                } else {
                    reject("####不支持该文件格式####");
                }
            }
        }).then( function (pdfuri) {
            $("#viewfile_filetitle").text(fitem.filename);

            // register back button click function
            $("#viewfile_backbtn").unbind("click");
            $("#viewfile_backbtn").click( function () {
                local_log("[pdfviewer] go back to filenav page");
                pdfviewer_cleanup();
                save_pdf_notes().then( function () {
                    show_page("filenav");
                });
            });
            viewfile_leave = function () {
                return save_pdf_notes();
            };
            show_page("viewfile");
            canvas_clearpage();
            init_pdf(pdfuri).then( function () {
                resolve();
            }, function (reason) {
                reject("init_pdf failed: " + reason);
            });
        }, function (reason) {
            reject(reason);
        });
    });
}


/*
    check if file type is supported
*/
function pdfviewer_issupported(fitem)
{
    if (!usebuiltinviewer) return false;
    var fileext = get_file_ext(fitem.filename);
    if (eh_os == "WINNT") {
        return fileext == "pdf" || fileext == "ppt" || fileext == "pptx";
    } else {
        return fileext == "pdf"; // we not support converting PPT to PDF on non-windows systems
    }
}











// ====================== WebDAV related functions =============================

var sync_id = 0;
var xhr_objlist = new Array();

/* 
    dav_file_list:
        href: start with /dav/someuuid/...
        status: HTTP 200
        contentlength: number
        contenttype: string
        is_dir: boolean
        lastmodified: date-string
        etag: string
*/

/*
    parse relative path
    note:
        string length must >= 41
            p.s. len("/dav/24ea24fd-0c39-49de-adbe-641d1cf4a499") == 41
            
    for example:
        when type is file
            "/dav/24ea24fd-0c39-49de-adbe-641d1cf4a499/foo/bar/abc.txt" ==> "/foo/bar/abc.txt"
            "/dav/24ea24fd-0c39-49de-adbe-641d1cf4a499/abc.txt" ==> "/abc.txt"
        when type is dir
            "/dav/24ea24fd-0c39-49de-adbe-641d1cf4a499" ==> "/"
            "/dav/24ea24fd-0c39-49de-adbe-641d1cf4a499/" ==> "/"
            "/dav/24ea24fd-0c39-49de-adbe-641d1cf4a499/foo/bar" ==> "/foo/bar/"
            "/dav/24ea24fd-0c39-49de-adbe-641d1cf4a499/foo/bar/" ==> "/foo/bar/"
*/
function webdav_parsepath(href, is_dir)
{
    if (href.length < 41) {
        abort("unexpected href: " + href);
        return;
    }
    
    if (is_dir) {
        if (href.slice(-1) != "/")
            href += "/"; // append slash if type is dir
    }

    return href.slice(41); // remove first 41 chars
}


/*
    parse file/dir name from path
    for example:
        when type is file
            "/foo/bar/abc.txt" ==> "abc.txt"
            "/abc.txt" ==> "abc.txt"
        when type is dir
            "/" ==> ""
            "/foo/bar/" ==> "bar"
*/
function webdav_parsename(path, is_dir)
{
    if (is_dir) {
        if (path.slice(-1) == "/")
            path = path.slice(0, -1); // remove last slash if type is dir
    }
    return path.split("/").pop();
}





/*
    retrieve file list by given subdir
    
    return value is a promise
    return object is
    {
        subhref: [href of subdir],
        flist: [file list],
        dlist: [dir list],
    }
*/
function webdav_listsubdir(subdir)
{
    if (!subdir.startsWith('/')) subdir = "/" + subdir;
    if (!subdir.endsWith('/')) subdir = subdir + "/";
    
    return new Promise( function (resolve, reject) {
        // send WebDAV PROPFIND request
        $.ajax({
            type: "PROPFIND",
            url: "https://elearning.fudan.edu.cn" + subdir,
            context: document.body,
            dataType: "xml",
            username: el_username,
            password: el_password,
            headers: {  "Depth": "1",
                        //"Authorization": "Basic " + btoa(el_username + ":" + el_password), // sometimes fails
                     },
            success:    function (xml, status) {

                            var dlist = new Array();
                            var flist = new Array();
                            var subhref = new Array();
                            
                            $(xml).children("D\\:multistatus").children("D\\:response").each( function (index, element) {

                                var prop = $(element).children("D\\:propstat").children("D\\:prop");
                                var httpstatus = $(element).children("D\\:propstat").children("D\\:status").text();
                                if (httpstatus != "HTTP/1.1 200 OK") { abort("unknown status: " + httpstatus); return; }
                                
                                var href = $(element).children("D\\:href").text();
                                var is_dir = (prop.children("D\\:resourcetype").children("D\\:collection").length != 0);
                                var path = webdav_parsepath(decodeURIComponent(href), is_dir);
                                var filename = webdav_parsename(path, is_dir);
                                var cur = {
                                    href: href,
                                    path: path,
                                    filename: filename,
                                    status: httpstatus,
                                    contentlength: parseInt(prop.children("D\\:getcontentlength").text()),
                                    contenttype: prop.children("D\\:getcontenttype").text(),
                                    is_dir: is_dir,
                                    lastmodified: prop.children("D\\:getlastmodified").text(),
                                    etag: prop.children("D\\:getetag").text(),
                                };

                                if (is_dir) {
                                    if (href != subdir && href + "/" != subdir && "/" + href != subdir) {
                                        subhref.push(href);
                                    }
                                    dlist.push(cur);
                                } else {
                                    flist.push(cur);
                                }
                            });

                            console.log(dlist, flist);

                            resolve({
                                subhref: subhref,
                                dlist: dlist,
                                flist: flist,
                            });
                        },
            error: function (xhr, textStatus, errorThrown) {
                reject("####网络连接失败####PROPFIND failed: " + textStatus + ", " + errorThrown + ", " + xhr.status);
            },
        });
    });
}
/*
    retrieve file list by given subdir, recursively
    return value is a promise
    return object is
    {
        flist: [file list],
        dlist: [dir list],
    }
*/
function webdav_listsubdir_recursive(subdir)
{
    return new Promise( function (resolve, reject) {
        webdav_listsubdir(subdir).then( function (lsobj) {
            var resultobj = { dlist: lsobj.dlist, flist: lsobj.flist };
            Promise.all(lsobj.subhref.map(webdav_listsubdir_recursive)).then( function (subresults) {
                subresults.forEach( function (sub_resultobj) {
                    resultobj.dlist.push(...sub_resultobj.dlist);
                    resultobj.flist.push(...sub_resultobj.flist);
                });
                resolve(resultobj);
            }, reason => reject(reason));
        }, reason => reject(reason));
    });
}

/*
    retrieve file list by given site uuid

    return value is a promise
    return object is
    {
        flist: [file list],
        dlist: [dir list],
    }
*/ 
function webdav_listall(uuid)
{
    return webdav_listsubdir_recursive("/dav/" + uuid);
}


/*
    get binary data using XMLHttpRequest
    return value is a promise
*/

function webdav_binary_xhr(url, xhrprogresscallback)
{
    return new Promise( function (resolve, reject) {
        var xhr = new XMLHttpRequest();
        xhr.open("GET", url);
        xhr.responseType = "arraybuffer";
        
        xhr.onload = function (event) {
            var data = new Uint8Array(xhr.response);
            if (xhr.status >= 200 && xhr.status < 300) {
                resolve(data);
            } else {
                reject("onload() failed, status = " + xhr.status);
            }
        };

        xhr.onerror = function () {
            reject("binary xhr failed: onerror() is called");
        };

        // FIXME: we haven't send username and password!

        if (xhrprogresscallback) {
            xhr.addEventListener("progress", xhrprogresscallback, false);
        }
        
        // note: elearning requests set user-agent to non-browser
        xhr.setRequestHeader("Translate", "f"); // requested by webdav
        xhr.send();

        xhr_objlist.push(xhr);
    });
}




/*
    create local path recursively
    return value is a promise
    for example:
        webdav_create_localpath('file:///C:/aaa', '/bbb/ccc/')
        will create c:\aaa\bbb and c:\aaa\bbb\ccc
        and will not create c:\aaa
*/
function webdav_create_localpath(localbase, subpath)
{
    if (subpath == "/") return;

    var target_uri = localbase + escape_path(subpath);
    check_path_with_base(target_uri, localbase);
    var target_native = OS.Path.fromFileURI(target_uri);
    var base_native = OS.Path.fromFileURI(localbase);
    //show_msg("base=" + base_native + " target=" + target_native);

    return OS.File.makeDir(target_native, {
        ignoreExisting: true,
        from: base_native
    });
}

/*
    download single file
    return value is a promise

    fitem: single object in flist
    localbase: local file uri of current site
*/
function webdav_download_single(fitem, localbase, cur_sync_id, xhrprogresscallback)
{
    var target_uri = localbase + escape_path(fitem.path);
    check_path_with_base(target_uri, localbase);
    return new Promise( function (resolve, reject) {
        var url = "https://elearning.fudan.edu.cn" + fitem.href;
        var target_native = OS.Path.fromFileURI(target_uri);
        
        //show_msg("url=" + url + " file=" + target_native);

        webdav_binary_xhr(url, xhrprogresscallback).then(function (data) { // onsuccess
            if (cur_sync_id != sync_id) reject("####同步已取消####");
            OS.File.writeAtomic(target_native, data)
                .then(function () {
                    var lmd = new Date(Date.parse(fitem.lastmodified));
                    OS.File.setDates(target_native, lmd, lmd).then( function () {
                        resolve();
                    }, function (reason) {
                        reject("OS.File.setDates failed: " + reason);
                    });
                }, function (reason) {
                    reject("OS.File.writeAtomic failed: " + reason);
                });
        }, function (reason) { // onerror
            reject("bin xhr failed: " + reason);
        });
        
    });
}


/*
    sync single file
    return value is a promise
    return object:
        1: if real download happens
        0: if no need to download

    parameters:
        see webdav_download_single() for details
        sdfitem: last sync data item with same path
        fstatus: statuslist item object
        update_count_callback(delta_finished, delta_total)
*/
function webdav_sync_single(fitem, sdfitem, localbase, cur_sync_id, fstatus, update_count_callback)
{
    var target_uri = localbase + escape_path(fitem.path);
    check_path_with_base(target_uri, localbase);
    return new Promise( function (resolve, reject) {
        // check whether we should download this file
        new Promise( function (resolve, reject) {
            // first, check file exists
            new Promise( function (resolve, reject) {
                var target_native = OS.Path.fromFileURI(target_uri);
                OS.File.stat(target_native).then( function (info) {
                    // file exists
                    resolve(true);
                }, function (reason) {
                    if (reason instanceof OS.File.Error && reason.becauseNoSuchFile) {
                        // file not exists
                        resolve(false);
                    } else {
                        reject("unknown stat() error: " + reason);
                    }
                });
            }).then( function (fexists) {
                fitem.exists = fexists;
                if (fexists && !syncoverwrite) {
                    // file exists, and user requires no overwrite
                    resolve({ flag: false, reason: "文件已存在" });
                    return;
                }
                if (fitem.ignore && !fitem.force_no_ignore) {
                    // if ignore flag is set, and no override by user
                    resolve({ flag: false, reason: "忽略" });
                    return;
                }
                if (!sdfitem) {
                    // no current file in previous data, download it
                    resolve({ flag: true });
                    return;
                }
                if (sdfitem.lastmodified != fitem.lastmodified) {
                    // file changed (etag, lastmodified), download it
                    resolve({ flag: true });
                    return;
                }
                if (!fexists) {
                    // file not exists (may be deleted), download it
                    resolve({ flag: true });
                    return;
                }
                resolve({ flag: false, reason: "已是最新" });
            }, function (reason) {
                reject("can't check file existance: " + reason);
            });
        }).then( function (shoulddownload) {
            console.log(fitem.path, shoulddownload);
            if (shoulddownload.flag) {
                if (cur_sync_id != sync_id) reject("####同步已取消####");
                //console.log("file not exists, download: " + fitem.path);
                statuslist_update(fstatus, "准备下载", "blue");
                update_count_callback(0, 1);
                webdav_download_single(fitem, localbase, cur_sync_id, function (e) { // xhrprogresscallback
                    if (e.lengthComputable) {
                        var v = Math.round((e.loaded / e.total) * 100);
                        statuslist_update(fstatus, "下载中 (" + v.toString() + "%)", "blue");
                    }
                }).then( function () {
                    statuslist_update(fstatus, "下载成功", "green", " (新)", "red");
                    update_count_callback(1, 0);
                    fitem.is_new_file = true;
                    fitem.exists = true;
                    resolve(1);
                }, function (reason) { // onerror
                    statuslist_update(fstatus, "下载失败", "red");
                    reject("download single failed: " + reason);
                });
            } else {
                statuslist_update(fstatus, shoulddownload.reason, "green");
                fitem.is_new_file = false;
                resolve(0);
            }
        }, function (reason) {
            reject("can't judge download status: " + reason);
        });
    });
}



/*
    do some preprocess jobs
    for example: ignore huge files ...

    sdfmap: Map: path => fitem
*/
function preprocess_lobj(lobj, sdfmap)
{
    lobj.flist.forEach( function (fitem) {
        var sdfitem = sdfmap.get(fitem.path);
        if (sdfitem === undefined) sdfitem = {};
        fitem.force_no_ignore = (sdfitem.force_no_ignore === true);
        fitem.ignore = false;

        if (fitem.contentlength > syncsizelimit || syncignoreext.has(get_file_ext(fitem.path))) {
            // if file is too big or file ext is in ignore list
            fitem.ignore = true;
        }
    });
}


// syncdatafile wrappers
function read_syncdatafile(syncdatafile)
{
    return read_json_from_fileuri(syncdatafile).then( function (obj) {
        console.log("READ SYNCDATA", obj);
        return obj.lobj;
    });
}
function write_syncdatafile(syncdatafile, lobj)
{
    return write_json_to_fileuri({ lobj: lobj }, syncdatafile);
}

/*
    sync a whole site

    return value is a promise
    return object:
    {
        lobj: {
            flist: file list
            dlist: dir list
        }
        sum: a integer, total real downloads
    }
    
    uuid: site uuid
    course folder: course folder, must start with "/", some thing like "/2015-2016春季学期/离散数学"
    syncdatafile: sync data file, used for checking lastmodified date, etc.  
                  in fileuri format, something like "file:// ... /ehdb/syncdata/UUIDUUIDUUID.json"
                  file may not exist, but path must exist
                  the path is trusted
    statuslist: see create_statuslist()
    report_progress(finished_count, total_count)
*/
function webdav_sync(uuid, coursefolder, syncdatafile, statuslist, report_progress)
{
    var cur_sync_id = ++sync_id;
    xhr_objlist.length = 0;
    
    return new Promise( function (resolve, reject) {
        // create course folder
        var localbase = docfolder + escape_path(coursefolder);
        check_path_with_base(localbase, docfolder);
        webdav_create_localpath(docfolder, coursefolder).then( function () {
            // read previous sync data
            var sdstatus = statuslist_appendprogress(statuslist, "正在检查同步状态");
            new Promise(function (resolve, reject) {
                read_syncdatafile(syncdatafile).then( function (lobj) {
                    if (lobj !== undefined) {
                        // read ok, use the data as syncdata
                        statuslist_update(sdstatus, "上次同步于 " + format_date(new Date(lobj.timestamp), "do"), "green");
                        resolve(lobj);
                    } else {
                        statuslist_update(sdstatus, "首次同步", "green");
                        resolve({ flist: [], dlist: [] });
                    }
                }, function () {
                    // read failed, create a new syncdata
                    statuslist_update(sdstatus, "首次同步", "green");
                    resolve({ flist: [], dlist: [] });
                });
            }).then( function (syncdata) {
                // process syncdata into a map object
                var sdfmap = new Map(); // sync data flist map
                syncdata.flist.forEach( function (fitem) { sdfmap.set(fitem.path, fitem); });
                // list dir
                var lsstatus = statuslist_appendprogress(statuslist, "正在列目录");
                webdav_listall(uuid).then( function (lobj) {
                    if (cur_sync_id != sync_id) reject("####同步已取消####");
                    preprocess_lobj(lobj, sdfmap);
                    Promise.all(lobj.dlist.map( function (ditem) { return webdav_create_localpath(localbase, ditem.path); } ))


                        .then( function () {
                            statuslist_update(lsstatus, "完成", "green");
                            // directory created, start downloading files
                            var count = 0;
                            var total = 0;
                            report_progress(count, total);
                            Promise.all(lobj.flist.map( function (fitem) {
                                    return new Promise( function (resolve, reject) {
                                        var fstatus = statuslist_appendprogress(statuslist, "正在同步 " + fitem.path);
                                        statuslist_update(fstatus, "正在检查", "blue");
                                        webdav_sync_single(fitem, sdfmap.get(fitem.path), localbase, cur_sync_id, fstatus,
                                            function (delta_count, delta_total) { // update_count_callback
                                                count += delta_count;
                                                total += delta_total;
                                                report_progress(count, total);
                                            }
                                        ).then( function (dstat) {
                                            resolve(dstat);
                                        }, function (reason) {
                                            statuslist_update(fstatus, "下载失败", red);
                                            reject("can't download " + fitem.filename + ": " + reason);
                                        });
                                    });
                                })).then( function (dstat) {
                                    var sum = 0;
                                    assert(dstat.length == lobj.flist.length);
                                    for (var i = 0; i < dstat.length; i++) {
                                        sum += dstat[i];
                                    }

                                    
                                    // if no new file, we should set fitem.is_new_file to previous status
                                    // otherwise, we should mark new files only
                                    var new_item_flag = false;
                                    lobj.flist.forEach( function (fitem) {
                                        var sdfitem = sdfmap.get(fitem.path);
                                        if (sdfitem === undefined) {
                                            new_item_flag = true;
                                            fitem.is_new_file = true;
                                        }
                                    });

                                    if (!new_item_flag) {
                                        lobj.flist.forEach( function (fitem) {
                                            var sdfitem = sdfmap.get(fitem.path);
                                            fitem.is_new_file = sdfitem.is_new_file;
                                        });
                                    }
                                    
                                    statuslist_append(statuslist, "同步完成，共有 " + sum + " 个新文件", "green");
                                    lobj.timestamp = new Date().getTime();
                                    console.log(syncdatafile);
                                    write_syncdatafile(syncdatafile, lobj).then( function () {
                                        xhr_objlist.length = 0;
                                        resolve({
                                            lobj: lobj,
                                            sum: sum,
                                        });
                                    }, function (reason) {
                                        reject("can't write sync result: " + reason);
                                    });
                                }, function (reason) {
                                    reject("can't download file: " + reason);
                                });
                        }, function (reason) {
                            reject("can't create directory: " + reason);
                        });
                }, function (reason) {
                    statuslist_update(lsstatus, "失败", "red");
                    reject("can't list files: " + reason);
                });
            });
        }, function (reason) {
            reject("can't create course folder: " + reason);
        });
    });
}


function webdav_cancel_sync()
{
    local_log("[sync] aborted");
    sync_id++;
    xhr_objlist.forEach( function (xhr) {
        xhr.abort();
    });
    xhr_objlist.length = 0;
}



function enter_resource_section(sobj, coursefolder, is_resync)
{
    is_resync = (is_resync === true);
    var webdav_sync_complete = false;
    
    var resync_func = function (oldsyncdata) {
        var promise;
        if (oldsyncdata !== undefined) {
            promise = write_syncdatafile(syncdatafile, oldsyncdata);
        } else {
            promise = Promise.resolve();
        }
        promise.then( function () {
            enter_resource_section(sobj, coursefolder, true);
        });
    };
    
    // prepare backbtn
    $("#filenav_backbtn").unbind("click").click( function () {
        if (webdav_sync_complete) {
            go_back();
        } else {
            webdav_cancel_sync();
            go_back();
        }
    });
    
    show_page("filenav");

    
    let syncdatafile = get_syncdatafile(sobj);
    $("#filenav_sitetitle").text(sobj.sname);

    // load data
    if (!is_resync) $("#filenav_filelist_box").scrollTop(0);
    var tbodyobj = $("#filenav_filelist").children("tbody")
        .html("<tr><td></td><td>加载中 ...</td><td></td></tr>");
    
    // prepare for status bar
    $("#filenav_deatils").empty().html("提示：<ul><li>单击文件可以查看详细信息</li><li>双击文件来打开</li></ul>");;
    $("#filenav_syncprogress").empty();
    $("#filenav_syncinprogresstext").show();
    $("#filenav_syncfinishedtext").empty().hide();
    $("#filenav_showsyncdetails").unbind("click").click( function () {
        local_log("[sync] " + ($("#filenav_syncdetails_fbox").is(":visible") ? "hide" : "show") + " detail");
        $("#filenav_syncdetails_fbox").toggle();
        $("#filenav_syncdetails_box").scrollTop(0);
    });
    $("#filenav_resync").hide().unbind("click").click( function () {
        local_log("[filenav] resync (uuid = " + sobj.uuid + ")");
        resync_func();
    });
    $("#filenav_forcedownloadall").hide().unbind("click");


    // prepare detail box
    $("#filenav_syncdetails_fbox").hide();
    var statuslist = create_statuslist();
    $("#filenav_syncdetails").empty().append($(statuslist));
    $("#filenav_showfiles").hide();



     
    local_log("[sync] start (uuid = " + sobj.uuid + ")");

    webdav_sync(sobj.uuid, coursefolder, syncdatafile, statuslist,
        function (finished, total) { // report_progress
            // update status bar
            $("#filenav_syncprogress").text(finished.toString() + "/" + total.toString());
        }
    ).then( function (obj) {
        local_log("[sync] finished (newfile = " + obj.sum.toString() + ", uuid = " + sobj.uuid + ")");

        // update sync progress
        $("#filenav_syncinprogresstext").hide();
        if (obj.sum == 0) {
            $("#filenav_syncfinishedtext").text("同步完成").show();
        } else {
            $("#filenav_syncfinishedtext").text("同步完成，共 " + obj.sum.toString() + " 个新文件").show();
        }
        $("#filenav_showfiles").show().unbind("click").click( function () { // open course folder
            local_log("[filenav] open course folder (coursefolder = " + coursefolder + ")");
            launch_fileuri(docfolder + escape_path(coursefolder));
        });
        $("#filenav_resync").show();

        // sort file list by last-modified date
        obj.lobj.flist.sort( function (a, b) {
            // sort by last_modified
            var ta = Date.parse(a.lastmodified);
            var tb = Date.parse(b.lastmodified);
            if (ta < tb) return 1;
            if (tb < ta) return -1;
            return 0;
        });

        // check if we have non-exists file
        var has_non_exists_file_flag = false;
        obj.lobj.flist.forEach( function (fitem) {
            if (!fitem.exists) has_non_exists_file_flag = true;
        });
        if (has_non_exists_file_flag) {
            $("#filenav_forcedownloadall").show().click( function () {
                local_log("[filenav] force download all");
                obj.lobj.flist.forEach( function (fitem) {
                    fitem.force_no_ignore = true;
                });
                resync_func(obj.lobj);
            });
        }


        // generate file table
        tbodyobj.empty();
        console.log(obj);
        obj.lobj.flist.forEach( function (element, index, array) {
            let fitem = element;
            let fileuri = docfolder + escape_path(coursefolder) + escape_path(fitem.path);
            
            var rowobj = $(document.createElement('tr'))

            // image
            var icontd = $(document.createElement('td')).append(
                $(document.createElement('img'))
                    .attr("src", get_filetype_iconuri(get_file_ext(fitem.filename)))
                    .attr("width", "16")
                    .attr("height", "16")
                    .css("margin", "4px 3px")
            ).appendTo(rowobj);
            
            // filename
            var fndisp = fitem.path.slice(1);
            var fnobj = $(document.createElement('span'))
                .text(fndisp)
                .addClass("eh_link2");
            var fntd = $(document.createElement('td')).append(fnobj).appendTo(rowobj);

            var mark_noignore_and_download_func = function () {
                local_log("[filenav] mark no ignore (path = " + fitem.path + ")");
                fitem.force_no_ignore = true;
                resync_func(obj.lobj);
            };
            
            let openoutside = !pdfviewer_issupported(fitem); // should we open this file outside
            var openfunc = function (e) { // user dblclick file
                console.log(fitem, coursefolder);
                if (!fitem.exists) {
                    mark_noignore_and_download_func();
                } else if (openoutside) {
                    launch_fileuri(fileuri);
                } else {
                    pdfviewer_show(fitem, coursefolder).catch( function (reason) {
                        show_error("无法用内置查看器打开: " + get_friendly_part(reason));
                        launch_fileuri(fileuri);
                    });
                }
            };
            var selectfunc = function (e) { // user select file
                local_log("[filenav] select file (fpath = " + fitem.path + ")");
                

                //$(this).parent().parent().find("span").filter(".eh_link3").removeClass("eh_link3").addClass("eh_link2");
                //$(this).parent().find("span").filter(".eh_link2").removeClass("eh_link2").addClass("eh_link3");
                $(this).parent().children("tr").removeClass("eh_selected");
                $(this).addClass("eh_selected");
                var actobj = $(document.createElement('span')).addClass("eh_add_margin_to_child_link");
                
                if (!fitem.exists) {
                    $(document.createElement('span')).addClass("eh_link").text("下载此文件").click(mark_noignore_and_download_func).appendTo(actobj);
                }
                
                $(document.createElement('span')).addClass("eh_link").text("打开文件位置").click( function () {
                    local_log("[filenav] reveal file (fpath = " + fitem.path + ")");
                    reveal_fileuri(fileuri);
                }).appendTo(actobj);
                
                var detaildiv = $("#filenav_deatils");
                detaildiv.empty()
                    .append($(create_kvdiv("名称: ", fitem.filename, function () {
                                local_log("[filenav] open file by click link (fpath = " + fitem.path + ")");
                                openfunc();
                            })))
                    .append($(create_kvdiv("修改时间: ", format_date(new Date(Date.parse(fitem.lastmodified)), "dto"))))
                    .append($(create_kvdiv("大小: ", format_filesize(fitem.contentlength))))
                    .append($(create_kvdiv_with_obj("操作: ", actobj)));
            };

            var redmsg = "";
            if (fitem.is_new_file) redmsg += ", 新";
            if (!fitem.exists) redmsg += ", 尚未下载";
            if (redmsg != "") {
                $(document.createElement('span'))
                    .text(" (" + redmsg.slice(2) + ")")
                    .css("color", "red")
                    .appendTo(fntd);
            }

            // lastmodified
            var lastmodifiedoffset = date_offset(new Date(Date.parse(fitem.lastmodified)));
            if (lastmodifiedoffset.str != "") {
                $(document.createElement('td')).append(
                    $(document.createElement('span')).text(format_date(new Date(Date.parse(fitem.lastmodified)), "d") + "  ")
                ).append(
                    $(document.createElement('span'))
                        .text(" (" + lastmodifiedoffset.str + ")")
                        .css("color", lastmodifiedoffset.color)
                ).appendTo(rowobj);
            }

            rowobj.mousedown(preventdefaultfunc)
                .dblclick(openfunc)
                .dblclick( function () {
                        local_log("[filenav] open file by double click (fpath = " + fitem.path + ")");
                    })
                .click(selectfunc)
                .appendTo(tbodyobj);
        });
        webdav_sync_complete = true;
    }, function (reason) {
        $("#filenav_syncinprogresstext").hide();
        $("#filenav_syncfinishedtext").text("同步失败").show();
        statuslist_append(statuslist, "同步失败: " + get_friendly_part(reason), "red");
        local_log("[sync] failed (reason = " + get_friendly_part(reason) + ")");
        $("#filenav_resync").show();
        tbodyobj.html("<tr><td></td><td>同步失败</td><td></td></tr>");
        webdav_sync_complete = true;
    });
}











// ====================== eLearning related functions =============================


var slist;
/* slist: global elearning sitelist
    {
        sname: site name
        uuid: site uuid
    }
*/




/*
    login to UIS
    return value is a promise
*/

function uis_login()
{
    return new Promise( function (resolve, reject) {
        // FIXME: 20170317
        // this is a workaround for cert issue of uis.fudan.edu.cn
        // access 'https://mail.fudan.edu.cn' to get the cert of *.fudan.edu.cn
        // then do uis login process
        //$.get("https://mail.fudan.edu.cn/").done( function (data, textStatus, jqXHR) {
        
            $.get("https://uis.fudan.edu.cn/authserver/login").done( function (data, textStatus, jqXHR) {
                var postdata = {};
                $($.parseHTML(data)).find("input[type='hidden']").each( function(index, element) {
                    postdata[$(this).attr("name")] = $(this).attr("value");
                });
                postdata["username"] = el_username;
                postdata["password"] = el_password;
                //console.log(postdata);
                $.post("https://uis.fudan.edu.cn/authserver/login", postdata, null, "text").done( function (data, textStatus, jqXHR) {
                    //console.log(data);
                    if (data.indexOf("/authserver/userSetting.do") > -1) {
                        //show_msg("Login to UIS - OK!");
                        resolve();
                    } else if (data.indexOf("您提供的用户名或者密码有误") > -1) {
                        reject("####用户名或密码错误####UIS login check failed");
                    } else if (data.indexOf("请输入验证码") > -1) {
                        reject("####请在浏览器里成功登录一次 UIS，再使用 eLearning Helper 登录。####captcha required");
                    } else {
                        reject("UIS login check failed");
                    }
                }).fail( function (xhr, textStatus, errorThrown) {
                    reject("####网络连接失败####UIS login failed: " + textStatus + ", " + errorThrown);
                });
            }).fail( function (xhr, textStatus, errorThrown) {
                reject("####网络连接失败####can't fetch UIS login page");
            });
        //}).fail( function (xhr, textStatus, errorThrown) {
        //    reject("####网络连接失败####can't fetch fudan-email login page");
        //});
    });
}


/*
    login to elearning
    return value is a promise
    before calling this function, UIS must be logged in
*/

function elearning_login()
{
    return new Promise( function (resolve, reject) {
        $.get("https://elearning.fudan.edu.cn/portal/login", null, null, "text")
            .done( function (data, textStatus, jqXHR) {
                //console.log(data);
                if (data.indexOf(el_username) > -1) {
                    //show_msg("Login to eLearning - OK!");
                    resolve();
                } else {
                    reject("eLearning login check failed");
                }
            }).fail ( function (xhr, textStatus, errorThrown) {
                reject("eLearning login failed: " + textStatus + ", " + errorThrown);
            });
    });
}





function elearning_fetch_siteannouncements(sobj)
{
    return new Promise( function (resolve, reject) {
    
        resolve({ announcements: [] });
    });
}

function parse_assignment_object(aobj)
{
    aobj["opendate"] = parse_elearning_date(aobj.opendatestr);
    aobj["duedate"] = parse_elearning_date(aobj.duedatestr);
    aobj["status"] = aobj.statusstr;
}

function elearning_fetch_siteassignment(sobj)
{
    return new Promise( function (resolve, reject) {
        $.get(sobj.assignment_url, null, null, "html") // FIXME: check page limit!
            .done( function (data) {
                var alist = new Array();
                $($.parseHTML(data)).find("[name='listAssignmentsForm'] table").find("tr").each( function (index, element) { // for each <TR>
                    var aobj = {
                        title: "unknown",
                        statusstr: "unknown",
                        opendatestr: "unknown",
                        duedatestr: "unknown",
                    };
                    
                    $(element).children("td").each( function (index, element) { // for each <TD>
                        var tdobj = $(element);
                        switch (tdobj.attr("headers")) {
                            case "title": aobj.title = tdobj.find("a").text().trim(); break;
                            case "status": aobj.statusstr = tdobj.text().trim(); break;
                            case "openDate": aobj.opendatestr = tdobj.text().trim(); break;
                            case "dueDate": aobj.duedatestr = tdobj.find("span").text().trim(); break;
                        }
                    });
                    
                    if (aobj.title != "unknown") {
                        parse_assignment_object(aobj);
                        alist.push(aobj);
                    }
                });
                
                resolve({ assignment: alist });
            }).fail( function (xhr, textStatus, errorThrown) {
                // fallback, do not throw error
                console.log("xhr failed: " + textStatus);
                resolve({ have_assignment: false });
            });
    });
}

function elearning_fetch_sitedetails(sitem)
{
    var sobj = {
        sname: sitem.sname,
        uuid: sitem.uuid,
        have_assignment: false,
        assignment_url: "",
        have_announcements: false,
        announcements_url: "",
    };

// FIXME
// details is disabled !!!
return Promise.resolve(sobj);

    return new Promise( function (resolve, reject) {
        $.get("https://elearning.fudan.edu.cn/portal/pda/" + sitem.uuid, null, null, "html")
            .done( function (data) {
                var plist = new Array();
                var lilist = $($.parseHTML(data)).find("#pda-portlet-page-menu").children("li");
                
                var assignment_liobj = lilist.filter(".icon-sakai-assignment-grades-item");
                if (assignment_liobj.length) {
                    // found a 'assignment' item
                    sobj.have_assignment = true;
                    sobj.assignment_url = assignment_liobj.find("a").attr("href");
                    plist.push(elearning_fetch_siteassignment(sobj));
                };

                var announcements_liobj = lilist.filter(".icon-sakai-announcements-item");
                if (announcements_liobj.length) {
                    sobj.have_announcements = true;
                    sobj.announcements_url = announcements_liobj.find("a").attr("href");
                    plist.push(elearning_fetch_siteannouncements(sobj));
                }
                Promise.all(plist).then( function (result) {
                    result.forEach(result_item => Object.assign(sobj, result_item));
                    console.log(sobj);
                    resolve(sobj);
                }, function (reason) {
                    reject("detail promise failed: " + reason);
                });
            }).fail( function (xhr, textStatus, errorThrown) {
                // fallback, do not throw error
                console.log("xhr failed: " + textStatus);
                resolve(sobj);
            });
    });
}

/*
    fetch site list from elearing (use mobile version elearning)
    return value is a promise
    before calling this function, elearing must be logged in
*/
function elearning_fetch_sitelist()
{
    return new Promise( function (resolve, reject) {
        $.get("https://elearning.fudan.edu.cn/portal/pda", null, null, "html")
            .done( function (data) {
                var slist = new Array();
                $($.parseHTML(data)).find("#pda-portlet-site-menu").children("li").each(function (index, element) {
                    var slink = $(element).find("a");
                    
                    var sname = slink.attr("title");
                    var suuid = slink.attr("href").split("/").pop();

                    slist.push({
                        sname: sname,
                        uuid: suuid,
                    });
                });

                Promise.all(slist.map(elearning_fetch_sitedetails))
                    .then( slist_with_details => resolve(slist_with_details), reason => reject("can't fetch details: " + reason));

            }).fail ( function (xhr, textStatus, errorThrown) {
                reject("get portal failed: " + textStatus + ", " + errorThrown);
            });
    });
}







// ====================== jwfw related functions ========================



/*
    fetch course table from fdu jwfw
    return value is a promise
    must logged in to uis before calling this function

    note: one courses may have multiple entries in clist with different ctime
*/
function urp_fetch_coursetable(semester_id)
{
    //console.log("urp_fetch_coursetable()", semester_id);
    return new Promise( function (resolve, reject) {
        //Services.cookies.add("www.urp.fudan.edu.cn:92", "/eams", "semester.id", semester_id, false, true, false, 0x7fffffff);
        $.get("http://www.urp.fudan.edu.cn:92/eams/courseTableForStd!index.action").done( function (data) {
            //console.log("courseTableForStd!index.action", data);
            // grep ids
            var ids_data = data.match(/bg\.form\.addInput\(form,"ids","(\d+)"\);/);
            if (!ids_data || !ids_data[1]) { reject("parse error: can't find ids"); return; }
            var ids = ids_data[1];
            $.post("http://www.urp.fudan.edu.cn:92/eams/courseTableForStd!courseTable.action", {
                "ignoreHead": "1",
                "setting.kind": "std",
                "startWeek": "1",
                "semester.id": semester_id,
                "ids": ids,
            }, null, "text").done( function (data, textStatus, jqXHR) {
                //console.log("courseTableForStd!courseTable.action", data);
                // begin parse data

                // find range and trim
                var st = data.indexOf("// function CourseTable in TaskActivity.js");
                if (st < 0) { reject("parse error: [// function CourseTable in TaskActivity.js] not found"); return; }
                var ed = data.indexOf("</script>", st);
                if (ed < 0) { reject("parse error: [</script>] not found"); return; }
                data = data.substring(st, ed);

                // split each class into array (cstrlist = course string list)
                var cstrlist = data.split("new TaskActivity");

                var clist = new Array();
                cstrlist.forEach( function (element, index, array) {
                    if (index == 0) return; // drop first element (it's trash)
                    var p = element.indexOf("\n");
                    if (p < 0) { reject("parse error: [\\n] not found"); return; }
                    
                    // split course data
                    var cdatajsonstr = "[" + element.substring(0, p).match(/\((.*)\)/)[1] + "]"; // get data in '(' and ')'
                    var cdatajson = $.parseJSON(cdatajsonstr);

                    var cid = cdatajson[2].match(/\((.*)\)/)[1];
                    var cname = cdatajson[3].replace("(" + cid + ")", "");
                    var cclassroom = cdatajson[5];
                    var cteacher = cdatajson[1];
                    var cavlweek = cdatajson[6];

                    // split course time
                    var ctime = element.substring(p + 1) // fetch the remaining string
                        .match(/(index =\d+\*unitCount\+\d+;)/g) // match all string like "index =3*unitCount+7;"
                        .map(function (str) { return str.match(/(\d+)/g); }) // parse string to array, like ["3", "7"]
                        .map(function (tup) { return tup.map(function (x) { return parseInt(x) + 1; }); }); // convert to int and add one, like [4, 8]

                    // append to array                    
                    clist.push({
                        cid: cid,
                        cname: cname,
                        cclassroom: cclassroom,
                        cteacher: cteacher,
                        cavlweek: cavlweek,
                        ctime: ctime,
                    });
                });

                //console.log(clist);
                resolve(clist);
                
            }).fail( function (xhr, textStatus, errorThrown) {
                reject("courseTableForStd!courseTable.action failed: " + textStatus + ", " + errorThrown);
            });
        }).fail( function (xhr, textStatus, errorThrown) {
            reject("courseTableForStd!index.action failed: " + textStatus + ", " + errorThrown);
        });
    });
}





/*
    fetch semester data from fdu jwfw
    return value is a promise
    return value is an object: 
        {
            smap: sparse array sid ==> sname,
            cursid: current semester id,
        }
    must logged in to uis before calling this function
*/
function urp_fetch_semesterdata()
{
    return new Promise( function (resolve, reject) {
        $.get("http://www.urp.fudan.edu.cn:92/eams/courseTableForStd!index.action").done( function (data, textStatus, request) {

            var f = function (data, textStatus, request) {
                // last GET response should set 'semester.id' cookie
                var cur_semester = parseInt(request.getAllResponseHeaders().match(/semester\.id=(\d+)/)[1]);
                
                // send POST to get semester list
                $.post("http://www.urp.fudan.edu.cn:92/eams/dataQuery.action", {
                    "dataType": "semesterCalendar",
                }, null, "text").done( function (data, textStatus, jqXHR) {
                    // althogh we can use eval() to parse, but using eval() is NOT SAFE!!!
                    var semesterlist = new Array();
                    var sarr = data.match(/(\{id:\d+,schoolYear:"\d+-\d+",name:".+?"\})/g);
                    sarr.forEach(function (element, index, array) {
                        var spart = element.match(/\{id:(\d+),schoolYear:"(\d+-\d+)",name:"(.+?)"\}/);
                        var sid = parseInt(spart[1]);
                        if (spart[3] == "2") spart[3] = "春季";
                        if (spart[3] == "1") spart[3] = "秋季";
                        var sstr = spart[2] + " " + spart[3] + "学期";
                        semesterlist[sid] = sstr;

                    });
                    setTimeout(function () {
                        resolve({
                            smap: semesterlist,
                            cursid: cur_semester,
                        });
                    }, 200);
                }).fail( function (xhr, textStatus, errorThrown) {
                    reject("dataQuery.action failed: " + textStatus + ", " + errorThrown);
                });
            };

            if (data.indexOf("当前用户存在重复登录的情况") >= 0) {
                //console.log("data", data);
                var newurl = $($.parseHTML(data)).filter('a').attr("href");
                //console.log("newurl", newurl);
                //return;
                $.get(newurl).done( function (data, textStatus, request) {
                    f(data, textStatus, request);
                }).fail(function (xhr, textStatus, errorThrown) {
                    reject("courseTableForStd!index.action 2nd failed: " + textStatus + ", " + errorThrown);
                });
            } else {
                f(data, textStatus, request);
            }
        }).fail( function (xhr, textStatus, errorThrown) {
            reject("courseTableForStd!index.action failed: " + textStatus + ", " + errorThrown);
        });
    });
}


// =========== course table on main screen related functions ================

/*
    clist:
        cid: course id (string)
        cname: course name (string)
        cclassroom: course classroom (string)
        cteacher: course teacher name (string)
        cavlweek: cavlweek (string, "001100..." means week 2-3 is avaliable)
        ctime: course time in table (array, like [[1, 1], [1, 2]])
*/


var clist; // course list
var cdivlist; // div in course table

var ctable_maxx = 5;
var ctable_maxy = 14;
var ctable; // ctable[1...5][1...14], coursetime (x, y) => cidx

var user_coursemap = {}; // user defined course->site map
var cur_semestername; // current semester name

var reselect_coursetable_func; // function for reselecting selected course


var sitepathmap = {};
function get_sitepath(sobj)
{
    return sitepathmap[sobj.uuid];
}
function set_sitepath(sobj, path)
{
    sitepathmap[sobj.uuid] = path;
    save_sitepathmap();
}
function get_coursefolder(cobj, sobj)
{
    var p = get_sitepath(sobj);
    if (p !== undefined) return p;
    
    var a = escape_filename(cur_semestername);
    var b = escape_filename(cobj.cname);
    check_filename(a);
    check_filename(b);
    p = "/" + a + "/" + b;
    set_sitepath(sobj, p);
    return p;
}
function get_sitefolder(sobj)
{
    var p = get_sitepath(sobj);
    if (p !== undefined) return p;
    
    var b = escape_filename(sobj.sname);
    check_filename(b);
    p = "/其他/" + b;
    set_sitepath(sobj, p);
    return p;
}


function get_syncdatafile(sobj)
{
    check_filename(sobj.uuid);
    var diruri = dbfolder + "/syncdata/" + sobj.uuid + ".json";
    check_path_with_base(diruri, docfolder);
    return diruri;
}

/*
    load data and draw course table using clist to main screen

    will update global var:
        clist
        cdivlist
*/

function coursetable_load(clist_input)
{
    console.log("coursetable_load()", clist_input);
    reselect_coursetable_func = function () {
        $("#main_course_details").html("提示：<ul><li>单击课程可以查看课程详细信息</li><li>双击课程可以进入课程文件列表</li></ul>");
        update_mainpage_assignments_announcements(null);
    };
    
    // copy clist_input to clist
    clist = clist_input;

    // clear cdivlist
    cdivlist = new Array();
    
    // construct ctable
    // ctable[x][y]:  x -> weekday, y -> course sequence number

    ctable = new Array();
    for (var i = 1; i <= ctable_maxx; i++) {
        ctable[i] = new Array();
        for (var j = 0; j <= ctable_maxy; j++) {
            ctable[i][j] = -1;
        }
    }

    // construct course table
    clist.forEach( function (element, index, array) {
        element.ctime.forEach( function (ct) {
            if ((1 <= ct[0] && ct[0] <= ctable_maxx) && (0 <= ct[1] && ct[1] <= ctable_maxy)) {
                ctable[ct[0]][ct[1]] = index;
            }
        });
    });

    var tobj = $("<table><tr><th></th><th>周一</th><th>周二</th><th>周三</th><th>周四</th><th>周五</th></tr></table>");

    
    for (var y = 1; y <= ctable_maxy; y++) {
        var trobj = $(document.createElement('tr'));
        $(document.createElement('td')).text(y.toString()).attr("title", timetable(y, 0) + " - " + timetable(y, 1)).appendTo(trobj);
        for (var x = 1; x <= ctable_maxx; x++) {
            var cidx = ctable[x][y]; // course index in clist
            if (cidx >= 0 && y > 1 && cidx == ctable[x][y - 1]) continue;
            var tdobj = $(document.createElement('td'));
            if (cidx >= 0) {
                var sidx = match_cname_sname(cidx);
                var y2;
                for (y2 = y + 1; y2 <= ctable_maxy && ctable[x][y2] == cidx; y2++);
                var tdrowspan = y2 - y;
                if (tdrowspan > 1) {
                    tdobj.attr("rowspan", tdrowspan);
                }
                // prepare CallBack parameters
                let cidx_cb = cidx;
                let x_cb = x;
                let y_cb = y;
                tdobj.click(function () { coursetable_select(cidx_cb, x_cb, y_cb); })
                     .dblclick(function () {
                        local_log("[mainpage] enter course site by double click (cidx = " + cidx_cb.toString() + ")");
                        coursetable_enter(cidx_cb, x_cb, y_cb);
                     })
                     .mousedown(preventdefaultfunc)
                     .css("cursor", "pointer");
                if (sidx < 0) tdobj.addClass("no_matched_site");
                $(cdivlist[cidx] = document.createElement('div'))
                    .append($(document.createElement('span'))
                            .text(clist[cidx].cname)
                           )
                    .appendTo(tdobj);
            }
            tdobj.appendTo(trobj);
        }
        trobj.appendTo(tobj);
    }

    $("#main_coursetable").empty().append(tobj);

    reselect_coursetable_func();
}

/*
    make course time string from ctime
    note:
        ctimelist will be sorted
    for example:
        [[2, 3], [2, 4], [2, 5], [4, 8], [4, 9]] ==> "二3-5, 四8-9"
*/
function make_ctime_str(ctimelist)
{
    ctimelist.sort( function (a, b) {
        if (a[0] == b[0]) {
            if (a[1] == b[1]) return 0;
            if (a[1] < b[1]) return -1;
            return 1;
        }
        if (a[0] < b[0]) return -1;
        return 1;
    });

    var ctimestr = "";
    var i, j;
    for (i = 0; i < ctimelist.length; i = j) {
        if (i != 0) ctimestr += ", ";
        for (j = i + 1; j < ctimelist.length && ctimelist[i][0] == ctimelist[j][0] && ctimelist[i][1] + j - i == ctimelist[j][1]; j++);
        if (j > i + 1) {
            ctimestr += chsweekday[ctimelist[i][0]] + ctimelist[i][1].toString() + "-" + (ctimelist[i][1] + j - i - 1).toString();
        } else {
            ctimestr += chsweekday[ctimelist[i][0]] + ctimelist[i][1].toString();
        }
    }

    return ctimestr;
}


/*
    make course time string from ctime
    note:
        ctimelist will be sorted
    for example:
        "01111000111000" ==> "1-4 8-10"
*/
function make_avlweek_string(avlweek)
{
    var i, j;
    var avlstr = "";
    for (i = 0; i < avlweek.length; i = j) {
        for (j = i + 1; j < avlweek.length && avlweek[i] == avlweek[j]; j++);
        if (avlweek[i] == "1") {
            if (avlstr != "") avlstr += " ";
            if (j > i + 1) {
                avlstr += i.toString() + "-" + (j - 1).toString();
            } else {
                avlstr += i.toString();
            }
        }
    }

    return avlstr;
}


function coursetable_select(cidx, x, y)
{
    let cidx_cb = cidx;
    let x_cb = x;
    let y_cb = y;

    reselect_coursetable_func = function () {
        coursetable_select(cidx_cb, x_cb, y_cb);
    }

    // deselect all
    cdivlist.forEach( function (element, index, array) {
        $(element).removeClass("eh_selected");
        $(element).removeClass("eh_selected_sub");
    });

    
    var cobj = clist[cidx];
    
    var ctimelist = new Array();    
    clist.forEach( function (element, index, array) {
        if (element.cid == cobj.cid) { // there might be multiple object have same cid
            $(cdivlist[index]).addClass(index == cidx ? "eh_selected" : "eh_selected_sub"); // make them selected
            ctimelist.push(...element.ctime);
        }
    });

    local_log("[mainpage] select course: (cidx = " + cidx.toString() + ") " + cobj.cname + " (" + cobj.cid + ")");
    
    var sidx = match_cname_sname(cidx);
    
    var detailobj = $("#main_course_details").empty();

    $(create_kvdiv("名称: ", cobj.cname + " (" + cobj.cid + ")", function () {
        local_log("[mainpage] enter course site by clicking link (cidx = " + cidx.toString() + ")");
        coursetable_enter(cidx_cb, x_cb, y_cb);
    })).appendTo(detailobj);
    $(create_kvdiv("教师: ", cobj.cteacher)).appendTo(detailobj);
    $(create_kvdiv("时间: ", make_ctime_str(ctimelist))).appendTo(detailobj);


    var y2;
    for (y2 = y + 1; y2 <= ctable_maxy && ctable[x][y2] == cidx; y2++);

    $(create_kvdiv("地点: ", cobj.cclassroom + " (" + timetable(y, 0) + "-" + timetable(y2 - 1, 1) + ")")).appendTo(detailobj);
    $(create_kvdiv("开课周: ", make_avlweek_string(cobj.cavlweek))).appendTo(detailobj);

    if (sidx >= 0) {
        detailobj.append(make_action_obj( function () {
                local_log("[mainpage] enter course site by clicking link below (cidx = " + cidx.toString() + ")");
                coursetable_enter(cidx_cb, x_cb, y_cb);
            }, docfolder + get_coursefolder(cobj, slist[sidx]), slist[sidx]));
    }

    update_mainpage_assignments_announcements(slist[sidx]);
}

function make_action_obj(resource_func, resource_localuri, sobj)
{
    var actobj = $(document.createElement('span')).addClass("eh_add_margin_to_child_link");

    $(document.createElement('span')).addClass("eh_link").text("查看资源").click(resource_func).appendTo(actobj);
    
    $(document.createElement('span')).addClass("eh_link").text("打开课程文件夹").click( function () {
        var diruri = resource_localuri;
        check_path_with_base(diruri, docfolder);
        local_log("[mainpage] open course folder: " + diruri);
        OS.File.exists(OS.Path.fromFileURI(diruri)).then( function (fe) {
            if (fe) {
                launch_fileuri(diruri);
            } else {
                friendly_error("请先进入该站点一次，以进行首次同步。");
            }
        });
    }).appendTo(actobj);

    $(document.createElement('span')).addClass("eh_link").text("在浏览器中打开").click( function () {
        open_site_in_browser(sobj.uuid);
    }).appendTo(actobj);

    return $(create_kvdiv_with_obj("操作: ", actobj));
}

function coursetable_manual_match(cobj)
{
    var check = {value: false};
    var flags = prompts.BUTTON_POS_0 * prompts.BUTTON_TITLE_IS_STRING +
                prompts.BUTTON_POS_1 * prompts.BUTTON_TITLE_IS_STRING;
    var button = prompts.confirmEx(null, "无法找到匹配的站点", "没有找到该课程对应的 eLearning 站点，这可能是因为：\n  (1) 该课程没有使用 eLearning，此情况下您将无法使用相关功能。或者\n  (2) 由于站点名称特殊，程序自动匹配失败，此情况下您可以手动选择一个站点。\n请选择您遇到的情况。",
                                   flags, "我要手动选择一个站点", "该课程没有使用 eLearning", "", null, check);
    if (button != 0) return false;
    var items = [], uuids = [];
    slist.forEach( function (sobj) {
        items.push(sobj.sname);
        uuids.push(sobj.uuid);
    });
    var selected = {};
    var result = prompts.select(null, "请选择一个站点", "请从列表中选择课程 " + cobj.cname + " (" + cobj.cid + ") 对应的 eLearning 站点。", items.length, items, selected);
    if (result && prompts.confirm(null, "确认", "您确定要将课程\n    " + cobj.cname + " (" + cobj.cid + ")\n对应的 eLearning 站点设为\n    " + items[selected.value] + "\n吗？\n\n注意：此操作一旦确认则无法撤销！！！")) {
        user_coursemap[cobj.cid] = uuids[selected.value];
        save_user_coursemap(); // save course=>site map
        coursetable_load(clist); // reload course table
        return true;
    }
    return false;
}

function coursetable_enter(cidx, x, y)
{
    var sidx = match_cname_sname(cidx);
    if (sidx < 0) {
        if (coursetable_manual_match(clist[cidx])) {
            sidx = match_cname_sname(cidx);
        }
    }
    if (sidx >= 0) {
        let cobj = clist[cidx];
        let sobj = slist[sidx];
        let coursefolder = get_coursefolder(cobj, sobj);
        enter_resource_section(sobj, coursefolder, false);
    }
}


/*
    match coursename to sitename
    using global array: clist, sitelist
    return
        index in sitelist if matched
        -1 if non-matched 
*/
function match_cname_sname(cidx)
{
    var sidx = slist.length;

    if (user_coursemap[clist[cidx].cid] != undefined) { // check userdefined map first
        for (sidx = 0; sidx < slist.length; sidx++) {
            if (slist[sidx].uuid === user_coursemap[clist[cidx].cid]) break;
        }
    }
    if (sidx >= slist.length) {
        for (sidx = 0; sidx < slist.length; sidx++) {
            if (slist[sidx].sname.indexOf(clist[cidx].cid) >= 0) break; // class id is in site name
        }
    }
    if (sidx >= slist.length) { // if non-match, use another method
        for (sidx = 0; sidx < slist.length; sidx++) {
            if (slist[sidx].sname.indexOf(clist[cidx].cname) >= 0) break; // full class name is in site name
        }
    }

    if (sidx < slist.length) {
        return sidx; // match OK
    } else {
        return -1; // match failed
    }
}




function load_user_coursemap()
{
    var user_coursemap_path = dbfolder + "/usercoursemap.json";
    read_json_from_fileuri(user_coursemap_path).then( function (new_user_coursemap) {
        user_coursemap = new_user_coursemap.coursemap;
        if (user_coursemap === undefined) user_coursemap = {};
    }, function (reason) {
        console.log("using new coursemap: " + reason);
    });
}
function save_user_coursemap()
{
    var user_coursemap_path = dbfolder + "/usercoursemap.json";
    write_json_to_fileuri({ coursemap: user_coursemap }, user_coursemap_path);
}

function load_sitepathmap()
{
    var sitepathmap_path = dbfolder + "/sitepathmap.json";
    read_json_from_fileuri(sitepathmap_path).then( function (new_sitepathmap) {
        sitepathmap = new_sitepathmap.sitepathmap;
        if (sitepathmap === undefined) sitepathmap = {};
    }, function (reason) {
        console.log("using new sitepathmap: " + reason);
    });
}
function save_sitepathmap()
{
    var sitepathmap_path = dbfolder + "/sitepathmap.json";
    write_json_to_fileuri({ sitepathmap: sitepathmap }, sitepathmap_path);
}


// ==================== site list related functions ======================

var sitelist_reselect_func;

function sitelist_enter(sobj)
{
    enter_resource_section(sobj, get_sitefolder(sobj), false);
}

function sitelist_select(sidx)
{
    $($("#main_sitelist").find("tr").removeClass("eh_selected")[sidx]).addClass("eh_selected");
    
    sitelist_reselect_func = function () {
        sitelist_select(sidx);
    };
    var sobj = slist[sidx];
    var detailobj = $("#main_course_details").empty();
    
    $(create_kvdiv("名称: ", sobj.sname, function () {
        sitelist_enter(sobj);
    })).appendTo(detailobj);

    $(create_kvdiv("UUID: ", sobj.uuid)).appendTo(detailobj);

    detailobj.append(make_action_obj( function () {
        sitelist_enter(sobj);
    }, docfolder + get_sitefolder(sobj), sobj));

    update_mainpage_assignments_announcements(sobj);
}

function sitelist_load(new_slist)
{
    slist = new_slist;
    //console.log(slist);
    
    sitelist_reselect_func = function () {
        $("#main_course_details").html("提示：<ul><li>单击站点可以查看站点详细信息</li><li>双击站点可以进入站点文件列表</li></ul>");
        update_mainpage_assignments_announcements(null);
    };

    var slistobj = $("#main_sitelist").empty();
    var tobj = $("<table></table>");

    var sidx;
    for (sidx = 0; sidx < slist.length; sidx++) {
        let sidx_cb = sidx;
        let sobj = slist[sidx];
        var trobj = $(document.createElement('tr')).click( function () {
                sitelist_select(sidx_cb);
            }).dblclick( function () {
                sitelist_enter(sobj);
            });
        $(document.createElement('td')).append(create_sakai_icon_span("icon-sakai-iframe-site").css("margin", "4px 3px")).appendTo(trobj);
        $(document.createElement('td')).text(sobj.sname).appendTo(trobj);
        trobj.appendTo(tobj);
    }

    tobj.appendTo(slistobj);
    
    sitelist_reselect_func();
}





function update_mainpage_assignments_announcements(saaobj)
{
    if (saaobj === null || saaobj == undefined) {
        $("#main_assignments_list").empty().text("请选择一个课程");
        $("#main_announcements").empty().text("请选择一个课程");
        return;
    }
    
    console.log("update AA", saaobj);

    if (saaobj.have_assignment) {
        var tobj = $("<table><!--<tr><th></th><th>作业标题</th><th>状态</th><th>开始</th><th>截止</th></tr>--></table>");
        saaobj.assignment.forEach( function (aobj) {
            var trobj = $(document.createElement('tr'));
            $(document.createElement('td')).append(create_sakai_icon_span("icon-sakai-assignment-grades").css("margin", "4px 3px")).appendTo(trobj);
            $(document.createElement('td')).text(aobj.title).appendTo(trobj);
            $(document.createElement('td')).text(aobj.status).appendTo(trobj);
//            $(document.createElement('td')).text(format_date(aobj.opendate, "dto")).appendTo(trobj);
            $(document.createElement('td')).text(format_date(aobj.duedate, "dto")).appendTo(trobj);
            trobj.appendTo(tobj);
        });
        if (saaobj.assignment.length == 0) {
            $("<tr><td></td><td>暂无作业</td><td></td><!--<td></td>--><td></td></tr>").appendTo(tobj);
        }

        $("#main_assignments_list").empty().append(tobj);
    } else {
        $("#main_assignments_list").empty().text("此站点没有启用“作业”功能");
    }
    $("#main_announcements").empty().text(saaobj.sname);
}






// ===================== main page related function ========================

var main_list_status = 0; // 0 for coursetable, 1 for sitelist

function switch_sitelist_coursetable(new_status)
{
    if (new_status === 0 || new_status === 1) {
        main_list_status = new_status;
    } if (new_status !== -1) {
        main_list_status = (main_list_status === 1 ? 0 : 1);
    }
    
    if (main_list_status == 0) { // show coursetable
        $("#main_coursetable_status").text("课程表");
        $("#main_coursetable").show();
        $("#main_sitelist").hide();
        reselect_coursetable_func();
    } else { // show sitelist
        $("#main_coursetable_status").text("站点");
        $("#main_coursetable").hide();
        $("#main_sitelist").show();
        sitelist_reselect_func();
    }
}

function init_main_page()
{
    $("#main_coursetable").html(
        '<table><tr><th></th><th>周一</th><th>周二</th><th>周三</th><th>周四</th><th>周五</th></tr>' +
        '<tr><td>1</td><td rowspan="14" colspan="5"><span id="main_loadprogress" style="font-weight: normal;">加载中</span> ... </td></tr>' +
        '<tr><td>2</td></tr><tr><td>3</td></tr><tr><td>4</td></tr><tr><td>5</td></tr><tr><td>6</td></tr><tr><td>7</td></tr><tr><td>8</td></tr>' +
        '<tr><td>9</td></tr><tr><td>10</td></tr><tr><td>11</td></tr><tr><td>12</td></tr><tr><td>13</td></tr><tr><td>14</td></tr></table>'
    );
    show_page("main");
    remove_all_cookies();

    $("#main_coursetable_switchbtn").hide();
    $("#main_course_details").hide();

    /* load data from network:
        slist
        semesterdata
        clist
    */
    var progressobj = $("#main_loadprogress");
    progressobj.text("登录 UIS 中");
    local_log("[maininit] login to UIS");
    uis_login().then( function () {
        // uis login OK, we should login to elearning
        progressobj.text("登录 eLearning 中");
        local_log("[maininit] login to elearning");
        elearning_login().then( function () {
            // elearning login OK, we should fetch sitelist
            progressobj.text("获取站点数据");
            local_log("[maininit] fetch sitelist");
            elearning_fetch_sitelist().then( function (slist_input) {
                sitelist_load(slist_input); // save fetched slite to global var
                // slist fetched OK, we should query for course table
                progressobj.text("获取学期数据");
                local_log("[maininit] fetch semester data");
                urp_fetch_semesterdata().then( function (semesterdata) {
                    // current semester is saved in semesterdata.cursid
                    progressobj.text("获取课程表数据");
                    local_log("[maininit] fetch course table");
                    cur_semestername = semesterdata.smap[semesterdata.cursid];
                    urp_fetch_coursetable(semesterdata.cursid).then( function (clist) {
                        // load clist data
                        local_log("[maininit] init OK");
                        coursetable_load(clist);
                        switch_sitelist_coursetable(-1);
                        //show_msg("load clist OK");
                        progressobj.hide();
                        $("#main_coursetable_switchbtn").show();
                        $("#main_course_details").show();
                    }, function (reason) {
                        abort("can't fetch urp coursetable");
                    })
                }, function (reason) {
                    abort("can't fetch semesterdata: " + reason);
                });
            }, function (reason) {
                abort("can't fetch sitelist: " + reason);
            });
        }, function (reason) {
            abort("elearing login failed: " + reason);
        });
    }, function (reason) {
        abort("uis login failed: " + reason);
    });
}
















// temporary for testing purpose
function test()
{
    //webdav_sync("https://elearning.fudan.edu.cn", "https://elearning.fudan.edu.cn/dav/0b63d236-4fe9-4fbd-9e6b-365a250eeb2c"); // li san shu xue
    //webdav_sync("https://elearning.fudan.edu.cn", "https://elearning.fudan.edu.cn/dav/24ea24fd-0c39-49de-adbe-641d1cf4a499"); // shu ju ku

    /*webdav_binary_xhr("http://adfkljdsjkf.com/asdf").then(function (data) {
        console.log(data.toString());
        show_msg("OK");
    }, function (reason) {
        abort(reason);
    });*/

    /*var writePath = OS.Path.join(OS.Constants.Path.desktopDir, 'test.txt');
    var promise = OS.File.writeAtomic(writePath, "abcdefg", { tmpPath: writePath + '.tmp' });
    promise.then(
        function(aVal) {
            console.log('successfully saved image to disk');
        },
        function(aReason) {
            console.log('writeAtomic failed for reason:', aReason);
        }
    );*/


    //return;

    


}


// this will be called in helloworld() in 'xulmain.js'
function helloworld2()
{

    alert("hello from child!");
}










// ======================= login page related functions =======================

function init_login_page()
{
    $("#loginerrmsg").hide().text("");
    $("#loginusername").prop("disabled", false);
    $("#loginpassword").prop("disabled", false);
    $("#loginrememberme").prop("disabled", false);
    $("#loginbtn").text("登录").prop("disabled", false);
    
    $("#loginusername").val(el_username);
    $("#loginpassword").val(el_password);
    $("#loginrememberme").prop("checked", el_rememberme);

    var kpfn = function (e) {
        if (e.keyCode == 13 && !$("#loginbtn").prop("disabled")) {
            eh_login();
        }
    };
    $("#loginusername").unbind("keypress").keypress(kpfn);
    $("#loginpassword").unbind("keypress").keypress(kpfn);
    
    show_page("login");
    
    if (el_username == "") {
        $("#loginusername").focus();
    } else {
        $("#loginpassword").focus();
    }
}

function eh_login()
{
    el_username = $("#loginusername").val();
    el_password = $("#loginpassword").val();
    el_rememberme = $("#loginrememberme").prop("checked");
    $("#loginerrmsg").hide().text("");
    $("#loginusername").prop("disabled", true);
    $("#loginpassword").prop("disabled", true);
    $("#loginrememberme").prop("disabled", true);
    $("#loginbtn").text("正在登录").prop("disabled", true);
    //console.log(el_username, el_password, el_rememberme);
    local_log("[login] login start (rememberme = " + el_rememberme + ")");
    remove_all_cookies();
    uis_login().then( function () {
        save_prefs();
        local_log("[login] login OK");
        init_main_page();
    }, function (reason) {
        local_log("[login] login failed (reason = " + get_friendly_part(reason) + ")");
        $("#loginerrmsg").show().text(get_friendly_part(reason));
        $("#loginusername").prop("disabled", false);
        $("#loginpassword").prop("disabled", false);
        $("#loginrememberme").prop("disabled", false);
        $("#loginbtn").text("登录").prop("disabled", false);
    });
}

function eh_logout()
{
    local_log("[logout] logout");
    el_password = "";
    save_prefs();
    init_login_page();

    // we should exit program when logout
    // because there is no way to logout WebDAV

    // FIXME
}










// ======================= about page related function ===================

var aboutpage_lastpage = "";
function aboutpage_goback()
{
    local_log("[about] goback");
    var aobj = $("#ymtaudio")[0];
    if (!aobj.paused) aobj.pause();
    show_page(aboutpage_lastpage);
}
function show_about()
{
    local_log("[about] enter");
    // remember where we come from
    aboutpage_lastpage = current_page;
    
    $("#about_licensebox").hide();
    $("#about_debugbox").hide();
    $("#about_mainbox").show();

    show_page("about");
    $("#about_licensesbox").scrollTop(0);
    $("#about_aboutsbox").scrollTop(0);
}


function show_debug_tools()
{
    local_log("[about] show debug tools");
    $("#ymttitle").hide();
    try {
        $("#ymtaudio")[0].currentTime = 0;
    } catch (e) {
    }
    $("#about_mainbox").hide();
    $("#about_debugbox").show();
    $("#about_debugsbox").scrollTop(0);
}


function show_license()
{
    $("#about_mainbox").hide();
    $("#about_licensebox").show();
}


function initp_about()
{
    $("#about_versiontext").text(eh_version);
    $("#about_sysinfo").text(
        "Gecko " + window.parent.xulappinfo.platformVersion + " / " + eh_os + "\n" +
        "name: " + window.parent.sysinfo.getProperty("name") + "\n" +
        "version: " + window.parent.sysinfo.getProperty("version") + "\n" +
        "arch: " + window.parent.sysinfo.getProperty("arch") + "\n" + 
        "host: " + window.parent.sysinfo.getProperty("host") + "\n");
    $("#about_pathinfo").text(
        "libxul: " + OS.Constants.Path.libxul + "\n" +
        "profileDir: " + OS.Constants.Path.profileDir + "\n" +
        "homeDir: " + OS.Constants.Path.homeDir + "\n" +
        "desktopDir: " + OS.Constants.Path.desktopDir + "\n" +
        "docfolder: " + ndocfolder + "\n" +
        "datafolder: " + datafolder + "\n" + 
        "logfile: " + eh_logfile + "\n");

    $("#jtxjimage").click( function () {
        var aobj = $("#ymtaudio")[0];
        if (aobj.paused) {
            local_log("[about] start YMT playback");
            $("#ymttitle").show();
            aobj.play();
        } else {
            local_log("[about] pause YMT playback");
            $("#ymttitle").hide();
            aobj.pause();
        }
    });
    $("#ymtaudio").bind("ended", function () {
        $("#ymttitle").hide();
    });
    
    return new Promise( function (resolve, reject) {
        $.get("license.txt", null, null, "text")
        .done( function (data, textStatus, jqXHR) {
            $("#about_licensetext").html(data);
            resolve();
        }).fail ( function (xhr, textStatus, errorThrown) {
            reject("can't load license text: " + textStatus + ", " + errorThrown);
        });
    });
}










// ======================= settings page related function ===================



function show_settings()
{
    local_log("[settings] enter");
    var cch = $("#settingsbox").children("div");
    var ch = $("#settingsdescbox").children("div");
    var resetfunc = function () {
        ch.hide();
        ch.filter("[data-sdescref='empty']").show();
        $("#settingsdesctitle").empty().hide();
        cch.css("background-color", "");
    };
    resetfunc();

    cch.unbind('mouseenter mouseleave change');
    load_settings(cch);
    cch.each( function (index, element) {
        let ref = $(element).attr("data-sdescref");
        let title = $(element).children("label").text();
        $(element).hover( function () {
            ch.hide();
            ch.filter("[data-sdescref='" + ref + "']").show();
            $("#settingsdesctitle").text(title).show();
            $(this).css("background-color", "white");
            local_log("[settings] hover (ref = " + ref + ", title = " + title + ")");
        }, resetfunc);
        if (ref != "df") {
            $(element).change( function () {
                local_log("[settings] change (value = " + cch.filter("[data-sdescref='" + ref + "']").children("input").prop("checked") + ", title = " + title + ")");
                save_settings(cch);
            });
        }
    });

    $("#settingssaved").hide();
    show_page("settings");
}
function load_settings(cch)
{
    cch.filter("[data-sdescref='ubv']").children("input").prop("checked", usebuiltinviewer);
    cch.filter("[data-sdescref='ubb']").children("input").prop("checked", usebuiltinbrowser);
    cch.filter("[data-sdescref='sow']").children("input").prop("checked", syncoverwrite);
    cch.filter("[data-sdescref='df']").children("input").val(ndocfolder);
    cch.filter("[data-sdescref='ssl']").children("input").val(format_filesize(syncsizelimit));
    cch.filter("[data-sdescref='sie']").children("input").val(syncignoreext_str);
}
function save_settings(cch)

{
    usebuiltinviewer = cch.filter("[data-sdescref='ubv']").children("input").prop("checked");
    usebuiltinbrowser = cch.filter("[data-sdescref='ubb']").children("input").prop("checked");
    syncoverwrite = cch.filter("[data-sdescref='sow']").children("input").prop("checked");
    syncignoreext_str = cch.filter("[data-sdescref='sie']").children("input").val();
    syncsizelimit = parse_filesize(cch.filter("[data-sdescref='ssl']").children("input").val());
    save_prefs();
    $("#settingssaved").show();
}
function select_docfolder()
{
    var nsIFilePicker = Components.interfaces.nsIFilePicker;
    var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
    fp.init(window, "请选择文档文件夹", nsIFilePicker.modeGetFolder);
    var olddf = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces["nsILocalFile"]);
    olddf.initWithPath(ndocfolder);
    fp.displayDirectory = olddf;
    var rv = fp.show();
    if (rv == nsIFilePicker.returnOK || rv == nsIFilePicker.returnReplace) {
        var path = fp.file.path;
        if (path != ndocfolder) {
            console.log(path);
            $("#settings_docfolder").val(path);
            set_unicode_pref(prefs, "docfolder", path);
            ndocfolder = path;
            local_log("[settings] change docfolder to " + ndocfolder);
            flush_local_log().then( function () {
                initp_docfolder().then( function () {
                    initp_createdirs().then( function () {
                        initp_tools().then( function () {
                            $("#settingssaved").show();
                        });
                    });
                });
            });
        }
    }
}












// ======================= XUL related functions =========================


// check if we should popup menu when we clicked on 'element'
// used in xulmain.js
function should_popupmenu(element)
{
    console.log("popupmenu", element);
    var a = $(".eh_xul_popupmenu");
    for (var i = 0; i < a.length; i++)
        if ($.contains(a[i], element) || a[i] == element)
            return true;
    return false;
}

// clipboard related functions
function cut_to_clipboard(element)
{
    document.execCommand('cut', false, undefined);
    //window.parent.set_clipboard_text($(element).extractSelectedText());
}
function copy_to_clipboard(element)
{
    document.execCommand('copy', false, undefined);
    //window.parent.set_clipboard_text($(element).getSelection().text);
}
function paste_from_clipboard(element)
{
    /*var text = window.parent.get_clipboard_text();
    if (text != "") {
        $(element).replaceSelectedText(text);
    }*/
    document.execCommand('paste', false, undefined);
}
function doc_exec_cmd(element, cmd)
{
    document.execCommand(cmd, false, undefined);
}


/*
    open url in browser (either external or builtin)
    option:
    {
        use: "builtin" or "external" // override default setting
    }
*/

function open_in_browser(url, opt)
{
    var flag = usebuiltinbrowser;
    if (opt !== undefined && opt.use === "builtin") flag = true;
    if (opt !== undefined && opt.use === "external") flag = false;

    if (flag) {
        window.open(url, '_blank', 'resizable,scrollbars')
        
    } else {
        console.log("OPEN IN EXRERNAL BROWSER", url, opt); // FIXME
        var iosvc = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);
        var auri = iosvc.newURI(url, null, null);
        var psvc = Components.classes["@mozilla.org/uriloader/external-protocol-service;1"].getService(Components.interfaces.nsIExternalProtocolService);
        psvc.loadUrl(auri);
    }
}

function open_elearning_url(url)
{
    uis_login().then( function () {
        open_in_browser(url);
    });
}
function open_site_in_browser(uuid)
{
    open_elearning_url("https://elearning.fudan.edu.cn/portal/site/" + uuid);
}

/*
    onclick handler on eh_link spans
*/
function fake_link_handler(obj, opt)
{
    var url = $(obj).attr("data-url");
    url = url ? url : $(obj).text();
    open_in_browser(url, opt);
}
