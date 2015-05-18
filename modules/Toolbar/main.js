/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4,
 maxerr: 50, browser: true */
/*global $, define, brackets */
define(function (require, exports, module) {
    var ExtensionUtils  = brackets.getModule("utils/ExtensionUtils");
    var toolbar_top_template,/*    = require("text!./html/toolbar-top.html");*/
        toolbar_bottom_template,/* = require("text!./html/toolbar-bottom.html");*/
        toolbar_top_html,/*        = Mustache.render(toolbar_top_template, brackets.arduino.strings.ARDUINO.TOOLBAR);*/
        toolbar_bottom_html;/*     = Mustache.render(toolbar_bottom_template, brackets.arduino.strings.ARDUINO.TOOLBAR);*/

    var Strings, Dispatcher;

    module.exports.init = function(loc, disp){
            Strings = loc;
            Dispatcher = disp;
            toolbar_top_template    = require("text!./html/toolbar-top.html");
            toolbar_bottom_template = require("text!./html/toolbar-bottom.html");
            toolbar_top_html        = Mustache.render(toolbar_top_template, Strings);
            toolbar_bottom_html     = Mustache.render(toolbar_bottom_template, Strings);
    };

    module.exports.load = function(){

        ExtensionUtils.loadStyleSheet(module, "./css/main.css");

        $('.buttons').html(toolbar_top_html);
        $('.bottom-buttons').html(toolbar_bottom_html);

        $('.toolbar-btn').click(function(evt){
            evt.preventDefault();
            toolbarHandler(this.id);
        });
    };


    function toolbarHandler(btnid){
        switch(btnid) {
            case 'toolbar-verify-btn':
                CommandManager.execute(Commands.FILE_SAVE);
                Dispatcher.trigger("arduino-event-console-clear");
                Dispatcher.trigger('arduino-event-build');
                break;
            case 'toolbar-upload-btn':
                CommandManager.execute(Commands.FILE_SAVE);
                Dispatcher.trigger("arduino-event-console-clear");
                Dispatcher.trigger('arduino-event-upload');
                break;
            case 'toolbar-new-btn':
                CommandManager.execute(Commands.FILE_NEW);
                break;
            case 'toolbar-open-btn':
                CommandManager.execute(Commands.FILE_OPEN);
                break;
            case 'toolbar-save-btn':
                CommandManager.execute(Commands.FILE_SAVE);
                break;
            case 'toolbar-serial-btn':
                Dispatcher.trigger('arduino-event-menu-tool-serialmonitor');
                break;
            case 'toolbar-console-btn':
                Dispatcher.trigger('arduino-event-console-show');
                break;
            case 'toolbar-toggle-btn':
                if($('#sidebar').is(':visible')){
                    $('#sidebar').hide();
                    $('.main-view .content').css('right', '0px');
                }
                else{
                    $('.main-view .content').css('right', '200px');
                    $('#sidebar').show();
                }
                break;
            default:
                //console.log(btnid+' clicked');
        }
    }

});