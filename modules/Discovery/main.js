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

/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4,
maxerr: 50, browser: true */
/*global $, define, brackets */

define(function (require, exports, module) {
    "use strict";

    var CommandManager      = brackets.getModule("command/CommandManager"),
        Menus               = brackets.getModule("command/Menus"),
        ExtensionUtils      = brackets.getModule("utils/ExtensionUtils"),
        FileUtils           = brackets.getModule("file/FileUtils"),
        WorkspaceManager    = brackets.getModule("view/WorkspaceManager");

    var discoveryDomain             = null,
        discoveryDomainName         = "org-arduino-ide-domain-discovery";

    var discoveryPrefix         =   "[arduino ide - discovery]";

    var pref;
    
    //TODO CHANGE NAME
    function Discovery () {
        pref = brackets.arduino.preferences;
        discoveryDomain = brackets.arduino.domains[discoveryDomainName];

        /*
        */

        brackets.arduino.dispatcher.on("arduino-event-port-serial-get", function($event, callback){

            getSerialPorts(function(err, result){
                //result.forEach(function(port, index, array){
                    //TODO resolve by pid vid
                    //resolveName(port);

                //});

                for(var idx in result){
                    resolveName(result[idx]);
                }

                callback(err, result);
            });


        });


        brackets.arduino.dispatcher.on("arduino-event-port-netowork-get", function($event, callback){

            getNetworkPorts(function(err, result){
                callback(err, result);
            });


        });
    }





    /**
     * getSerialPorts return an array with 'port' objects that contains all the serial ports
     * @param callback
     */
    var getSerialPorts = function(callback){
        discoveryDomain.exec("serialDiscover")
            .done( function(serialList){
                callback(null, serialList);
            })
            .fail(function(err) {
                callback(null, []);
            });
    }


    /**
     * getNetworkPorts return an array with 'port' objects that contains all the 'networked' board (Yun, Yun Mini, Linino One, Linino Chow Chow)
     * @param callback
     */
    var getNetworkPorts = function(callback){
        discoveryDomain.exec("networkDiscover")
            .done(function(networkList){
                callback(null, networkList );
            })
            .fail(function(err){
                callback([]);
            });
    }

    /**
     *
     * @param bport the port object
     * @returns {String} the name of the board trough the 'port'
     */
    var resolveName = function(bport){
        var archs = brackets.arduino.options.archs || {};
        for(var index in archs){ //LOOP the arch.: avr, sam, samd ...
            var arch = archs[index];

            var boards = arch.boards || [];
                boards.forEach(function(board, index, array){   //LOOP the boards: uno, yun, etc...

                    var uids = board.uid || [];
                    uids.forEach(function(uid, index, array){   //LOOP the uids (vid-pid)s of the board

                        if(bport.pid.toUpperCase() == uid.pid.toUpperCase() && bport.vid.toUpperCase() == uid.vid.toUpperCase()) {
                            bport.label += " - " + board.name;
                            console.log("found " + bport.label);
                        }

                    });

                });

        }
    }


    return Discovery;
});