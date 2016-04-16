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
    } else {
        show_error("unknown page_name");
    }
}


/* colorbox */
var colorbox_boxbgcolor_selected, colorbox_boxbgcolor_hover;
var color_count = 8;

var color_selected;

function get_color(id)
{
    var clist = [
        "#000000",
        "#ff0000",
        "#00ff00",
        "#0000ff",
        "#ffff00",
        "#00ffff",
        "#ff00ff",
        "#eeeeee",
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
        "1px",
        "3px",
        "5px",
        "7px",
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









function go_back()
{
    show_page("main");
}

$("document").ready( function () {
    //alert("haha");
    
    init_colorbox();
    init_thicknessbox();
    show_page("viewfile");
    
    Materialize.toast("INIT OK!", 4000);
    //alert("ok");
});

