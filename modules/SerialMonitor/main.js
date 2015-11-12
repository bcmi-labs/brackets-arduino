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
        serialPort                  = brackets.arduino.options.target.port;
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
        CommandManager.register("Serial Monitor", cmdOpenSerialMonitorWindow, this.showHideSerialMonitor);

        //TODO: it would be better to get the menu items and their position in a configuration file
        //TODO: it would be better to put this item in the TOOL menu
        var viewMenu = Menus.getMenu(Menus.AppMenuBar.VIEW_MENU);
        viewMenu.addMenuItem( cmdOpenSerialMonitorWindow, null, Menus.FIRST);

        //ATTACH EVENT HANDLER
        serialDomain.on('serial_data', serialDataHandler);
        serialDomain.on('serial_operation_error', serialErrorHandler);

        brackets.arduino.dispatcher.on("arduino-event-port-change", eventSerialPortChange);
        brackets.arduino.dispatcher.on("arduino-event-serialmonitor-show",showSerialMonitor);
        brackets.arduino.dispatcher.on("arduino-event-serialmonitor-hide",hideSerialMonitor);
        brackets.arduino.dispatcher.on("arduino-event-serialmonitor",this.showHideSerialMonitor);
    }


    var eventSerialPortChange = function($event, port){
        if(port && port!= serialPort){
            serialPort = port;
            changeParameter();
        }
    };

    var showSerialMonitor = function(){
        brackets.arduino.dispatcher.trigger("arduino-event-console-hide");
        $('#toolbar-console-btn').removeClass('consolehover');

        if (!serialMonitorPanel.isVisible()) {
            serialMonitorPanel.show();
            openSerialPort(serialPort, serialPortRate, serialPortEol, function(err){
                if(err) { //TODO send error to arudino console.
                    console.error(serialMonitorPrefix + " Error in serial port opening: ", err);
                    brackets.arduino.dispatcher.trigger("arduino-event-console-error", serialMonitorPrefix + " Error in serial port opening: " + err.toString());
                }
                else{
                    brackets.arduino.dispatcher.trigger("arduino-event-console-log", serialMonitorPrefix + " Serial monitor connected to " + serialPort.address);
                }
            });
            $('#toolbar-serial-btn').addClass('serialhover');
        }
    }

    var hideSerialMonitor = function(){
        $('#toolbar-serial-btn').removeClass('serialhover');

        if (serialMonitorPanel.isVisible()){
            serialMonitorPanel.hide();
            closeSerialPort(serialPort, function(err){
                if(err) { //TODO send error to arudino console.
                    console.error(serialMonitorPrefix + " Error in serial port closing: ", err);
                    brackets.arduino.dispatcher.trigger( "arduino-event-console-error" , serialMonitorPrefix + " Error in serial port closing: " + err.toString());
                }
                else{
                    brackets.arduino.dispatcher.trigger("arduino-event-console-log", serialMonitorPrefix + " Serial monitor disconnected from " + serialPort.address);
                }
            });
        }
    }



    /**
     * [openSerialMonitorWindow description]
     * @return {[type]} [description]
     */
    SerialMonitor.prototype.showHideSerialMonitor = function(){
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
            hideSerialMonitor();
        } 
        else {
            showSerialMonitor();
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
            $('#console_log').html( $('#console_log').html() + "<span style='color: black;'>" + data + "</span><br />");
            if(brackets.arduino.preferences.get("arduino.ide.serialmonitor.autoscroll") )
                $('#console_log').scrollTop($('#console_log')[0].scrollHeight);
        }
            
    };

    /**
     * callback function, called when the serial communication fails.
     * @param  {Event} $event the event emitted by the NodeDomain of brackets
     * @param  {String} error the string sent by the board
     */
    var serialErrorHandler = function($event, error){
        if(error){
            brackets.arduino.dispatcher.trigger("arduino-event-console-error", serialMonitorPrefix + " Error in serial port closing: " + error.toString());
        }
    }

    /**
     * used to clear the text area
     */
    function clear() {
        $('#console_log').html( "");
        $('#message_input').html( "");
    };
    

    function changeParameter()  {

        if (serialMonitorPanel.isVisible()) {
            closeSerialPort(serialPort, function (err) {
                if (!err)
                    openSerialPort(serialPort, serialPortRate, serialPortEol, function (err) {
                        if (!err){
                            clear();
                            brackets.arduino.dispatcher.trigger( "arduino-event-console-log" , serialMonitorPrefix + " Serial monitor connected to " + serialPort.address);
                        }
                        else {
                            console.error(serialMonitorPrefix + " Error in serial port opening: ", err);
                            brackets.arduino.dispatcher.trigger( "arduino-event-console-error" , serialMonitorPrefix + " Error in serial port opening: " + err.toString());
                        }
                    });
                else {
                    //console.error(serialMonitorPrefix + " Error in serial port closing: ", err);
                    openSerialPort(serialPort, serialPortRate, serialPortEol, function (err) {
                        if (!err) {
                            clear();
                            brackets.arduino.dispatcher.trigger("arduino-event-console-log", serialMonitorPrefix + " Serial monitor connected to " + serialPort.address);
                        }
                        else {
                            console.error(serialMonitorPrefix + " Error in serial port opening: ", err);
                            brackets.arduino.dispatcher.trigger("arduino-event-console-error", serialMonitorPrefix + " Error in serial port closing: " + err.toString());
                        }
                    });
                }
            });
        }
    };

    function openSerialPort(serialPort, rate, eol, callback){
        if( (serialPort && typeof serialPort != "undefined" && serialPort!= "") &&
            (serialPortRate && typeof serialPortRate != "undefined" && serialPortRate!= "") &&
            (serialPortEol && typeof serialPortEol != "undefined" && serialPortEol!= "")
        ) {
            serialDomain.exec("open", serialPort.address, parseInt(serialPortRate), serialPortEol)
                .done( function(){
                    callback(null);
                })
                .fail(function(err) {
                    callback(err);
                });
        }
        else//TODO i18n error message
            callback("Serial port or baud rate not specified");
    }

    function closeSerialPort(serialPort, callback){
        if( (serialPort && typeof serialPort != "undefined" && serialPort!= "") &&
            (serialPortRate && typeof serialPortRate != "undefined" && serialPortRate!= "")
        ) {
            serialDomain.exec("close", serialPort.address)
                .done(function () {
                    callback(null);
                })
                .fail(function (err) {
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
                serialDomain.exec("send", message)
                    .done(function (){
                        serialMonitorPanel.$panel.find("#message_input")[0].value = "";
                    })
                    .fail(function(){

                    });
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
            changeParameter();
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