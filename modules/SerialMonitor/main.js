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
        WorkspaceManager    = brackets.getModule("view/WorkspaceManager"),
        EventDispatcher     = brackets.getModule("utils/EventDispatcher");


    var serialMonitorWindow         = null,
        serialMonitorPanelResult    = null,
        serialMonitorURI            = null,
        serialMonitorWindowName     = "Arduino Serial Monitor",
        serialmonitorDomainName     = "org-arduino-ide-domain-serialmonitor",
        serialMonitorIcon           = null,
        serialMonitorPanel          = null,
        serialMonitorPanelHTML      = null,
        serialMonitorPanelScroll    = null,
        serialMonitorPanelConsole   = null,
        serialMontiorIsOpen         = false;


    var cmdOpenSerialMonitorWindow = "org.arduino.ide.view.serialmonitor.openwindow";
    
    var serialDomain                = null,
        serialPort                  = null,
        serialPortRate              = null,
        serialPortEol               = null,
        serialPortScroll            = null;

    var serialMonitorPrefix         = "[arduino ide - serial monitor]";

    var pref,
        evt;
    

    /**
     * [SerialMonitor description]
     */
    function SerialMonitor () {
        pref = brackets.arduino.preferences;
        evt  = brackets.arduino.dispatcher;

        serialDomain = brackets.arduino.domains[serialmonitorDomainName];

        serialPortRate              = pref.get("arduino.ide.serialmonitor.baudrate");
        serialPortEol               = pref.get("arduino.ide.serialmonitor.eol");
        serialPortScroll            = pref.get("arduino.ide.serialmonitor.autoscroll");

        //serialMonitorURI = serialMonitorModulePath + "/ui/SerialMonitor.html";
        
        serialMonitorIcon = $("<a id='serial-console-icon' class='serial-console-icon' href='#'></a>");
        serialMonitorIcon.attr("title", "Serial Monitor");
        serialMonitorIcon.appendTo($("#main-toolbar .buttons"));
        serialMonitorIcon.on("click", onSerialMonitorIconClick);

        serialMonitorPanelInit();

        //REGISTER COMMANDS and ADD MENU ITEMS
        CommandManager.register("Serial Monitor", cmdOpenSerialMonitorWindow, this.openSerialMonitorWindow);

        //TODO: it would be better to get the menu items and their position in a configuration file
        //TODO: it would be better to put this item in the TOOL menu
        var viewMenu = Menus.getMenu(Menus.AppMenuBar.VIEW_MENU);
        viewMenu.addMenuItem( cmdOpenSerialMonitorWindow, null, Menus.FIRST);

        //ATTACH EVENT HANDLER
        serialDomain.on('serial_data', serialDataHandler);
        serialDomain.on('serial_operation_error', serialErrorHandler);

        brackets.arduino.dispatcher.on("arduino-event-port-change", eventSerialPortChange);
    }


    var eventSerialPortChange = function($event, port){
        //TODO at this moment port is a string, but may be an object in the future
        //TODO [idea] the port selected by the user could be stored in the global brackets.arduino.options.target_board/port. instead of the 'port' argument, i should use the global object

        if(port && port!= serialPort){
            serialPort = port;
            changeParameter();
        }
    };


    SerialMonitor.prototype.setPort = function(port){
        serialPort = port;
        //changeParameter();
    }

    SerialMonitor.prototype.setBoard = function(board){
        //TODO create a board object to pass as argument
        //serialPort = board.port;
    }
    
    /**
     * [openSerialMonitorWindow description]
     * @return {[type]} [description]
     */
    SerialMonitor.prototype.openSerialMonitorWindow = function(){
        togglePanel();
        //serialMonitorWindow = window.open(serialMonitorURI, serialMonitorWindowName, "width=" + 800 + ",height=" + 350);
    }
    

    var onSerialMonitorIconClick = function(){
        togglePanel();
    }

    var togglePanel = function() {

        //TODO implements a binding system for these vars
        serialPortRate              = pref.get("arduino.ide.serialmonitor.baudrate");
        serialPortEol               = pref.get("arduino.ide.serialmonitor.eol");
        serialPortScroll            = pref.get("arduino.ide.serialmonitor.autoscroll");


        if (serialMonitorPanel.isVisible()) {
            serialMonitorPanel.hide();
            document.getElementById('serial-console-icon').className  = "serial-console-icon";
            /*serialDomain.exec("close", serialPort)
                .done( clear )
                .fail(function(err) {
                    clear();
                    //TODO i18n error message
                    console.error( serialMonitorPrefix + " Error in serial port opening: ", err);
                });
            */
            closeSerialPort(serialPort, function(err){
                if(err) //TODO send error to arudino console.
                    console.error(serialMonitorPrefix + " Error in serial port closing: ", err);
            });

        } 
        else {
            serialMonitorPanel.show();
            document.getElementById('serial-console-icon').className  = "serial-console-icon-on";
            /*
            serialDomain.exec("open", serialPort, parseInt(serialPortRate))
                .done(  )
                .fail( function( err ) {
                    //TODO i18n error message
                    console.error( serialMonitorPrefix + " Error in serial port opening: ", err);
                });
            */
            openSerialPort(serialPort, serialPortRate, function(err){
                if(err) //TODO send error to arudino console.
                    console.error(serialMonitorPrefix + " Error in serial port opening: ", err);
            });
        }
    };


    /**
     * callback function, called when the board send data to the serial monitor.
     * @param  {Event} $event the event emitted by the NodeDomain of brackets
     * @param  {String} data   the string sent by the board
     */
    var serialDataHandler = function($event, data){
        if(data)
        {
            serialMonitorPanel.$panel.find("#console_log")[0].value += data;
            serialMonitorPanel.$panel.find("#console_log")[0].scrollTop = 100000;
            
            //if (!serialMonitorPanel.$panel.find("#scroll")[0].checked)
            if(serialPortScroll)
                serialMonitorPanel.$panel.find("#console_log")[0].scrollTop = 0;
        }
            
    };

    /**
     * callback function, called when the serial communication fails.
     * @param  {Event} $event the event emitted by the NodeDomain of brackets
     * @param  {String} error the string sent by the board
     */
    var serialErrorHandler = function($event, error){
        //TODO send the error to the Arduino Console (not brackets debug console)
        console.error(serialMonitorPrefix + " " + error);
    }

    /**
     * used to clear the text area
     */
    function clear() {
        serialMonitorPanel.$panel.find("#console_log")[0].value = "";
        serialMonitorPanel.$panel.find("#message_input")[0].value = "";
    };
    

    function changeParameter()  {
/*
        serialDomain.exec("close", serialPort)
            .done(function(){
                clear();
                serialDomain.exec("open", serialPort, parseInt(serialPortRate))
                    .done()
                    .fail(function(err) {
                        //TODO i18n error message
                            console.error( serialMonitorPrefix + " Error in serial port opening: ", err);
                    });
            })
            .fail(function(err) {
            //TODO i18n error message
                console.error( serialMonitorPrefix + " Error in serial port closing: ", err);
            });
*/
        if (serialMonitorPanel.isVisible()) {
            closeSerialPort(serialPort, function (err) {
                if (!err)
                    openSerialPort(serialPort, serialPortRate, function (err) {
                        if (!err)
                            clear();
                        else
                        //TODO send error to arudino console.
                            console.error(serialMonitorPrefix + " Error in serial port opening: ", err);
                    });
                else //TODO send error to arudino console.
                    console.error(serialMonitorPrefix + " Error in serial port closing: ", err);
            });
        }
    };

    function openSerialPort(port, rate, callback){
        if( (serialPort && typeof serialPort != "undefined" && serialPort!= "") &&
            (serialPortRate && typeof serialPortRate != "undefined" && serialPortRate!= "")
        ) {
            serialDomain.exec("open", serialPort, parseInt(serialPortRate))
                .done( function(){
                    callback(null);
                })
                .fail(function(err) {
                    //TODO i18n error message
                    //console.error( serialMonitorPrefix + " Error in serial port opening: ", err);
                    callback(err);
                });
        }
        else//TODO i18n error message
            callback("Serial port or baud rate not specified");
    }

    function closeSerialPort(port, callback){
        if( (serialPort && typeof serialPort != "undefined" && serialPort!= "") &&
            (serialPortRate && typeof serialPortRate != "undefined" && serialPortRate!= "")
        ) {
            serialDomain.exec("close", serialPort)
                .done(function () {
                    callback(null);
                })
                .fail(function (err) {
                    //TODO i18n error message
                    //console.error( serialMonitorPrefix + " Error in serial port closing: ", err);
                    callback(err);
                });
        }
        else//TODO i18n error message
            callback("Serial port not specified");

    }

    function serialMonitorPanelInit(){

        ExtensionUtils.loadStyleSheet(module, "css/SerialMonitor.css");
        
        serialMonitorPanelHTML = require("text!modules/SerialMonitor/html/SerialMonitor.html");
        serialMonitorPanel = WorkspaceManager.createBottomPanel("modules/SerialMonitor/html/SerialMonitor.panel", $(serialMonitorPanelHTML));
        
        serialMonitorPanelScroll    = true;
        serialMonitorPanelConsole   = "console_log";
        
        //init eol and baud with default values
        serialMonitorPanel.$panel.find("#baud").val( serialPortRate );
        serialMonitorPanel.$panel.find("#eol").val( serialPortEol );

        
        serialMonitorPanel.$panel.find("#clear_button").on("click", function () {
            clear();
        });
        
        serialMonitorPanel.$panel.find("#send_button").on("click",function(){
            var message = serialMonitorPanel.$panel.find("#message_input")[0].value;
            if(message){
                message = message.replace(/(\r\n|\n|\r)/gm,"");
                switch(serialPortEol) {
                    case "NL":      message += "\n";    break;
                    case "CR":      message += "\r";    break;
                    case "NLCR":    message += "\r\n";  break;
                    case "NA":      message += "";      break;
                }
                serialDomain.exec("send", message);
            }
        });
               
        serialMonitorPanel.$panel.find(".close").on("click", function () {
            serialMonitorPanel.hide();
            serialMonitorIcon.removeClass("on");
        });
        
        serialMonitorPanel.$panel.find("#eol").on("change",function(){
            var select_item = serialMonitorPanel.$panel.find("#eol")[0];
            serialPortEol = select_item.selectedOptions[0].value;
            brackets.arduino.preferences.set( "arduino.ide.serialmonitor.eol", serialPortEol);
        });
        
        serialMonitorPanel.$panel.find("#baud").on("change",function(){
            var select_item = serialMonitorPanel.$panel.find("#baud")[0];
            serialPortRate = parseInt(select_item.selectedOptions[0].value);
            brackets.arduino.preferences.set( "arduino.ide.serialmonitor.baudrate", serialPortRate);
            changeParameter();
        });
        
        serialMonitorPanel.$panel.find("#scroll").on("click",function(){
            serialPortScroll = serialMonitorPanel.$panel.find("#scroll")[0].checked;
            brackets.arduino.preferences.set( "arduino.ide.serialmonitor.autoscroll", serialPortScroll);
        });
    };

    return SerialMonitor;
});