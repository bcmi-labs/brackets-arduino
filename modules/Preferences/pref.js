/*
 * This file is part of Arduino
 *
 * Arduino is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA  02110-1301  USA
 *
 * As a special exception, you may use this file as part of a free software
 * library without restriction.  Specifically, if other files instantiate
 * templates or use macros or inline functions from this file, or you compile
 * this file and link it with other files to produce an executable, this
 * file does not by itself cause the resulting executable to be covered by
 * the GNU General Public License.  This exception does not however
 * invalidate any other reasons why the executable file might be covered by
 * the GNU General Public License.
 *
 * Copyright 2015 Arduino Srl (http://www.arduino.org/)
 *
 * authors: arduino.org team - support@arduino.org
 * 
 */

define(function (require, exports, module) {
    "use strict";

    //TODO gui to manage the user preferences.

    var CommandManager      = brackets.getModule("command/CommandManager"),
        Menus               = brackets.getModule("command/Menus"),
        ExtensionUtils      = brackets.getModule("utils/ExtensionUtils"),
        FileUtils           = brackets.getModule("file/FileUtils"),
        FileSystem           = brackets.getModule("filesystem/FileSystem");

    var preferencesWindow           = null,
        preferencesWindowName       = "Arduino Preferences";

    var cmdOpenPreferencesWindow    = "org.arduino.ide.view.preferences.openwindow";
    
    var preferencesFileName         = null,
        preferencesFile             = null,
        preferencesPrefix           = "[arduino ide - preferences]",
        pref = {};


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

    return Preferences;
});