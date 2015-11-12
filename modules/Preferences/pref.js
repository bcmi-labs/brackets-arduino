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
    "use strict";

    var CommandManager      = brackets.getModule("command/CommandManager"),
        Menus               = brackets.getModule("command/Menus"),
        ExtensionUtils      = brackets.getModule("utils/ExtensionUtils"),
        FileUtils           = brackets.getModule("file/FileUtils"),
        FileSystem           = brackets.getModule("filesystem/FileSystem"),
        Dialogs             = brackets.getModule("widgets/Dialogs"),
        DefaultDialogs      = brackets.getModule("widgets/DefaultDialogs"),
        ViewCommandHandlers = brackets.getModule("view/ViewCommandHandlers");

    var preferencesWindow           = null,
        osDomainName                = "org-arduino-ide-domain-os";

    var cmdOpenPreferencesWindow    = "org.arduino.ide.view.preferences.openwindow";
    
    var preferencesFileName         = null,
        preferencesFile             = null,
        preferencesPrefix           = "[arduino ide - preferences]",
        pref = {};

    var prefKey_sketchbook          = "arduino.ide.preferences.sketchbook",
        prefKey_lang                = "arduino.ide.preferences.lang",
        prefKey_fontsize            = "arduino.ide.preferences.fontsize",
        prefKey_verbosebuild        = "arduino.ide.preferences.verbosebuild",
        prefKey_verboseupload       = "arduino.ide.preferences.verboseupload",
        prefKey_linenumbers         = "arduino.ide.preferences.linenumbers",
        prefKey_chckupdate          = "arduino.ide.preferences.checkupdate";


    /**
     * This module read and write the preference file.
     * The preference file stores the user's preferences.
     */
    function Preferences (filename) {
        preferencesFileName = filename;
        //CommandManager.register("Preferences", cmdOpenPreferencesWindow, /* todo */);

        //TODO: it would be better to get the menu items and their position in a configuration file
        //TODO: it would be better to put this item in the TOOL menu
        
        //load the files at startup
        preferencesFile = FileSystem.getFileForPath( preferencesFileName );
        loadPreferenceFile(preferencesFile, function(err, data, stat){
            if(err)
                console.error(preferencesPrefix + " Error in loading preference file: " + err);
            else{
                //brackets.arduino.preferences = JSON.parse(data);
                pref = JSON.parse(data);
            }
        });

        brackets.arduino.dispatcher.on("arduino-event-menu-tool-preferences", openPreferencesWindow);

        //OK sketchbook location
        //TODO language
        //OK editor font size
        //OK verbose
        //TODO line numbers
        //TODO verify code after upload
        //TODO use external editor
        //OK check update
        //TODO update file extension to .ino
        //TODO save on verifyng



    };

    Preferences.prototype.get = function(key){
        return pref[key];
    };

    Preferences.prototype.set = function(key, value){
        pref[key] = value;
        savePreferenceFile(preferencesFile,  function(err, stat){
            if(err)
                console.error(preferencesPrefix + " Error in saving preference file: " + err);  
            else
                console.log(preferencesPrefix + " Preference file saved. ");  
        });
    };


    var loadPreferenceFile = function(file, callback){
        file.read(function(err, data, stat){
            callback(err, data, stat);
        });
    };

    var savePreferenceFile = function(file, callback){
        file.write(JSON.stringify(pref), function(err, stat){
            callback(err, stat);
        });
    };

    var openPreferencesWindow = function($event, data){
        var data = brackets.arduino.strings.ARDUINO.DIALOG.PREFERENCE
        preferencesWindow = require("text!./html/preferences.html");
        var preferencesWindowHTML =  Mustache.render( preferencesWindow, data);

        //preferencesWindow
        var dSettings = Dialogs.showModalDialog(DefaultDialogs.DIALOG_ID_INFO, data.TITLE, preferencesWindowHTML);//.done(function(){});
        setEventsToUI();
        setValuesToUI();
    };

    //append event on the dom element
    var setEventsToUI = function(){
        //VERBOSE BUILD
        $('#pref_chk_verbose_build').change(function(){
            brackets.arduino.preferences.set( prefKey_verbosebuild, this.checked);
        });

        //VERBOSE UPLOAD
        $('#pref_chk_verbose_upload').change(function(){
            brackets.arduino.preferences.set( prefKey_verboseupload, this.checked);
        });

        //DISPLAY LINE NUMBERS
        //$('#pref_chk_line_numbers').change(function(){
        //    brackets.arduino.preferences.set( prefKey_linenumbers, this.checked);
        //});

        //SKETCHBOOK
        $('#pref_btn_sketchbook').click(function(){
            FileSystem.showOpenDialog(false, true, "Select sketch book folder:","","",function(a, folderSelected, b){
                if(folderSelected.length>0)
                {
                    $('#pref_txt_sketchbook').val(folderSelected[0]);
                    //brackets.arduino.preferences.set( prefKey_sketchbook, folderSelected[0]);
                    brackets.arduino.domains["org-arduino-ide-domain-os"].exec("getUserArduinoHome", folderSelected[0] )
                        .done(function(userHomeDir){
                            brackets.arduino.options.sketchbook = FileSystem.getDirectoryForPath( userHomeDir );
                            brackets.arduino.preferences.set("arduino.ide.preferences.sketchbook", userHomeDir );
                        }).fail(function(err){
                            console.error(err);
                        });

                    brackets.arduino.domains[osDomainName].exec("getUserLibrariesArduinoHome", folderSelected[0] ) //retrieve user libraries
                        .done(function(userLibHomeDir){
                            brackets.arduino.options.userlibrariesdir = FileSystem.getDirectoryForPath( userLibHomeDir );
                        }).fail(function(err){
                            console.error(err);
                        });

                }
            });
        });

        //EDITOR FONT SIZE
        $("#pref_ddl_fontsize").change(function(){
            var selected = $( "#pref_ddl_fontsize option:selected" ).val();
            brackets.arduino.preferences.set( prefKey_fontsize, parseInt(selected));
            ViewCommandHandlers.setFontSize( selected + "px" );
        });

        //CHECK FOR UPDATE
        $('#pref_chk_checkupdate').change(function(){
            brackets.arduino.preferences.set( prefKey_chckupdate, this.checked);
        });

    };

    var setValuesToUI = function(){
        //VERBOSE BUILD
        $('#pref_chk_verbose_build')[0].checked = brackets.arduino.preferences.get( prefKey_verbosebuild);
        //VERBOSE UPLOAD
        $('#pref_chk_verbose_upload')[0].checked = brackets.arduino.preferences.get( prefKey_verboseupload);
        //DISPLAY LINE NUMBERS
        //$('#pref_chk_line_numbers')[0].checked = brackets.arduino.preferences.get( prefKey_linenumbers);
        //SKETCHBOOK
        $('#pref_txt_sketchbook').val( brackets.arduino.preferences.get( prefKey_sketchbook ) );
        //EDITOR FONT SIZE
        $("#pref_ddl_fontsize").val( brackets.arduino.preferences.get( prefKey_fontsize ) );
        //CHECK FOR UPDATE
        $("#pref_chk_checkupdate")[0].checked = brackets.arduino.preferences.get( prefKey_chckupdate );
    };


    return Preferences;
});
