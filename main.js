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

/*require.config({
    paths: {
        "text" : "lib/text",
        "i18n" : "lib/i18n"
    },
    locale: brackets.getLocale()
});
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



    var arduinoHints                = null,
        arduinoToolbar              = null;
    //var Locale                     = require("modules/Localization/strings");

    brackets.arduino = {
        revision    : require("modules/Extra/revision"),
        strings     : require("modules/Localization/strings"),
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
    brackets.arduino.options.examples      = FileSystem.getDirectoryForPath( FileUtils.getNativeModuleDirectoryPath(module) + "/examples");

    AppInit.appReady(function () {

        //load domains
        brackets.arduino.domains[serialmonitorDomainName]   = new NodeDomain( serialmonitorDomainName, ExtensionUtils.getModulePath(module, "node/serialmonitor"));
        brackets.arduino.domains[discoveryDomainName]       = new NodeDomain( discoveryDomainName, ExtensionUtils.getModulePath(module, "node/discover"));
        brackets.arduino.domains[filesystemDomainName]      = new NodeDomain( filesystemDomainName, ExtensionUtils.getModulePath(module, "node/filesystem"));
        brackets.arduino.domains[copypasteDomainName]       = new NodeDomain( copypasteDomainName, ExtensionUtils.getModulePath(module, "node/copypaste"));
		brackets.arduino.domains[compilerDomainName]        = new NodeDomain( compilerDomainName, ExtensionUtils.getModulePath(module, "node/compiler"));

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

        ExtensionUtils.loadStyleSheet(module, "main.css");

        opts.setTargetBoard( brackets.arduino.preferences.get("arduino.ide.options.target.board"));
        opts.setTargetPort( brackets.arduino.preferences.get("arduino.ide.options.target.port"));
        opts.setTargetProgrammer( brackets.arduino.preferences.get("arduino.ide.options.target.programmer"));
        var prefsize = brackets.arduino.preferences.get("arduino.ide.preferences.fontsize");
        ViewCommandHandlers.setFontSize( prefsize + "px" );

        arduinoHints    = require("modules/Hints/main");

        if(brackets.arduino.preferences.get("arduino.ide.preferences.checkupdate")) {
            var chk = require("modules/Extra/checkupdate");
            chk.checkLatest(brackets.arduino.revision.version);
        }

        // Main-Toolbar Buttons
        arduinoToolbar = require("modules/Toolbar/main");
        arduinoToolbar.init(brackets.arduino.strings, brackets.arduino.dispatcher);
        arduinoToolbar.load();

        $('.working-set-splitview-btn').remove();

        //Console log - logmsg.click event
        $('.logmsg').click(function(evt){
            alert('ciao');
        });
    });

});