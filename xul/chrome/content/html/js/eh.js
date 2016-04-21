// ======================== global variables ===========================

var OS; // it's a copy of window.parent.OS
var Services; // it's a copy of window.parent.Services
var prefs; // it's a copy of window.parent.prefs



var el_username; // elearning username
var el_password; // elearning password



// remove all cookies
function remove_all_cookies()
{
    Services.cookies.removeAll();
}
// dump cookie
function dump_cookies(domain)
{
    let x = Services.cookies.getCookiesFromHost("domain");
    while (x.hasMoreElements()) {
        var cookie = x.getNext().QueryInterface(Components.interfaces.nsICookie2); 
        console.log(cookie.host + ";" + cookie.name + "=" + cookie.value + "\n");
    }
}


// generic ajax error handler
var el_ajax_errfunc =   function (xhr, textStatus, errorThrown) {
                            abort("AJAX: " + textStatus + ", " + errorThrown + ", " + xhr.status);
                        };



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




// =============== page switching related functions ======================


function hide_all_pages()
{
    $("#main_page").hide();
    $("#calendar_page").hide();
    $("#viewfile_page").hide();
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
        //init_pdf('multipages.pdf');
        init_pdf('dshu13nn.pdf');
        clear_canvas();
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

$("document").ready( function () {

    // test if we are running in xulrunner
    prefs = window.parent.prefs;
    if (typeof prefs !== 'undefined') {
        // in xulrunner

        // get username and password from preferences
        el_username = prefs.getCharPref("username");
        el_password = prefs.getCharPref("password");

        show_msg("USER: " + el_username);
        //show_msg("PASS: " + el_password);
    } else {
        abort("prefs is undefined");
    }

    OS = window.parent.OS;
    Services = window.parent.Services;


    
    
    //alert("haha");
    
    init_colorbox();
    init_thicknessbox();
    init_canvas();

    
    show_page("main");
//    show_page("viewfile");
    
    show_msg("INIT OK!", 4000);
    //alert("ok");

    
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

        pdf_thumbnail_div_list = new Array();
        selected_pdf_page = 1;

        show_pdf_jumpto(pdf, 1);
        
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
    retrieve file list by given dirurl

    dirurl: some string like "http://elearning.fudan.edu.cn/dav/24ea24fd-0c39-49de-adbe-641d1cf4a499"
    success: callback function when success, for example: function (dlist, flist) { ... }
*/ 
function webdav_listall(dirurl, success)
{
    // send WebDAV PROPFIND request
    
    $.ajax({
        type: "PROPFIND",
        url: dirurl,
        context: document.body,
        dataType: "xml",
        username: el_username,
        password: el_password,
        headers: {  "Depth": "infinity",
                    //"Authorization": "Basic " + btoa(el_username + ":" + el_password), // sometimes fails
                 },
        success:    function (xml, status) {
                        //console.log(xml);
                        //$("#test").text($(xml).text());

                        var dlist = new Array();
                        var flist = new Array();
                        
                        $(xml).children("D\\:multistatus").children("D\\:response").each( function (index, element) {
                            //console.log(element);
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
                            //show_msg($(element).text());
                            //show_msg("HERF=" + href + " ISDIR=" + is_dir + " LASTMOD=" + lastmodified);
                        });

                        //console.log(dlist);
                        //console.log(flist);
                        
                        success(dlist, flist);
                    },
        error:  el_ajax_errfunc,
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
            reject("onerror() is called");
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
    for example:
        webdav_create_localpath('file:///C:/aaa', '/bbb/ccc/')
        will create c:\aaa\bbb and c:\aaa\bbb\ccc
        and will not create c:\aaa
*/
function webdav_download_single(globalbase, href, localbase, fpath)
{
    // FIXME: security risk, should check if fpath is legal
    

    return new Promise( function (resolve, reject) {
        var url = globalbase + href;
        var target_uri = localbase + fpath;
        var target_native = OS.Path.fromFileURI(target_uri);
        
        //show_msg("url=" + url + " file=" + target_native);

        webdav_binary_xhr(url).then(function (data) { // onsuccess
            OS.File.writeAtomic(target_native, data)
                .then(function () {
                    resolve();
                }, function (reason) {
                    reject(reason);
                });
        }, function (reason) { // onerror
            reject(reason);
        });
        
    });
}


/*
    sync a whole site
*/
function webdav_sync(globalbase, siteurl)
{
    show_msg("START AJAX");
    
    //var localbase_native = "C:\\Users\\zby\\Desktop\\ELEARNING_HELPER\\ehdata\\";
    
    var localbase_native = OS.Path.join(OS.Constants.Path.desktopDir, "ehdata");

    
    var localbase = OS.Path.toFileURI(localbase_native);
    
    webdav_listall(siteurl, function (dlist, flist) {
        show_msg("AJAX SUCCESS");

        //console.log(dlist);
        //console.log(flist);
        

        Promise.all(dlist.map( function (ditem) { return webdav_create_localpath(localbase, ditem.path); } ))
            .then( function () { // resolved
                show_msg("Create all dirs finished");

                // directory created, start downloading files
                Promise.all(flist.map( function (fitem) { return webdav_download_single(globalbase, fitem.href, localbase, fitem.path); } ))
                    .then( function () {
                        show_msg("all download finished");
                    }, function (reason) {
                        abort("can't download file: " + reason);
                    });
            }, function (reason) { // rejected
                abort("can't create directory: " + reason);
            });

        
        /*console.log(flist);
        for (var i = 0; i < flist.length; i++) {
            var cur = flist[i];
            //show_msg("HERF=" + cur.href + " ISDIR=" + cur.is_dir + " LASTMOD=" + cur.lastmodified);
            var fpath = OS.Path.fromFileURI(localbase + cur.path);
            
            show_msg(fpath);
            
        }*/
    });
}













// ====================== eLearning related functions =============================




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
                var sitelist = new Array();
                $(data).find("#pda-portlet-site-menu").children("li").each(function (index, element) {
                    var sitelink = $(element).find("a");
                    
                    var sitename = sitelink.attr("title");
                    var siteuuid = sitelink.attr("href").split("/").pop();

                    sitelist.push({
                        sitename: sitename,
                        uuid: siteuuid,
                    });
                });

                resolve(sitelist);
            }).fail ( function (xhr, textStatus, errorThrown) {
                reject("get portal failed: " + textStatus + ", " + errorThrown);
            });
    });
}






/*
    fetch course table from fdu urp
    return value is a promise
    must logged in to uis before calling this function

    clist is a associative array: cid => object
        cid: course id (string)
        cname: course name (string)
        cclassroom: course classroom (string)
        cteacher: course teacher name (string)
        cavlweek: cavlweek (string, "001100..." means week 2-3 is avaliable)
        ctime: course time in table (array, like [[1, 1], [1, 2]])

    note: one courses may have multiple entries in clist with different ctime
*/
function urp_fetch_coursetable(semester_id)
{
    return new Promise( function (resolve, reject) {
        Services.cookies.add("jwfw.fudan.edu.cn", "/eams", "semester.id", semester_id, false, true, false, 0x7fffffff);
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
                cstrlist = data.split("new TaskActivity");

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

    /*elearning_login().then( function () {
        show_msg("elearing login OK");
        elearning_fetch_sitelist().then( function (sitelist) {
            console.log(sitelist);
        }, function (reason) {
            abort("can't fetch sitelist: " + reason);
        });
    }, function (reason) {
        abort("elearing login failed: " + reason);
    });*/

    


    

    remove_all_cookies();



    uis_login().then( function () {


        semester_id = "202";
        
        urp_fetch_coursetable(semester_id).then( function (clist) {
            console.log(clist);
            show_msg("OK");
        })
    });

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


