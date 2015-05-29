/*
 * This file is part of Arduino
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 * Copyright 2015 Arduino Srl (http://www.arduino.org/)
 *
 * authors: arduino.org team - support@arduino.org
 *
 */

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
            error: function(err){/*alert(JSON.stringify(err));*/},
            dataType: "json"
        });
    }

    var showLatest = function(latest){
        var template = require("text!./html/showLatest.html");
        var info = $.extend({}, latest, brackets.arduino.strings);
        var html = Mustache.render(template, info);

        Dialogs.showModalDialog(DefaultDialogs.DIALOG_ID_INFO, brackets.arduino.strings.ARDUINO.DIALOG.LATEST.TITLE, html);
    }


    module.exports.checkLatest = getLatest;
    //module.exports.showLatest = showLatest;
});