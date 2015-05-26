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

(function () {
    "use strict";
    var fs = require('fs');

    var domainName = "org-arduino-ide-domain-os",
        dManager;

    var platform = require("./compiler/platform.js").getDefaultPlatform();

    function getUserHome() {
        return platform.getUserHome();
    }

    function getUserDocuments() {
        return getUserHome()+(( process.platform =='win32') ? '\\Documents' : "/Documents");
    }

    function getUserArduinoHome(prefUserArduinoHome, callback) {
        fs.exists( prefUserArduinoHome, function(exists) { //if exists the user home stored in pref file callback it
            if(exists)
                callback(null, prefUserArduinoHome);
            else{   //else try the default arduino dir under Documents, but if not exists create it
                var arduino_home =  getUserHome()+((process.platform =='win32') ? '\\Documents\\Arduino-2' : "/Documents/Arduino-2");
                fs.exists( arduino_home, function(exists) {
                    if(!exists )
                        fs.mkdir(arduino_home, function(err){
                            if(!err)
                                callback(null, arduino_home);
                            else
                                callback(err);

                        });
                    else
                        callback(null, arduino_home );

                });
            }
        });
    }

    function getUserLibrariesArduinoHome(prefUserArduinoHome, callback) {
        getUserArduinoHome(prefUserArduinoHome, function(err, user_home_arduino){
            if(!err){
                var user_home_arduino_libraries = user_home_arduino + ((process.platform =='win32') ? '\\libraries' : "/libraries");
                fs.exists( user_home_arduino_libraries, function(exists) {
                    if(!exists )
                        fs.mkdir(user_home_arduino_libraries, function(err){
                            if(!err)
                                callback(null, user_home_arduino_libraries);
                            else
                                callback(err);
                        });
                    else
                        callback(null, user_home_arduino_libraries );
                });
            }
            else{
                callback(err);
            }
        });
    }


    function init(domainManager){
        if(!domainManager.hasDomain( domainName )){
            domainManager.registerDomain( domainName, {major: 0, minor: 1});
        }
        dManager = domainManager;

        dManager.registerCommand(
            domainName,
            "getUserHome",
            getUserHome,
            false,
            "get the user home path"
        );

        dManager.registerCommand(
            domainName,
            "getUserDocuments",
            getUserDocuments,
            false,
            "get the user documents path"
        );

        dManager.registerCommand(
            domainName,
            "getUserArduinoHome",
            getUserArduinoHome,
            true,
            "get the user arduino path"
        );

        dManager.registerCommand(
            domainName,
            "getUserLibrariesArduinoHome",
            getUserLibrariesArduinoHome,
            true,
            "get the user arduino libraries path"
        );
    }

    exports.init = init;
}());