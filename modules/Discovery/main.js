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