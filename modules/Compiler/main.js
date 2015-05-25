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
 * Copyright 2015 Arduino Srl (http://www.arduino.org/) support@arduino.org
 *
 * authors: arduino.org team
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
        EventDispatcher     = brackets.getModule("utils/EventDispatcher"),
        DocumentManager     = brackets.getModule("document/DocumentManager");


    var compilerDomainName     = "org-arduino-ide-domain-compiler",
        buildIcon              = null,
        uploadIcon              = null;

    var pref    = null,
        evt     = null;

    var options = {};
    var compilerDomain         = null;


    /**
     * [Compiler description]
     */
    function Compiler () {

        pref = brackets.arduino.preferences;
        evt  = brackets.arduino.dispatcher;


        ExtensionUtils.loadStyleSheet(module, "css/Compiler.css");

        compilerDomain = brackets.arduino.domains[compilerDomainName];

        /*
        buildIcon = $("<a id='build-icon' class='build-icon' href='#'></a>");
        buildIcon.attr("title", "Build");
        buildIcon.appendTo($("#main-toolbar .buttons"));
        buildIcon.on("click", onBuildIconClick);

        uploadIcon = $("<a id='upload-icon' class='upload-icon' href='#'></a>");
        uploadIcon.attr("title", "Upload");
        uploadIcon.appendTo($("#main-toolbar .buttons"));
        uploadIcon.on("click", onUploadIconClick);
        */

        //TODO: it would be better to get the menu items and their position in a configuration file
        //TODO: it would be better to put this item in the TOOL menu
        //var viewMenu = Menus.getMenu(Menus.AppMenuBar.VIEW_MENU);
        //viewMenu.addMenuItem( cmdOpenSerialMonitorWindow, null, Menus.FIRST);


        compilerDomain.on("console-log", eventConsoleData);
        compilerDomain.on("console-error", eventConsoleErr);

        brackets.arduino.dispatcher.on("arduino-event-build", onBuildIconClick);
        brackets.arduino.dispatcher.on("arduino-event-upload", onUploadIconClick);
    }

    function onBuildIconClick()
    {
        var sketch_dir = DocumentManager.getCurrentDocument().file._parentPath.slice(0,DocumentManager.getCurrentDocument().file._parentPath.length-1);
        options.name = DocumentManager.getCurrentDocument().file._name.split(".")[0];
        options.device = brackets.arduino.options.target.board;
        //TEMPORARY DISABLED
        //options.platform = brackets.arduino.options.target.board;

        options.verbosebuild = brackets.arduino.preferences.get("arduino.ide.preferences.verbosebuild");

        //TODO  come gestirlo ?
        //options.device.upload.protocol = brackets.arduino.options.target.programmer;

        brackets.arduino.dispatcher.trigger("arduino-event-console-clear");
        compilerDomain.exec("compile",options,sketch_dir,false);
    }

    function onUploadIconClick()
    {
        var sketch_dir = DocumentManager.getCurrentDocument().file._parentPath.slice(0,DocumentManager.getCurrentDocument().file._parentPath.length-1);
        options.name = DocumentManager.getCurrentDocument().file._name.split(".")[0];
        options.device = brackets.arduino.options.target.board;

        options.verbosebuild = brackets.arduino.preferences.get("arduino.ide.preferences.verbosebuild");
        options.verboseupload = brackets.arduino.preferences.get("arduino.ide.preferences.verboseupload");

        //TEMPORARY DISABLED
        //options.platform = brackets.arduino.options.target.board;

        options.port = brackets.arduino.options.target.port.address;

        //TODO  come gestirlo ?
        //options.device.upload.protocol = brackets.arduino.options.target.programmer;

        brackets.arduino.dispatcher.trigger("arduino-event-console-clear");
        compilerDomain.exec("compile",options,sketch_dir,true);
    }

    var eventConsoleData = function($event, data)
    {
        brackets.arduino.dispatcher.trigger("arduino-event-console-log", data);
    }

    var eventConsoleErr = function($event, err)
    {
        brackets.arduino.dispatcher.trigger("arduino-event-console-error", err);
    }

    String.prototype.endsWith = function(suffix) {
        return this.indexOf(suffix, this.length - suffix.length) !== -1;
    };


    return Compiler;
});