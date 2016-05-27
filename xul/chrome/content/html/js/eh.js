// ======================== global variables ===========================

var OS; // it's a copy of window.parent.OS
var Services; // it's a copy of window.parent.Services
var prefs; // it's a copy of window.parent.prefs


// prefs
var eh_debug, eh_dbglocallog;
var el_username; // elearning username
var el_password; // elearning password
var el_rememberme;
var usebuiltinviewer; // use builtin pdfviewer or not
var page_limit; // pdfviewer page limit
var usebuiltinbrowser; // use builtin browser or not
var syncoverwrite; // overwrite files while sync or not

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
function preventdefaultfunc (e) { e.preventDefault(); };





/*
    check if filename is legal
    filename can be a directory
    throw exception when filename is illegal
*/
function check_filename(filename)
{
    // FIXME: is this enough?
    var ilchar = "*|\\:\"<>?/";
    for (var i = 0; i < ilchar.length; i++) {
        if (filename.indexOf(ilchar.charAt(i)) >= 0) {
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


function local_log(msg)
{
    if (eh_debug && eh_dbglocallog) {
        var c = new Date();
        return new Promise( function (resolve, reject) {
            console.log("LOCAL LOG: " + msg);
            window.parent.mylog("LOCAL LOG: " + msg);
            OS.File.open(eh_logfile, { write: true, append: true }).then( function (f) {
                var str = "[" + format_date(c, "dtsm") + "] " + msg + "\n";
                var encoder = new TextEncoder();
                var array = encoder.encode(str);
                f.write(array).then( function (len) {
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
    } else {
        return 0;
    }
}


function get_filetype_remote_iconuri(ext)
{
    switch (ext.toLowerCase()) {
        case "ppt": case "pptx": return "http://elearning.fudan.edu.cn/library/image/sakai/ppt.gif";
        case "doc": case "docx": return "http://elearning.fudan.edu.cn/library/image/sakai/word.gif";
        case "xls": case "xlsx": return "http://elearning.fudan.edu.cn/library/image/sakai/excel.gif";
        case "pdf": return "http://elearning.fudan.edu.cn/library/image/sakai/pdf.gif";
        case "jpg": case "jpeg": case "png": case "gif": case "bmp": case "tif": case "tiff":
            return "http://elearning.fudan.edu.cn/library/image/sakai/image.gif";
        case "zip": case "rar": case "dmg": case "7z": case "tar": case "xz": case "gz": case "bz2":
            return "http://elearning.fudan.edu.cn/library/image/sakai/compressed.gif";
        case "txt": case "c": case "cpp": case "h": case "java": case "py": case "sh": case "sql":
            return "http://elearning.fudan.edu.cn/library/image/sakai/text.gif";
        case "htm": case "html": case "js": case "css": case "json":
            return "http://elearning.fudan.edu.cn/library/image/sakai/html.gif";
        case "exe": case "jar": case "class": case "o": case "a":
            return "http://elearning.fudan.edu.cn/library/image/sakai/binary.gif";
        default: return "http://elearning.fudan.edu.cn/library/image/sakai/generic.gif";
    }
}

var filetype_icon_set;
function get_filetype_iconuri(ext)
{
    var remoteuri = get_filetype_remote_iconuri(ext);
    var filename = get_basename(remoteuri);
    var filepath = OS.Path.join(datafolder, "fileicons", filename);
    if (filetype_icon_set.has(ext)) {
        return OS.Path.toFileURI(filepath);
    } else {
        OS.File.exists(filepath).then( function (fe) {
            var addtoset = function (ext) {
                if (!filetype_icon_set.has(ext)) {
                    filetype_icon_set.add(ext);
                    var f = OS.Path.toFileURI(OS.Path.join(datafolder, "fileicons", "known.json"));
                    var arr = new Array();
                    for (var val of filetype_icon_set) arr.push(val);
                    write_json_to_fileuri(arr, f);
                }
            }
            if (!fe) {
                install_file(remoteuri, filepath).then( function () {
                    addtoset(ext);
                });
            } else {
                addtoset(ext);
            }
        });
        
        return remoteuri; // because we can't wait for promise, so we just return remoteuri
    }
}
function initp_filetype_icon()
{
    return new Promise( function (resolve, reject) {
        var f = OS.Path.toFileURI(OS.Path.join(datafolder, "fileicons", "known.json"));
        read_json_from_fileuri(f).then( function (obj) {
            filetype_icon_set = new Set(obj);
            resolve();
        }, function () {
            filetype_icon_set = new Set();
            resolve();
        });
    });
}


function launch_fileuri(fileuri)
{
    var file = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces["nsILocalFile"]);
    file.initWithPath(OS.Path.fromFileURI(fileuri));
    file.launch();

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
                number = (f * (d.getMonth() - c.getMonth()) + 12) % 12;
                unit = "个月";
                if (number <= 1) color = "darkgreen";
                else if (number <= 3) color = "black";
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
            return desc;
        }
    } else {
        return base;
    }
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
    else return sq(vdet(v1, v2)) / vlensq(v1);
}
function dist_p2s(p, a, b) { return Math.sqrt(distsq_p2s(p, a, b)); }

// ======================== showing debug messages ===========================

function do_output(str)
{
    Materialize.toast(str, 10000);
    console.log(str);
}
function show_error(str)
{
    do_output("ERROR: " + str);
}
function show_msg(str)
{
    do_output("MSG: " + str);
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
    str = "错误: " + str;
    local_log("friendly_error: " + str);
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
        "navigate",
        "select",
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

    canvas_resetselected();

    
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


var did_selected; // id of selected dobj, -1 if none selected


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
        // get canvas size, for redraw
        var canvas = document.getElementById('pdf_page_temp');
        canvas_size = { x: canvas.width, y: canvas.height };
                    
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
    return new Array();
}

// clear canvas
function canvas_clearpage()
{
    drawlist = new_canvas_data();
    lastdraw = 0;
    canvas_resetselected();
    canvas_clearsingle('pdf_page_draw');
    canvas_clearsingle('pdf_page_temp');
}

// called when loading a new page
function canvas_loaddata(data)
{
    drawlist = data;
    lastdraw = 0;
    canvas_resetselected();
    canvas_clearsingle('pdf_page_draw');
    canvas_clearsingle('pdf_page_temp');
    canvas_redraw();
}



/* return distance to object */
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
function canvas_selectobject(ccoord)
{
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
    return ret;
}

function canvas_removeselected()
{
    if (did_selected < 0) return;
    local_log("[draw] remove object (id = " + did_selected + ")");
    drawlist.splice(did_selected, 1);
    canvas_resetselected();
    lastdraw = 0;
}

function canvas_resetselected()
{
    if (did_selected >= 0) {
        $("#viewfile_dtoolbox").hide();
        did_selected = -1;
        canvas_redraw();
    }
    $("#viewfile_deditbox").hide();
}

/* select object by mouse */
function canvas_mouseselect(mcoord)
{
    var ccoord = canvas_m2c(mcoord);
    var ncoord = canvas_c2n(ccoord);

    var did = canvas_selectobject(ccoord);
    if (did < 0) {
        canvas_resetselected();
        return;
    }

    did_selected = did;
    local_log("[draw] select object (id = " + did_selected + ")");

    console.log(drawlist[did]);
    
    canvas_redrawselected();

    select_color(get_color_id(drawlist[did_selected].color), false);
    select_thickness(get_thickness_id(drawlist[did_selected].thickness), false);
    
    $("#viewfile_dtoolbox").show();
    $("#viewfile_deditbox").show();
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



function init_canvas() // will be called once in global init function
{
    $('#pdf_page_front').mousedown( function (e) {
        if (!is_dtype_drawtype(dtype_selected)) return;
        var dtype = get_dtype(dtype_selected);
        e.preventDefault();
        
        // get canvas offset
        var off = $("#pdf_page_temp").offset();
        canvas_offset = { x: off.left, y: off.top };

        // get canvas size
        var canvas = document.getElementById('pdf_page_temp');
        canvas_size = { x: canvas.width, y: canvas.height };

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
            var mcoord = { x: e.pageX, y: e.pageY };
            canvas_mouseselect(mcoord);
        }
        e.preventDefault();
    });
    $(document).mousemove( function (e) {
        if (is_painting) {
            var mcoord = { x: e.pageX, y: e.pageY };
            canvas_addmousedata(mcoord);
        }
    });
    $(document).mouseup( function (e) {
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
    p.push(OS.File.makeDir(OS.Path.join(datafolder, "fileicons"), { ignoreExisting: true, from: datafolder }));
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


    // configure datafolder first

    datafolder = prefs.getCharPref("datafolder");
    if (datafolder == "") {
        datafolder = OS.Path.join(OS.Constants.Path.profileDir, "ehdata");
        prefs.setCharPref("datafolder", datafolder);
    }

    // use promise to configure docfolder
    new Promise( function (resolve, reject) {
        ndocfolder = prefs.getCharPref("docfolder");
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
                        prefs.setCharPref("docfolder", ndocfolder);
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
        // set other folders
        docfolder = OS.Path.toFileURI(ndocfolder);
        ndbfolder = OS.Path.join(ndocfolder, "ehdb");
        dbfolder = OS.Path.toFileURI(ndbfolder);

        eh_logfile = OS.Path.join(ndbfolder, "ehlog.txt");
        
        Promise.all([
            OS.File.makeDir(ndocfolder, { ignoreExisting: true }),
            OS.File.makeDir(datafolder, { ignoreExisting: true, from: OS.Constants.Path.profileDir })
        ]).then( function () {
            init_colorbox();
            init_thicknessbox();
            reset_dtype();
            init_canvas();
            init_notebox();

            initp_createdirs().then( function () {
                // initp_* returns promises
                Promise.all([
                    initp_filetype_icon(),
                    initp_tools(),
                    initp_about()
                ]).then ( function () {

                    $("#splashdiv").hide();
                    local_log("========= init ok ==========");
                    
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
    $("#viewfile_notebox").scrollTop(0).html(notebox_data.html);
    window.getSelection().removeAllRanges();
}

function save_notebox_data()
{
    if (notebox_data) {
        notebox_data.html = $("#viewfile_notebox").html();
    }
}

function init_notebox()
{
    // make paste become plain paste
    // ref: http://stackoverflow.com/questions/12027137/javascript-trick-for-paste-as-plain-text-in-execcommand
    document.getElementById('viewfile_notebox').addEventListener("paste", function (e) {
        e.preventDefault();
        if (e.clipboardData) {
            content = (e.originalEvent || e).clipboardData.getData('text/plain');
            document.execCommand('insertText', false, content);
        } else if (window.clipboardData) {
            content = window.clipboardData.getData('Text');
            document.selection.createRange().pasteHTML(content);
        }  
    });

    document.getElementById('viewfile_notebox').addEventListener("input", save_notebox_data, false);
}








// ====================== PDF related functions =======================

var pdf_thumbnail_div_list;
var selected_pdf_page;
var pdf_note_data;


var pdf_page_loading_task_id = 0; // previous task id

var pdf_page_loading_status = {
    page_id: -1, // the page now rendering
    task_id: 0, // unique task id, increased when creating a new task
    rtask: undefined // rtask: current render task
};


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
    return new Promise(function (resolve, reject) {
        $('#pdf_page_list').empty();
        canvas_clearsingle("pdf_page_view");
        reset_dtype();

        local_log("[pdfviewer] open document (path = " + pdf_path + ")");

        var ndata_path = pdf_path + ".ehnotes";

        // generate save_pdf_notes() function
        save_pdf_notes = function () {
            return write_json_to_fileuri(pdf_note_data, ndata_path);
        };
        
        // load pdf_note_data first
        new Promise(function (resolve, reject) {
            read_json_from_fileuri(ndata_path).then( function (obj) {
                pdf_note_data = obj;
                resolve();
            }, function () {
                pdf_note_data = {};
                resolve();
            });
        }).then( function () {
            // this function is call when user enters "viewfile" page
            PDFJS.getDocument(pdf_path).then( function (pdf) {
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

                var load_thumbnail = function (page_id) {
                    return new Promise( function (resolve, reject) {
                        pdf.getPage(page_id).then( function (page) {
                            var scale = 1.0;
                            var viewport = page.getViewport(scale);
                            var cur_canvas = canvasarray[page_id];
                            var cur_canvas_width = parseInt($(cur_canvas).css("width")) - 2;
                            
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
                            
                            page.render(renderContext);
                            //show_msg(page_id);
                            resolve();
                        });
                    });
                };

                var load_thumbnail_all = function (cur) {
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
                            file.initWithPath("c:\\windows\\system32\\cscript.exe");
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
                save_pdf_notes().then( function () {
                    show_page("filenav");
                });
            });
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
    return new Promise( function (resolve, reject) {
        // send WebDAV PROPFIND request
        $.ajax({
            type: "PROPFIND",
            url: "http://elearning.fudan.edu.cn/dav/" + uuid,
            context: document.body,
            dataType: "xml",
            username: el_username,
            password: el_password,
            headers: {  "Depth": "infinity",
                        //"Authorization": "Basic " + btoa(el_username + ":" + el_password), // sometimes fails
                     },
            success:    function (xml, status) {

                            var dlist = new Array();
                            var flist = new Array();
                            
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
                                    dlist.push(cur);
                                } else {
                                    flist.push(cur);
                                }
                            });

                            resolve({
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

    var target_uri = localbase + subpath;
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
function webdav_download_single(fitem, localbase, xhrprogresscallback)
{
    var target_uri = localbase + fitem.path;
    check_path_with_base(target_uri, localbase);
    return new Promise( function (resolve, reject) {
        var url = "http://elearning.fudan.edu.cn" + fitem.href;
        var target_native = OS.Path.fromFileURI(target_uri);
        
        //show_msg("url=" + url + " file=" + target_native);

        webdav_binary_xhr(url, xhrprogresscallback).then(function (data) { // onsuccess
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
function webdav_sync_single(fitem, sdfitem, localbase, fstatus, update_count_callback)
{
    var target_uri = localbase + fitem.path;
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
                if (fexists && !syncoverwrite) {
                    // file exists, and user requires no overwrite
                    resolve(false);
                    return;
                }
                if (!sdfitem) {
                    // no current file in previous data, download it
                    resolve(true);
                    return;
                }
                if (sdfitem.lastmodified != fitem.lastmodified || sdfitem.etag != fitem.etag) {
                    // file changed (etag, lastmodified), download it
                    resolve(true);
                    return;
                }
                if (!fexists) {
                    // file not exists (may be deleted), download it
                    resolve(true);
                    return;
                }
                resolve(false);
            }, function (reason) {
                reject("can't check file existance: " + reason);
            });
        }).then( function (shoulddownload) {
            if (shoulddownload) {
                //console.log("file not exists, download: " + fitem.path);
                statuslist_update(fstatus, "准备下载", "blue");
                update_count_callback(0, 1);
                webdav_download_single(fitem, localbase, function (e) { // xhrprogresscallback
                    if (e.lengthComputable) {
                        var v = Math.round((e.loaded / e.total) * 100);
                        statuslist_update(fstatus, "下载中 (" + v.toString() + "%)", "blue");
                    }
                }).then( function () {
                    statuslist_update(fstatus, "下载成功", "green", " (新)", "red");
                    update_count_callback(1, 0);
                    fitem.is_new_file = true;
                    resolve(1);
                }, function (reason) { // onerror
                    statuslist_update(fstatus, "下载失败", "red");
                    reject("download single failed: " + reason);
                });
            } else {
                statuslist_update(fstatus, "无需下载", "green");
                fitem.is_new_file = false;
                resolve(0);
            }
        }, function (reason) {
            reject("can't judge download status: " + reason);
        });
    });
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
    return new Promise( function (resolve, reject) {
        // create course folder
        var localbase = docfolder + coursefolder;
        check_path_with_base(localbase, docfolder);
        webdav_create_localpath(docfolder, coursefolder).then( function () {
            // read previous sync data
            var sdstatus = statuslist_appendprogress(statuslist, "正在检查同步状态");
            new Promise(function (resolve, reject) {
                read_json_from_fileuri(syncdatafile).then( function (obj) {
                    // read ok, use the data as syncdata
                    statuslist_update(sdstatus, "上次同步于 " + format_date(new Date(obj.timestamp), "do"), "green");
                    resolve(obj);
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
                                        webdav_sync_single(fitem, sdfmap.get(fitem.path), localbase, fstatus,
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
                                    if (sum == 0) {
                                        // we have no new files, we should set fitem.is_new_file to previous status
                                        lobj.flist.forEach( function (fitem) {
                                            var sdfitem = sdfmap.get(fitem.path);
                                            assert(sdfitem != undefined);
                                            fitem.is_new_file = sdfitem.is_new_file;
                                        });
                                    }
                                    
                                    statuslist_append(statuslist, "同步完成，共有 " + sum + " 个新文件", "green");
                                    lobj.timestamp = new Date().getTime();
                                    console.log(syncdatafile);
                                    write_json_to_fileuri(lobj, syncdatafile).then( function () {
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
        $.post("https://uis2.fudan.edu.cn/amserver/UI/Login", {
                    "IDToken0": "",
                    "IDToken1": el_username,
                    "IDToken2": el_password,
                    "IDButton": "Submit",
                    "goto": "",
                    "encoded": "false",
                    "inputCode": "",
                    "gx_charset": "UTF-8",
                }, null, "text").done( function (data, textStatus, jqXHR) {
                    if (data.indexOf("Please Wait While Redirecting to console") > -1) {
                        //show_msg("Login to UIS - OK!");
                        resolve();
                    } else if (data.indexOf("用户名或密码错误") > -1) {
                        reject("####用户名或密码错误####UIS login check failed");
                    } else if (data.indexOf("验证码错误") > -1) {
                        reject("captcha required");
                    } else {
                        reject("UIS login check failed");
                    }
                }).fail( function (xhr, textStatus, errorThrown) {
                    reject("####网络连接失败####UIS login failed: " + textStatus + ", " + errorThrown);
                });
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
        $.get("http://elearning.fudan.edu.cn/portal/login", null, null, "text")
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


/*
    fetch site list from elearing (use mobile version elearning)
    return value is a promise
    before calling this function, elearing must be logged in
*/
function elearning_fetch_sitelist()
{
    return new Promise( function (resolve, reject) {
        $.get("http://elearning.fudan.edu.cn/portal/pda", null, null, "html")
            .done( function (data) {
                var slist = new Array();
                $(data).find("#pda-portlet-site-menu").children("li").each(function (index, element) {
                    var slink = $(element).find("a");
                    
                    var sname = slink.attr("title");
                    var suuid = slink.attr("href").split("/").pop();

                    slist.push({
                        sname: sname,
                        uuid: suuid,
                    });
                });

                resolve(slist);
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
    /*return new Promise( function (resolve, reject) {
        //Services.cookies.add("jwfw.fudan.edu.cn", "/eams", "semester.id", semester_id, false, true, false, 0x7fffffff);
        $.get("http://jwfw.fudan.edu.cn/eams/courseTableForStd!index.action").done( function (data) {
            // grep ids
            var ids_data = data.match(/bg\.form\.addInput\(form,"ids","(\d+)"\);/);
            if (!ids_data || !ids_data[1]) { reject("parse error: can't find ids"); return; }
            var ids = ids_data[1];
            $.post("http://jwfw.fudan.edu.cn/eams/courseTableForStd!courseTable.action", {
                "ignoreHead": "1",
                "setting.kind": "std",
                "startWeek": "1",
                "semester.id": semester_id,
                "ids": ids,
            }, null, "text").done( function (data, textStatus, jqXHR) {
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
                
                resolve(clist);
                
            }).fail( function (xhr, textStatus, errorThrown) {
                reject("courseTableForStd!courseTable.action failed: " + textStatus + ", " + errorThrown);
            });
        }).fail( function (xhr, textStatus, errorThrown) {
            reject("courseTableForStd!index.action failed: " + textStatus + ", " + errorThrown);
        });
    });*/
    return new Promise( function (resolve, reject) {
                $.get("file:///C:/testdata/ctct.txt", null, null, "text").done( function (data, textStatus, jqXHR) {
                console.log(data);
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

                console.log(clist);
                resolve(clist);
                
            }).fail( function (xhr, textStatus, errorThrown) {
                reject("courseTableForStd!courseTable.action failed: " + textStatus + ", " + errorThrown);
            });});
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
    /*return new Promise( function (resolve, reject) {
        $.get("http://jwfw.fudan.edu.cn/eams/courseTableForStd!index.action").done( function (data, textStatus, request) {
            // last GET response should set 'semester.id' cookie
            var cur_semester = parseInt(request.getAllResponseHeaders().match(/semester\.id=(\d+)/)[1]);
            
            // send POST to get semester list
            $.post("http://jwfw.fudan.edu.cn/eams/dataQuery.action", {
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
        }).fail( function (xhr, textStatus, errorThrown) {
            reject("courseTableForStd!index.action failed: " + textStatus + ", " + errorThrown);
        });
    });*/
    return new Promise( function (resolve, reject) {
    $.get("file:///C:/testdata/ctidx.txt", null, null, "text").done( function (data, textStatus, request) {
    var cur_semester = "202";
    $.get("file:///C:/testdata/dq.txt", null, null, "text").done( function (data, textStatus, jqXHR) {
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
                console.log(cur_semester, semesterlist);
                setTimeout(function () {
                    resolve({
                        smap: semesterlist,
                        cursid: cur_semester,
                    });
                }, 200);
            }).fail( function (xhr, textStatus, errorThrown) {
                reject("dataQuery.action failed: " + textStatus + ", " + errorThrown);
            });});});
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
var cur_semestername; // current semester name

function get_coursefolder(cobj)
{
    check_filename(cur_semestername);
    check_filename(cobj.cname);
    return "/" + cur_semestername + "/" + cobj.cname;
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
    // copy clist_input to clist
    clist = clist_input;

    // clear cdivlist
    cdivlist = new Array();
    
    // construct ctable
    // ctable[x][y]:  x -> weekday, y -> course sequence number
    var maxx = 5;
    var maxy = 14;
    var ctable = new Array();
    for (var i = 1; i <= maxx; i++) {
        ctable[i] = new Array();
        for (var j = 0; j <= maxy; j++) {
            ctable[i][j] = -1;
        }
    }

    // construct course table
    clist.forEach( function (element, index, array) {
        element.ctime.forEach( function (ct) {
            ctable[ct[0]][ct[1]] = index;
        });
    });

    var tobj = $("<table><tr><th></th><th>周一</th><th>周二</th><th>周三</th><th>周四</th><th>周五</th></tr></table>");
    
    for (var y = 1; y <= maxy; y++) {
        var trobj = $(document.createElement('tr'));
        $(document.createElement('td')).text(y.toString()).appendTo(trobj);
        for (var x = 1; x <= maxx; x++) {
            var cidx = ctable[x][y]; // course index in clist
            if (cidx >= 0 && y > 1 && cidx == ctable[x][y - 1]) continue;
            var tdobj = $(document.createElement('td'));
            if (cidx >= 0) {
                var y2;
                for (y2 = y + 1; y2 <= maxy && ctable[x][y2] == cidx; y2++);
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

    $("#main_course_details").html("提示：<ul><li>单击课程可以查看课程详细信息</li><li>双击课程可以进入课程文件列表</li></ul>");
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
    
    if (sidx >= 0) {
        let cidx_cb = cidx;
        let x_cb = x;
        let y_cb = y;
        $(create_kvdiv("名称: ", cobj.cname + " (" + cobj.cid + ")", function () {
            local_log("[mainpage] enter course site by clicking link (cidx = " + cidx.toString() + ")");
            coursetable_enter(cidx_cb, x_cb, y_cb);
        })).appendTo("#main_course_details");
    } else {
        $(create_kvdiv("名称: ", cobj.cname + " (" + cobj.cid + ")")).appendTo(detailobj);
    }
    $(create_kvdiv("教师: ", cobj.cteacher)).appendTo(detailobj);
    $(create_kvdiv("地点: ", cobj.cclassroom)).appendTo(detailobj);
    $(create_kvdiv("时间: ", make_ctime_str(ctimelist))).appendTo(detailobj);
    $(create_kvdiv("开课周: ", make_avlweek_string(cobj.cavlweek))).appendTo(detailobj);

    if (sidx >= 0) {
        var actobj = $(document.createElement('span'));
        $(document.createElement('span')).addClass("eh_link").text("打开课程文件夹").click( function () {
            var diruri = docfolder + get_coursefolder(cobj);
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

        detailobj.append($(create_kvdiv_with_obj("操作: ", actobj)));
    }
}

function coursetable_enter(cidx, x, y)
{
    var sidx = match_cname_sname(cidx);
    if (sidx >= 0) {
        // found matched site
        show_page("filenav");

        let cobj = clist[cidx];
        let sobj = slist[sidx];
        let coursefolder = get_coursefolder(cobj);
        let syncdatafile = get_syncdatafile(sobj);
        $("#filenav_sitetitle").text(sobj.sname);

        // load data
        $("#filenav_filelist_box").scrollTop(0);
        var tbodyobj = $("#filenav_filelist").children("tbody")
            .html("<tr><td></td><td>加载中 ...</td><td></td></tr>");
        
        // prepare for status bar
        $("#filenav_deatils").empty().html("提示：<ul><li>单击文件可以查看详细信息</li><li>双击文件来打开</li></ul>");;
        $("#filenav_syncprogress").empty();
        $("#filenav_syncinprogresstext").show();
        $("#filenav_syncfinishedtext").empty().hide();
        $("#filenav_showsyncdetails").unbind("click").click( function () {
            $("#filenav_syncdetails_fbox").toggle();
            $("#filenav_syncdetails_box").scrollTop(0);
        });
        $("#filenav_resync").hide().unbind("click").click( function () {
            local_log("[filenav] resync (cname = " + cobj.cname + ", uuid = " + sobj.uuid + ")");
            coursetable_enter(cidx, x, y)
        });

        // prepare detail box
        $("#filenav_syncdetails_fbox").hide();
        var statuslist = create_statuslist();
        $("#filenav_syncdetails").empty().append($(statuslist));
        $("#filenav_showfiles").hide();

        local_log("[sync] start (cname = " + cobj.cname + ", uuid = " + sobj.uuid + ")");

        webdav_sync(sobj.uuid, coursefolder, syncdatafile, statuslist,
            function (finished, total) { // report_progress
                // update status bar
                $("#filenav_syncprogress").text(finished.toString() + "/" + total.toString());
            }
        ).then( function (obj) {
            local_log("[sync] finished (cname = " + cobj.cname + ", uuid = " + sobj.uuid + ")");
            
            $("#filenav_syncinprogresstext").hide();
            if (obj.sum == 0) {
                $("#filenav_syncfinishedtext").text("同步完成").show();
            } else {
                $("#filenav_syncfinishedtext").text("同步完成，共 " + obj.sum.toString() + " 个新文件").show();
            }
            $("#filenav_showfiles").show().unbind("click").click( function () { // open course folder
                local_log("[filenav] open course folder (coursefolder = " + coursefolder + ")");
                launch_fileuri(docfolder + coursefolder);
            });
            $("#filenav_resync").show();
            
            obj.lobj.flist.sort( function (a, b) {
                // sort by last_modified
                var ta = Date.parse(a.lastmodified);
                var tb = Date.parse(b.lastmodified);
                if (ta < tb) return 1;
                if (tb < ta) return -1;
                return 0;
                
                /*if (a.is_new_file != b.is_new_file) {
                    return a.is_new_file > b.is_new_file ? -1 : 1;
                } else {
                    if (a.path == b.path) return 0;
                    if (a.path < b.path) return -1;
                    return 1;
                }*/
            });
            
            tbodyobj.empty();
            console.log(obj);
            obj.lobj.flist.forEach( function (element, index, array) {
                let fitem = element;
                let fileuri = docfolder + coursefolder + fitem.path;
                
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
                var obj = $(document.createElement('span'))
                    .text(fndisp)
                    .addClass("eh_link2");
                var fntd = $(document.createElement('td')).append(obj).appendTo(rowobj);

                let openoutside = !pdfviewer_issupported(fitem); // should we open this file outside
                var openfunc = function (e) {
                    console.log(fitem, coursefolder);
                    if (openoutside) { // user dblclick file
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
                    var actobj = $(document.createElement('span'));
                    $(document.createElement('span')).addClass("eh_link").text("打开文件位置").click( function () {
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

                if (fitem.is_new_file) {
                    $(document.createElement('span'))
                        .text(" (新)")
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
        }, function (reason) {
            $("#filenav_syncinprogresstext").hide();
            $("#filenav_syncfinishedtext").text("同步失败").show();
            statuslist_append(statuslist, "同步失败: " + get_friendly_part(reason), "red");
            local_log("[sync] failed (reason = " + get_friendly_part(reason) + ")");
            $("#filenav_resync").show();
            tbodyobj.html("<tr><td></td><td>同步失败</td><td></td></tr>");
        });

        
    } else {
        // no matching site
        friendly_error("没有匹配的 eLearning 站点");
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
    var sidx;
    for (sidx = 0; sidx < slist.length; sidx++) {
        if (slist[sidx].sname.indexOf(clist[cidx].cid) >= 0) break; // class id is in site name
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







// ===================== main page related function ========================

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
                slist = slist_input; // save fetched slite to global var
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
                        //show_msg("load clist OK");
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
    //webdav_sync("http://elearning.fudan.edu.cn", "http://elearning.fudan.edu.cn/dav/0b63d236-4fe9-4fbd-9e6b-365a250eeb2c"); // li san shu xue
    //webdav_sync("http://elearning.fudan.edu.cn", "http://elearning.fudan.edu.cn/dav/24ea24fd-0c39-49de-adbe-641d1cf4a499"); // shu ju ku

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
    $("#loginerrmsg").hide();
    show_page("login");
    $("#loginusername").val(el_username);
    $("#loginpassword").val(el_password);
    $("#loginrememberme").prop("checked", el_rememberme);

    if (el_username == "") {
        $("#loginusername").focus();
    } else {
        $("#loginpassword").focus();
    }
    
    var kpfn = function (e) {
        if (e.keyCode == 13) {
            eh_login();
        }
    };
    $("#loginusername").keypress(kpfn);
    $("#loginpassword").keypress(kpfn);
    
    $("#loginbtn").text("登录").prop("disabled", false);
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
}










// ======================= about page related function ===================

var aboutpage_lastpage = "";
function aboutpage_goback() { local_log("[about] goback"); show_page(aboutpage_lastpage); }
function show_about()
{
    local_log("[about] enter");
    // remember where we come from
    aboutpage_lastpage = current_page;
    
    $("#about_licensebox").show();
    $("#about_debugbox").hide();
    $("#about_dbgtoolbtn").addClass("eh_link").text("打开调试工具");

    show_page("about");
    $("#about_licensesbox").scrollTop(0);
    $("#about_aboutsbox").scrollTop(0);
}


function show_debug_tools()
{
    local_log("[about] show debug tools");
    $("#about_licensebox").hide();
    $("#about_debugbox").show();
    $("#about_dbgtoolbtn").removeClass("eh_link").text("调试工具已打开");
    $("#about_debugsbox").scrollTop(0);
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
    var ch = $("#settingsdescbox").children("div");
    var resetfunc = function () {
        ch.hide();
        ch.filter("[data-sdescref='empty']").show();
        $("#settingsdesctitle").empty().hide();
    };
    resetfunc();

    var cch = $("#settingsbox").children("div");
    cch.unbind('mouseenter mouseleave change');
    load_settings(cch);
    cch.each( function (index, element) {
        let ref = $(element).attr("data-sdescref");
        let title = $(element).children("label").text();
        $(element).hover( function () {
            ch.hide();
            ch.filter("[data-sdescref='" + ref + "']").show();
            $("#settingsdesctitle").text(title).show();
            local_log("[settings] hover (ref = " + ref + ", title = " + title + ")");
        }, resetfunc);
        $(element).change( function () {
            local_log("[settings] change (value = " + cch.filter("[data-sdescref='" + ref + "']").children("input").prop("checked") + ", title = " + title + ")");
            save_settings(cch);
        });
    });

    $("#settingssaved").hide();
    show_page("settings");
}
function load_settings(cch)
{
    cch.filter("[data-sdescref='ubv']").children("input").prop("checked", usebuiltinviewer);
    cch.filter("[data-sdescref='ubb']").children("input").prop("checked", usebuiltinbrowser);
    cch.filter("[data-sdescref='sow']").children("input").prop("checked", syncoverwrite);
}
function save_settings(cch)
{
    usebuiltinviewer = cch.filter("[data-sdescref='ubv']").children("input").prop("checked");
    usebuiltinbrowser = cch.filter("[data-sdescref='ubb']").children("input").prop("checked");
    syncoverwrite = cch.filter("[data-sdescref='sow']").children("input").prop("checked");
    save_prefs();
    $("#settingssaved").show();
}












// ======================= XUL related functions =========================


// check if we should popup menu when we clicked on 'element'
// used in xulmain.js
function should_popupmenu(element)
{
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
    console.log("OPEN IN BROWSER", url, opt);
    //FIXME
}

/*
    onclick handler on eh_link spans
*/
function fake_link_handler(obj, opt)
{
    var url = $(obj).text();
    open_in_browser(url, opt);
}
