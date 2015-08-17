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
		compilerDomainName          = "org-arduino-ide-domain-compiler",
        osDomainName                = "org-arduino-ide-domain-os",
        driverDomainName            = "org-arduino-ide-domain-driver",
        debugDomainName             = "org-arduino-ide-domain-debug";



    var arduinoHints                = null,
        arduinoToolbar              = null;
    //var Locale                     = require("modules/Localization/strings");

    brackets.arduino = {
        revision    : require("modules/Extra/revision").revisions[0],
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

    AppInit.appReady(function () {

        //load domains
        brackets.arduino.domains[serialmonitorDomainName]   = new NodeDomain( serialmonitorDomainName, ExtensionUtils.getModulePath(module, "node/serialmonitor"));
        brackets.arduino.domains[discoveryDomainName]       = new NodeDomain( discoveryDomainName, ExtensionUtils.getModulePath(module, "node/discover"));
        brackets.arduino.domains[filesystemDomainName]      = new NodeDomain( filesystemDomainName, ExtensionUtils.getModulePath(module, "node/filesystem"));
        brackets.arduino.domains[copypasteDomainName]       = new NodeDomain( copypasteDomainName, ExtensionUtils.getModulePath(module, "node/copypaste"));
		brackets.arduino.domains[compilerDomainName]        = new NodeDomain( compilerDomainName, ExtensionUtils.getModulePath(module, "node/compiler"));
        brackets.arduino.domains[osDomainName]              = new NodeDomain( osDomainName, ExtensionUtils.getModulePath(module, "node/os"));
        brackets.arduino.domains[driverDomainName]          = new NodeDomain( driverDomainName, ExtensionUtils.getModulePath(module, "node/driver"));
        brackets.arduino.domains[debugDomainName]           = new NodeDomain( debugDomainName, ExtensionUtils.getModulePath(module, "node/debugger"));

        //TODO complete with others platform path: core, user lib, sketchbook...
        brackets.arduino.options.rootdir            = FileSystem.getDirectoryForPath( FileUtils.getNativeModuleDirectoryPath(module));
        brackets.arduino.options.librariesdir       = FileSystem.getDirectoryForPath( FileUtils.getNativeModuleDirectoryPath(module) + "/libraries");
        brackets.arduino.options.modulesdir         = FileSystem.getDirectoryForPath( FileUtils.getNativeModuleDirectoryPath(module) + "/modules");
        brackets.arduino.options.hardwaredir        = FileSystem.getDirectoryForPath( FileUtils.getNativeModuleDirectoryPath(module) + "/hardware");
        brackets.arduino.options.examples           = FileSystem.getDirectoryForPath( FileUtils.getNativeModuleDirectoryPath(module) + "/examples");
        brackets.arduino.options.shared             = FileSystem.getDirectoryForPath( FileUtils.getNativeModuleDirectoryPath(module) + "/shared");
        //brackets.arduino.options.sketcbook          = FileSystem.getDirectoryForPath( brackets.arduino.preferences.get("arduino.ide.preferences.sketchbook") ||  getDefaultSketchBook() );//brackets.arduino.preferences.get("arduino.ide.preferences.sketchbook") == "" ? getDefaultSketchBook() : brackets.arduino.preferences.get("arduino.ide.preferences.sketchbook");
        //brackets.arduino.options.userlibrariesdir   = FileSystem.getDirectoryForPath( brackets.arduino.options.sketcbook.fullPath + "/libraries");

        brackets.arduino.domains[osDomainName].exec("getUserArduinoHome", brackets.arduino.preferences.get("arduino.ide.preferences.sketchbook") ) //retrieve sketchbook
            .done(function(userHomeDir){
                brackets.arduino.options.sketcbook = FileSystem.getDirectoryForPath( userHomeDir );
                brackets.arduino.preferences.set("arduino.ide.preferences.sketchbook", userHomeDir );
            }).fail(function(err){
                console.error(err);
            });
        brackets.arduino.domains[osDomainName].exec("getUserLibrariesArduinoHome", brackets.arduino.preferences.get("arduino.ide.preferences.sketchbook") ) //retrieve user libraries
            .done(function(userLibHomeDir){
                brackets.arduino.options.userlibrariesdir = FileSystem.getDirectoryForPath( userLibHomeDir );
            }).fail(function(err){
                console.error(err);
            });





        //load modules
        var SerialMonitor   = require("modules/SerialMonitor/main");
        var Discovery       = require("modules/Discovery/main");
		var Console         = require("modules/Console/main");
        var Menu            = require("modules/Menu/main");
		var Compiler        = require("modules/Compiler/main");
        var Debug           = require("modules/Debug/main");

        var serialmonitor   = new SerialMonitor();
        var discovery       = new Discovery();
		var console         = new Console();
        var menu            = new Menu();
		var compiler 		= new Compiler();
        var debug           = new Debug();

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

        // Add hover class to console-btn
        $('#toolbar-console-btn').addClass('consolehover');
    });

});
