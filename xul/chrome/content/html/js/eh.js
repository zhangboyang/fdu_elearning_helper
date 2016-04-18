function hide_all_pages()
{
    $("#main_page").hide();
    $("#calendar_page").hide();
    $("#viewfile_page").hide();
}

function show_error(error_text)
{
    Materialize.toast("ERROR: " + error_text, 10000);
}

function show_msg(str)
{
    Materialize.toast("MSG: " + str, 10000);
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
        show_error("unknown page_name");
    }
}


function helloworld2()
{
    alert("hello from child!");
}


























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


















function go_back()
{
    show_page("main");
}

$("document").ready( function () {
    //alert("haha");
    
    init_colorbox();
    init_thicknessbox();
    init_canvas();
  
    show_page("main");
//    show_page("viewfile");
    
    Materialize.toast("INIT OK!", 4000);
    //alert("ok");
});















var pdf_thumbnail_div_list;
var selected_pdf_page;

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


function test_elearning()
{

}



















function should_popupmenu(element)
{
    var a = $(".eh_xul_popupmenu");
    for (var i = 0; i < a.length; i++)
        if ($.contains(a[i], element) || a[i] == element)
            return true;
    return false;
}

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


