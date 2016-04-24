// ======================== global variables ===========================

var OS; // it's a copy of window.parent.OS
var Services; // it's a copy of window.parent.Services
var prefs; // it's a copy of window.parent.prefs



var el_username; // elearning username
var el_password; // elearning password

var page_limit; // pdfviewer page limit

var docfolder; // document folder, FILE URI style, like file:///foo/bar....
var datafolder; // internal data folder, NATIVE style, like C:\foo\bar.....


var ppt2pdf_path; // NATIVE path to ppt2pdf.vbs

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


// generic ajax error handler
var el_ajax_errfunc =   function (xhr, textStatus, errorThrown) {
                            abort("AJAX: " + textStatus + ", " + errorThrown + ", " + xhr.status);
                        };


// create universal key-value div
function create_kvdiv(kstr, vstr, vfunc)
{
    if (typeof(vfunc) != "undefined") {
        return $(document.createElement('div'))
            .addClass("eh_kvdiv")
            .append($(document.createElement('span')).addClass("eh_key").text(kstr))
            .append($(document.createElement('span')).addClass("eh_value eh_link").text(vstr).click(vfunc))
            [0];
    } else {
        return $(document.createElement('div'))
            .addClass("eh_kvdiv")
            .append($(document.createElement('span')).addClass("eh_key").text(kstr))
            .append($(document.createElement('span')).addClass("eh_value").text(vstr))
            [0];
    }
}


/*
    install chrome-url data to native path
    used with trusted filename/url only
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
    show_error(str);
    throw str;
}


function friendly_error(str)
{
    str = "错误: " + str;
    alert(str);
}



// =============== page switching related functions ======================


function hide_all_pages()
{
    $("#main_page").hide();
    $("#calendar_page").hide();
    $("#viewfile_page").hide();
    $("#filenav_page").hide();
}

function go_back()
{
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

function show_page(page_name)
{
    hide_all_pages();
    if (page_name == "main") {
        show_page_with_width("main", "0px", "0px", "0px", "0px", "0px", "0px");
    } else if (page_name == "calendar") {
        show_page_with_width("calendar", "200px", "200px", "200px", "0px", "20%", "100%");
    } else if (page_name == "viewfile") {
        show_page_with_width("viewfile", "200px", "200px", "200px", "250px", "20%", "100%");
    } else if (page_name == "filenav") {
        show_page_with_width("filenav", "0px", "0px", "0px", "0px", "0px", "0px");
    } else {
        abort("unknown page_name");
    }
}



























// ========== color box and thickness box related functions (in the PDF viewer)

/* colorbox */
var colorbox_boxbgcolor_selected, colorbox_boxbgcolor_hover;
var color_count = 8;

var color_selected;

function get_color(id)
{
    var clist = [
        "#ff0000",
        "#00ff00",
        "#0000ff",
        "#ffff00",
        "#00ffff",
        "#ff00ff",
        "#eeeeee",
        "#000000",
    ];
    return clist[id - 1];
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

function select_color(id)
{
    color_selected = id;
    redraw_colorbox();
    $("#viewfile_colorbox" + id).css("border-color", colorbox_boxbgcolor_hover);
}

/* thicknessbox */
var thicknessbox_boxbgcolor_selected, thicknessbox_boxbgcolor_hover;
var thickness_count = 4;

var thickness_selected;

function get_thickness(id)
{
    var clist = [
        "7px",
        "5px",
        "3px",
        "1px",
    ];
    return clist[id - 1];
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

function select_thickness(id)
{
    thickness_selected = id;
    redraw_thicknessbox();
    $("#viewfile_thicknessbox" + id).css("border-color", thicknessbox_boxbgcolor_hover);
}






















// ============= drawing related functions  (in the PDF viewer) ==========

var context;
var clickX = new Array();
var clickY = new Array();
var clickDrag = new Array();
var clickColor = new Array();
var clickThickness = new Array();
var paint;

var canvas_offset_X;
var canvas_offset_Y;

var last_redraw_count;

function addClick(x, y, dragging, color, thickness)
{
  clickX.push(x);
  clickY.push(y);
  clickDrag.push(dragging);
  clickColor.push(color);
  clickThickness.push(thickness);
}

function redraw(){
  context.lineJoin = "round";

  var i;
  for(i = last_redraw_count; i < clickX.length; i++) {
    context.strokeStyle = get_color(clickColor[i]);
    context.lineWidth = parseInt(get_thickness(clickThickness[i]));
    context.beginPath();
    if(clickDrag[i] && i){
      context.moveTo(clickX[i-1], clickY[i-1]);
     }else{
       context.moveTo(clickX[i]-1, clickY[i]);
     }
     context.lineTo(clickX[i], clickY[i]);
     context.closePath();
     context.stroke();
  }
  last_redraw_count = i;
}
    
function init_canvas()
{
    context = document.getElementById("pdf_page_view").getContext("2d");
    $('#pdf_page_view').mousedown(function(e){
        var x = $("#pdf_page_view").offset();
        canvas_offset_X = x.left;
        canvas_offset_Y = x.top;
        var mouseX = e.pageX - canvas_offset_X;
        var mouseY = e.pageY - canvas_offset_Y;
        paint = true;
        addClick(e.pageX - canvas_offset_X, e.pageY - canvas_offset_Y, false, color_selected, thickness_selected);
        redraw();
    });
    $('#pdf_page_view').mousemove(function(e){
        if(paint){
            addClick(e.pageX - canvas_offset_X, e.pageY - canvas_offset_Y, true, color_selected, thickness_selected);
            redraw();
        }
    });
    $('#pdf_page_view').mouseup(function(e){
        paint = false;
    });
    $('#pdf_page_view').mouseleave(function(e){
        paint = false;
    });
}

function clear_canvas()
{
    
    if (parseInt($("#myImage").css("width")) == 0) {
        setTimeout("clear_canvas()", 10); // ugly hack
        return;
    }
    
    clickX.length = 0;
    clickY.length = 0;
    clickDrag.length = 0;
    clickColor.length = 0;
    clickThickness.length = 0;
    var canvas = document.getElementById("pdf_page_view");
    canvas.getContext("2d").clearRect(0, 0, context.canvas.width, context.canvas.height); // Clears the canvas
    
    //canvas.setAttribute('width', $("#myImage")[0].naturalWidth);
    //canvas.setAttribute('height', $("#myImage")[0].naturalHeight);
    
    
    //$("#pdf_page_view").css("width", $("#myImage").css("width"));
    //$("#pdf_page_view").css("height", $("#myImage").css("height"));
    
    
    //canvas.setAttribute('width', $("#myImage").css("width"));
   // canvas.setAttribute('height', $("#myImage").css("height"));
    
    //Materialize.toast($("#myImage").css("width"), 4000);
    
  
    last_redraw_count = 0;
}


























// ====================== the global init function ======================

function load_prefs()
{
    el_username = prefs.getCharPref("username");
    el_password = prefs.getCharPref("password");
    page_limit = prefs.getIntPref("pagelimit");
}

$("document").ready( function () {
    prefs = window.parent.prefs;
    OS = window.parent.OS;
    Services = window.parent.Services;

    load_prefs();
    
    docfolder = OS.Path.toFileURI(OS.Path.join(OS.Constants.Path.desktopDir, "ehdoc"));
    datafolder = OS.Path.join(OS.Constants.Path.desktopDir, "ehdata");

    OS.File.makeDir(OS.Path.join(datafolder, "tools"), { ignoreExisting: true, from: datafolder });
    ppt2pdf_path = OS.Path.join(datafolder, "tools", "ppt2pdf.vbs");
    install_file("ppt2pdf.vbs", ppt2pdf_path);
    
    init_colorbox();
    init_thicknessbox();
    init_canvas();

    show_page("main");
    
    show_msg("INIT OK!", 4000);

});
















// ====================== PDF related functions =======================

var pdf_thumbnail_div_list;
var selected_pdf_page;


/*
    initialize pdf viewer

    pdf_path: url of pdf file

*/
function init_pdf(pdf_path)
{
    $('#pdf_page_list').empty();
    
    // this function is call when user enters "viewfile" page
    PDFJS.getDocument(pdf_path).then( function (pdf) {
        //show_pdf_jumpto(pdf, 1);

        if (pdf.numPages > page_limit) {
            friendly_error("文件页数过多，无法打开");
            return;
        }
        
        pdf_thumbnail_div_list = new Array();
        selected_pdf_page = 1;
        
        for (var i = 1; i <= pdf.numPages; i++) {
            // append an canvas to our thumbnail list

            let cur_canvas = document.createElement('canvas');

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

            if (i == 1) show_pdf_jumpto(pdf, 1);
            
            pdf.getPage(i).then( function (page) {
                var scale = 1.0;
                var viewport = page.getViewport(scale);

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
            });
        }

        $('#pdf_page_list').scrollTop(0);
    });
}


/*
    jump to a pdf page

    pdf: the loaded pdf object
    page_id: target page id, start from 1
    
*/
function show_pdf_jumpto(pdf, page_id)
{
    $(pdf_thumbnail_div_list[selected_pdf_page]).removeClass("eh_selected");
    $(pdf_thumbnail_div_list[selected_pdf_page = page_id]).addClass("eh_selected");
    
    pdf.getPage(page_id).then(function (page) {
        var space_ratio = 0.03;
        
        var scale = 1.0;
        var viewport = page.getViewport(scale);
        var wrapper_width = Math.floor(parseInt($("#pdf_page_view_wrapper").css("width")) * (1.0 - space_ratio)) - 2;
        var wrapper_height = Math.floor(parseInt($("#pdf_page_view_wrapper").css("height")) * (1.0 - space_ratio)) - 2;
        
        scale = Math.min(wrapper_width / viewport.width, wrapper_height / viewport.height);
        //show_msg(scale);
        viewport = page.getViewport(scale);

        // Prepare canvas using PDF page dimensions.
        var canvas = document.getElementById('pdf_page_view');
        var context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        // Render PDF page into canvas context.
        var renderContext = {
            canvasContext: context,
            viewport: viewport
        };
        
        page.render(renderContext);
    });
}



/*
    switch to pdf viewer and load file

    fitem: see webdav_listall()
*/

function pdfviewer_show(fitem, coursefolder)
{
    var promise = new Promise( function (resolve, reject) {
        var fileuri = docfolder + coursefolder + fitem.path;
        var fileext = get_file_ext(fileuri);
        
        if (fileext == "pdf") {
            // this file is already PDF, no need to convert
            resolve(fileuri);
        } else {
            // this file is not PDF, should convert to PDF
            if (fileext == "ppt" || fileext == "pptx") {

                var pdfuri = fileuri + ".pdf";
                var pdfpath = OS.Path.fromFileURI(pdfuri);

                OS.File.stat(pdfpath).then( function (info) {
                    // pdf file exists, no need to convert
                    resolve(pdfuri);
                }, function (reason) {
                    if (reason instanceof OS.File.Error && reason.becauseNoSuchFile) {
                        // pdf file not exists, we need convert
                        // start ppt2pdf.vbs to convert
                        // FIXME: Windows Only Code
                        var file = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces["nsILocalFile"]);
                        file.initWithPath("c:\\windows\\system32\\cscript.exe");
                        var process = Components.classes["@mozilla.org/process/util;1"].createInstance(Components.interfaces.nsIProcess);
                        process.init(file);
                        process.runw(true, ["//Nologo", ppt2pdf_path, OS.Path.fromFileURI(fileuri), pdfpath], 4);
                        resolve(pdfuri);
                    } else {
                        // other error
                        reject("unknown stat() error: " + reason);
                    }
                });
            } else {
                reject("不支持该文件格式");
            }
        }
    });

    promise.then( function (pdfuri) {
        $("#viewfile_filetitle").text(fitem.filename);

        // register back button click function
        $("#viewfile_backbtn").unbind("click");
        $("#viewfile_backbtn").click( function () {
            show_page("filenav");
        });
        show_page("viewfile");
        init_pdf(pdfuri);
        clear_canvas();
    }, function (reason) {
        friendly_error(reason);
    });
}


/*
    check if file type is supported
*/
function pdfviewer_issupported(fitem)
{
    var fileext = get_file_ext(fitem.filename);
    return fileext == "pdf" || fileext == "ppt" || fileext == "pptx";
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
                reject("PROPFIND failed: " + textStatus + ", " + errorThrown + ", " + xhr.status);
            },
        });
    });
}


/*
    get binary data using XMLHttpRequest
    return value is a promise
*/

function webdav_binary_xhr(url)
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

    // FIXME: security risk, should check if subpath is legal
    
    var target_uri = localbase + subpath;
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

    href: something like "/dav/24ea24fd-0c39-49de-adbe-641d1cf4a499"
    localbase: local file uri of current site
*/
function webdav_download_single(href, localbase, fpath)
{
    // FIXME: security risk, should check if fpath is legal

    return new Promise( function (resolve, reject) {
        var url = "http://elearning.fudan.edu.cn" + href;
        var target_uri = localbase + fpath;
        var target_native = OS.Path.fromFileURI(target_uri);
        
        //show_msg("url=" + url + " file=" + target_native);

        webdav_binary_xhr(url).then(function (data) { // onsuccess
            OS.File.writeAtomic(target_native, data)
                .then(function () {
                    resolve();
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
*/
function webdav_sync_single(href, localbase, fpath)
{
    // FIXME: security risk, should check if fpath is legal

    return new Promise( function (resolve, reject) {
        var do_download = function () {
            webdav_download_single(href, localbase, fpath).then( function () {
                resolve(1);
            }, function (reason) { // onerror
                reject("download single failed: " + reason);
            });
        }
    
        var target_uri = localbase + fpath;
        var target_native = OS.Path.fromFileURI(target_uri);
        OS.File.stat(target_native).then( function (info) {
            // file exists, no need to download
            //console.log("file exists: " + fpath);
            resolve(0);
        }, function (reason) {
            if (reason instanceof OS.File.Error && reason.becauseNoSuchFile) {
                // file not exists, we should download it
                //console.log("file not exists, download: " + fpath);
                do_download(); // resolve() will be called in do_download()
            } else {
                reject("unknown stat() error: " + reason);
            }
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

*/
function webdav_sync(uuid, coursefolder)
{
    return new Promise( function (resolve, reject) {
        // create course folder
        var localbase = docfolder + coursefolder;
        webdav_create_localpath(docfolder, coursefolder).then( function () {
            // download files
            webdav_listall(uuid).then(function (lobj) {
                Promise.all(lobj.dlist.map( function (ditem) { return webdav_create_localpath(localbase, ditem.path); } ))
                    .then( function () {
                        // directory created, start downloading files
                        Promise.all(lobj.flist.map( function (fitem) { return webdav_sync_single(fitem.href, localbase, fitem.path); } ))
                            .then( function (dstat) {
                                var sum = 0;
                                dstat.forEach( function (element) { sum += element; } );
                                resolve({
                                    lobj: lobj,
                                    sum: sum,
                                });
                            }, function (reason) {
                                reject("can't download file: " + reason);
                            });
                    }, function (reason) {
                        reject("can't create directory: " + reason);
                    });
            }, function (reason) {
                reject("can't list files: " + reason);
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
                        show_msg("Login to UIS - OK!");
                        resolve();
                    } else {
                        reject("UIS login check failed");
                    }
                }).fail( function (xhr, textStatus, errorThrown) {
                    reject("UIS login failed: " + textStatus + ", " + errorThrown);
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
                    show_msg("Login to eLearning - OK!");
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
    return new Promise( function (resolve, reject) {
        //Services.cookies.add("jwfw.fudan.edu.cn", "/eams", "semester.id", semester_id, false, true, false, 0x7fffffff);
        $.get("http://jwfw.fudan.edu.cn/eams/courseTableForStd!index.action").done( function () {
            $.post("http://jwfw.fudan.edu.cn/eams/courseTableForStd!courseTable.action", {
                "ignoreHead": "1",
                "setting.kind": "std",
                "startWeek": "1",
                "semester.id": semester_id,
                "ids": "311358", // what's the magic number 311358 ?
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
                resolve({
                    smap: semesterlist,
                    cursid: cur_semester,
                });
            }).fail( function (xhr, textStatus, errorThrown) {
                reject("dataQuery.action failed: " + textStatus + ", " + errorThrown);
            });
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
var course_selected; // course index of selected course
var cur_semestername; // current semester name

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
                tdobj.click(function () { coursetable_select(cidx_cb, x_cb, y_cb); });
                tdobj.dblclick(function () { coursetable_enter(cidx_cb, x_cb, y_cb); });
                $(cdivlist[cidx] = document.createElement('div'))
                    .append($(document.createElement('span')).text(clist[cidx].cname))
                    .appendTo(tdobj);
            }
            tdobj.appendTo(trobj);
        }
        trobj.appendTo(tobj);
    }

    $("#main_coursetable").empty();
    tobj.appendTo($("#main_coursetable"));
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

    var chsweekday = ["日", "一", "二", "三", "四", "五", "六", "日"];
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


    course_selected = cidx;
    var cobj = clist[cidx];
    var ctimelist = new Array();    
    clist.forEach( function (element, index, array) {
        if (element.cid == cobj.cid) { // there might be multiple object have same cid
            $(cdivlist[index]).addClass(index == cidx ? "eh_selected" : "eh_selected_sub"); // make them selected
            ctimelist.push(...element.ctime);
        }
    });

    var sidx = match_cname_sname(cidx);
    
    $("#main_course_details").empty();
    if (sidx >= 0) {
        let cidx_cb = cidx;
        let x_cb = x;
        let y_cb = y;
        $(create_kvdiv("名称: ", cobj.cname + " (" + cobj.cid + ")", function () {
            coursetable_enter(cidx_cb, x_cb, y_cb);
        })).appendTo("#main_course_details");
    } else {
        $(create_kvdiv("名称: ", cobj.cname + " (" + cobj.cid + ")")).appendTo("#main_course_details");
    }
    $(create_kvdiv("教师: ", cobj.cteacher)).appendTo("#main_course_details");
    $(create_kvdiv("地点: ", cobj.cclassroom)).appendTo("#main_course_details");
    $(create_kvdiv("时间: ", make_ctime_str(ctimelist))).appendTo("#main_course_details");
    $(create_kvdiv("开课周: ", make_avlweek_string(cobj.cavlweek))).appendTo("#main_course_details");

}



function coursetable_enter(cidx, x, y)
{
    var sidx = match_cname_sname(cidx);
    if (sidx >= 0) {
        // found matched site
        show_page("filenav");

        let cobj = clist[cidx];
        let sobj = slist[sidx];
        let coursefolder = "/" + cur_semestername + "/" + cobj.cname;
        $("#filenav_sitetitle").text(sobj.sname);


        // load data
        $("#filenav_filelist").empty();
        $("#filenav_filelist").text("加载中...");

        webdav_sync(sobj.uuid, coursefolder).then( function (obj) {
            console.log(obj);
            show_msg("SYNC OK, total downloads = " + obj.sum.toString());

            obj.lobj.flist.sort( function (a, b) {
                if (a.path == b.path) return 0;
                if (a.path < b.path) return -1;
                return 1;
            });

            $("#filenav_filelist").empty();
            obj.lobj.flist.forEach( function (element, index, array) {
                let element_cb = element;
                var obj = $(document.createElement('span'))
                    .addClass("eh_listitem")
                    .text(element.path)
                    .click( function () { pdfviewer_show(element, coursefolder); } );
                if (!pdfviewer_issupported(element)) {
                    obj.css("color", "gray");
                } else {
                    obj.addClass("eh_link");
                }

                $(document.createElement('div')).append(obj).appendTo("#filenav_filelist");
            });
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
    remove_all_cookies();

    /* load data from network:
        slist
        semesterdata
        clist
    */
    uis_login().then( function () {
        // uis login OK, we should login to elearning
        elearning_login().then( function () {
            // elearning login OK, we should fetch sitelist
            elearning_fetch_sitelist().then( function (slist_input) {
                slist = slist_input; // save fetched slite to global var
                // slist fetched OK, we should query for course table
                urp_fetch_semesterdata().then( function (semesterdata) {
                    // current semester is saved in semesterdata.cursid
                    cur_semestername = semesterdata.smap[semesterdata.cursid];
                    urp_fetch_coursetable(semesterdata.cursid).then( function (clist) {
                        // load clist data
                        coursetable_load(clist)
                        show_msg("load clist OK");
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

    init_main_page();


}


// this will be called in helloworld() in 'xulmain.js'
function helloworld2()
{

    alert("hello from child!");
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


