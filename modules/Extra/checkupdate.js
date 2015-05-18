define(function (require, exports, module) {
    'use strict';

    var ExtensionUtils      = brackets.getModule("utils/ExtensionUtils"),
        Dialogs             = brackets.getModule("widgets/Dialogs"),
        DefaultDialogs      = brackets.getModule("widgets/DefaultDialogs");

    ExtensionUtils.loadStyleSheet(module, "./css/showLatest.css");



    var getLatest = function(current_version, showIfLatest){   //if showIfLatest is true, will show a message like, 'Your version is up to date'
        $.ajax({
            url: "http://download.arduino.org/revision",
            method: "GET",
            data: {"version": parseInt(current_version)},
            success: function(data, status, xhr){
                if(status == 'success')
                    if(data.version > current_version )
                        showLatest(data);
                    //else
                        //if(showIfLatest)
                        //TODO SHOW UP TO DATE MESSAGE
            },
            error: function(err){alert(JSON.stringify(err));},
            dataType: "json"
        });
    }

    var showLatest = function(latest){
        var template = require("text!./html/showLatest.html");

        var info = $.extend({}, latest, brakets.arduino.strings);

        var html = Mustache.render(template, info);

        Dialogs.showModalDialog(DefaultDialogs.DIALOG_ID_INFO, /*TODO LOCALIZE THIS*/"Get latest version", html);
    }


    module.exports.checkLatest = getLatest;
    //module.exports.showLatest = showLatest;
});