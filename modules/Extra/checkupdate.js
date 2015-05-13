define(function (require, exports, module) {
    'use strict';

    var ExtensionUtils      = brackets.getModule("utils/ExtensionUtils"),
        Dialogs             = brackets.getModule("widgets/Dialogs"),
        DefaultDialogs      = brackets.getModule("widgets/DefaultDialogs");

    ExtensionUtils.loadStyleSheet(module, "./css/showLatest.css");



    var getLatest = function(current_version){
        $.ajax({
            url: "http://download.arduino.org/latest",
            method: "GET",
            data: {"version": parseInt(current_version)},
            success: function(data, status, xhr){
                if(status == 'success' && data.version > current_version )
                    showLatest(data);
            },
            error: function(err){alert(JSON.stringify(err));},
            dataType: "json"
        });
    }

    var showLatest = function(latest){
        var template = require("text!./html/showLatest.html");

        var html = Mustache.render(template, latest);

        Dialogs.showModalDialog(DefaultDialogs.DIALOG_ID_INFO, "Get latest version", html);
    }


    module.exports.checkLatest = getLatest;
    //module.exports.showLatest = showLatest;
});