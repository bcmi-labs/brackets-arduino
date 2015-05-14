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
    'use strict';
	var ExtensionUtils  = brackets.getModule("utils/ExtensionUtils"),
    	CommandManager  = brackets.getModule("command/CommandManager"),
        Commands        = brackets.getModule("command/Commands"),
        Menus           = brackets.getModule("command/Menus"),
        EditorManager   = brackets.getModule("editor/EditorManager"),
        NodeDomain      = brackets.getModule("utils/NodeDomain"),
        AppInit         = brackets.getModule("utils/AppInit"),
        FileUtils       = brackets.getModule("file/FileUtils"),
        FileSystem      = brackets.getModule("filesystem/FileSystem"),
        EventDispatcher = brackets.getModule("utils/EventDispatcher"),
        ViewCommandHandlers = brackets.getModule("view/ViewCommandHandlers");

    var serialmonitorDomainName     = "org-arduino-ide-domain-serialmonitor",
        discoveryDomainName         = "org-arduino-ide-domain-discovery",
        filesystemDomainName        = "org-arduino-ide-domain-filesystem",
        copypasteDomainName         = "org-arduino-ide-domain-copypaste",
		compilerDomainName          = "org-arduino-ide-domain-compiler";

    var arduinoHints                = null;

    brackets.arduino = {
        version     : 2000000,  //version symbolize XXX.YYY.ZZZ
        hversion    : "2.0.0",
        preferences : {},
        domains     : {},
        dispatcher  : {},
        options     : {
            target      : {
                port        : {},
                board       : {},
                programmer  : {}
            }
        }
    };

    //CREATE THE EVENT DISPATCHER
    EventDispatcher.makeEventDispatcher(brackets.arduino.dispatcher);

    var Preferences   = require("modules/Preferences/pref");
    var Options   = require("modules/Preferences/opts");
    var opts = new Options( FileUtils.getNativeModuleDirectoryPath(module) + "/hardware/arduino" );

    brackets.arduino.preferences  = new Preferences( FileUtils.getNativeModuleDirectoryPath(module) + "/shared/preferences.json" );

    //TODO complete with others platform path: core, user lib, sketchbook...
    brackets.arduino.options.rootdir       = FileSystem.getDirectoryForPath( FileUtils.getNativeModuleDirectoryPath(module));
    brackets.arduino.options.librariesdir  = FileSystem.getDirectoryForPath( FileUtils.getNativeModuleDirectoryPath(module) + "/libraries");
    brackets.arduino.options.modulesdir    = FileSystem.getDirectoryForPath( FileUtils.getNativeModuleDirectoryPath(module) + "/modules");
    brackets.arduino.options.hardwaredir   = FileSystem.getDirectoryForPath( FileUtils.getNativeModuleDirectoryPath(module) + "/hardware");

    AppInit.appReady(function () {

        //load domains
        brackets.arduino.domains[serialmonitorDomainName]   = new NodeDomain( serialmonitorDomainName, ExtensionUtils.getModulePath(module, "node/serialmonitor"));
        brackets.arduino.domains[discoveryDomainName]       = new NodeDomain( discoveryDomainName, ExtensionUtils.getModulePath(module, "node/discover"));
        brackets.arduino.domains[filesystemDomainName]      = new NodeDomain( filesystemDomainName, ExtensionUtils.getModulePath(module, "node/filesystem"));
        brackets.arduino.domains[copypasteDomainName]       = new NodeDomain( copypasteDomainName, ExtensionUtils.getModulePath(module, "node/copypaste"));
		brackets.arduino.domains[compilerDomainName] = new NodeDomain( compilerDomainName, ExtensionUtils.getModulePath(module, "node/compiler"));

        //load modules
        var SerialMonitor   = require("modules/SerialMonitor/main");
        var Discovery       = require("modules/Discovery/main");
		var Console         = require("modules/Console/main");
        var Menu            = require("modules/Menu/main");
		var Compiler        = require("modules/Compiler/main");

        var serialmonitor   = new SerialMonitor();
        var discovery       = new Discovery();
		var console         = new Console();
        var menu            = new Menu();
		var compiler 		= new Compiler();

        opts.setTargetBoard( brackets.arduino.preferences.get("arduino.ide.options.target.board"));
        opts.setTargetPort( brackets.arduino.preferences.get("arduino.ide.options.target.port"));
        opts.setTargetProgrammer( brackets.arduino.preferences.get("arduino.ide.options.target.programmer"));
        var prefsize = brackets.arduino.preferences.get("arduino.ide.preferences.fontsize");
        ViewCommandHandlers.setFontSize( prefsize + "px" );

        arduinoHints    = require("modules/Hints/main");


        if(brackets.arduino.preferences.get("arduino.ide.preferences.checkupdate")) {
            var chk = require("modules/Extra/checkupdate");
            chk.checkLatest(brackets.arduino.version);
        }




        // Main-Toolbar Buttons
        var arduinoLogo = "<a id='toolbar-arduino-logo' href='http://www.arduino.org' target='_blank' alt='Arduino.org'></a><span id='toolbar-sep1'></span>";

        var arduinoButtons = arduinoLogo +  "<a id='toolbar-verify-btn' class='toolbar-btn' href='#' title='Verify'></a>" +
                                            "<a id='toolbar-upload-btn' class='toolbar-btn' href='#' title='Upload'></a>" +
                                                "<span id='toolbar-sep2'></span>" +
                                            "<a id='toolbar-new-btn' class='toolbar-btn' href='#' title='New'></a>" +
                                            "<a id='toolbar-open-btn' class='toolbar-btn' href='#' title='Open'></a>" +
                                            "<a id='toolbar-save-btn' class='toolbar-btn' href='#' title='Save'></a>" +
                                            "<a id='toolbar-console-btn' class='toolbar-btn' href='#' title='Console'></a>" +
                                            "<a id='toolbar-serial-btn' class='toolbar-btn' href='#' title='Serial Monitor'></a>";
                                            //"<a id='toolbar-files-btn' class='toolbar-btn' href='#' title='Files'></a>";

        $('.working-set-splitview-btn').remove();

        $('.buttons').html(arduinoButtons);
        $('.bottom-buttons').html("<a id='toolbar-toggle-btn' class='toolbar-btn' href='#' title='Open/Close Sidebar'></a>");
        
        $('.toolbar-btn').click(function(evt){
            evt.preventDefault();
            toolbarHandler(this.id);
        });

        ExtensionUtils.loadStyleSheet(module, "main.css");
        
    });

    function toolbarHandler(btnid){
        switch(btnid) {
            case 'toolbar-verify-btn':
                    CommandManager.execute(Commands.FILE_SAVE);
                    brackets.arduino.dispatcher.trigger("arduino-event-console-clear");
                    brackets.arduino.dispatcher.trigger('arduino-event-build');
                    break;
            case 'toolbar-upload-btn':
                    CommandManager.execute(Commands.FILE_SAVE);
                    brackets.arduino.dispatcher.trigger("arduino-event-console-clear");
                    brackets.arduino.dispatcher.trigger('arduino-event-upload');
                    break;
            case 'toolbar-new-btn':
                    CommandManager.execute(Commands.FILE_NEW);
                    break;
            case 'toolbar-open-btn':
                    CommandManager.execute(Commands.FILE_OPEN);
                    break;
            case 'toolbar-save-btn':
                    CommandManager.execute(Commands.FILE_SAVE);
                    break;
            case 'toolbar-serial-btn':
                    brackets.arduino.dispatcher.trigger('arduino-event-menu-tool-serialmonitor');
                    break;
            case 'toolbar-console-btn':
                    brackets.arduino.dispatcher.trigger('arduino-event-console-show');
                break;
            case 'toolbar-toggle-btn':
                    if($('#sidebar').is(':visible')){
                        $('#sidebar').hide();
                        $('.main-view .content').css('right', '0px');
                    }
                    else{
                        $('.main-view .content').css('right', '200px');   
                        $('#sidebar').show();
                    }
                    break;
            default:
                console.log(btnid+' clicked');
            }
    }
});