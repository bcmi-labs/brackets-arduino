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
        compilerDomain.on("console-success", eventConsoleSuccess);

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
        options.sketchbook   = brackets.arduino.preferences.get("arduino.ide.preferences.sketchbook");

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
        options.sketchbook   = brackets.arduino.preferences.get("arduino.ide.preferences.sketchbook");

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

    var eventConsoleSuccess = function($event, err)
    {
        brackets.arduino.dispatcher.trigger("arduino-event-console-success", err);
    }

    String.prototype.endsWith = function(suffix) {
        return this.indexOf(suffix, this.length - suffix.length) !== -1;
    };


    return Compiler;
});