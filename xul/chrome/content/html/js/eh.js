function hide_all_pages()
{
    $("#main_page").hide();
    $("#calendar_page").hide();
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
    $("#" + page_name + "_right").addClass("green" + lighten_class);
}

function set_page_layout(page_name, header_height, left_width, right_width)
{
    $("#" + page_name + "_header").css({
        "height": header_height + "px",
    });
    
    $("#" + page_name + "_content").css({
        "height": "calc(100% - " + header_height + "px)",
        "width": "100%",
    });
    
    $("#" + page_name + "_left").css({
        "width": left_width + "px",
        "height": "100%",
    });
    
    $("#" + page_name + "_mid").css({
        "width": "calc(100% - " + (left_width + right_width) + "px)",
        "height": "100%",
    });

    $("#" + page_name + "_right").css({
        "width": right_width + "px",
        "height": "100%",
    });
}

function show_page_with_width(page_name, header_height, left_width, right_width)
{
    set_page_color(page_name);
    set_page_layout(page_name, header_height, left_width, right_width);
    $("#" + page_name + "_page").show();
}

function show_page(page_name)
{
    hide_all_pages();
    if (page_name == "main") {
        show_page_with_width("main", 60, 0, 0);
    } else if (page_name == "calendar") {
        show_page_with_width("calendar", 60, 200, 300);
    } else {
        show_error("unknown page_name");
    }
}

$("document").ready( function () {
    //alert("haha");
    
    
    show_page("main");
    
    Materialize.toast("INIT OK!", 4000);
    //alert("ok");
});

