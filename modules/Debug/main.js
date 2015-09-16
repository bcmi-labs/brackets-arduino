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
        Commands            = brackets.getModule("command/Commands"),
        Menus               = brackets.getModule("command/Menus"),
        ExtensionUtils      = brackets.getModule("utils/ExtensionUtils"),
        FileUtils           = brackets.getModule("file/FileUtils"),
        File                = brackets.getModule("filesystem/File"),
        FileSystem          = brackets.getModule("filesystem/FileSystem"),
        WorkspaceManager    = brackets.getModule("view/WorkspaceManager"),
        EventDispatcher     = brackets.getModule("utils/EventDispatcher"),
        EditorManager       = brackets.getModule("editor/EditorManager"),
        DocumentManager     = brackets.getModule("document/DocumentManager"),
        AppInit             = brackets.getModule("utils/AppInit"),
        Dialogs             = brackets.getModule("widgets/Dialogs"),
        DefaultDialogs      = brackets.getModule("widgets/DefaultDialogs");


    var debugDomainName     = "org-arduino-ide-domain-debug",
        debugIcon           = null,
        debugPanel          = null,
        debugPanelHTML      = null;

    var cmdOpenDebugWindow  = "org.arduino.ide.view.debug.openwindow",
        cmdSetBreakpoint    = "org.arduino.ide.view.debug.setbreakpoint";

    var debugDomain         = null;
    var debugPrefix         = "[arduino ide - debug]";

    var bp = [],
        String,
        sketchFolder,
        bpData,
        bpFile,
        editor,
        codeMirror,
        YN_dialog;

    /**
     * [debug description]
     */
    function Debug () {
        String = brackets.arduino.strings;

        debugPanelInit();

        debugDomain = brackets.arduino.domains[debugDomainName];

        //REGISTER COMMANDS and ADD MENU ITEMS
        CommandManager.register("Debug", cmdOpenDebugWindow, this.showHideDebug);

        var toolsMenu = Menus.getMenu("arduino.ide.menu.tools");
        toolsMenu.addMenuItem( cmdOpenDebugWindow, null, Menus.AFTER);

        CommandManager.register("Set breakpoint", cmdSetBreakpoint, this.setBreakpoint);

        Menus.getContextMenu(Menus.ContextMenuIds.EDITOR_MENU).addMenuDivider();
        Menus.getContextMenu(Menus.ContextMenuIds.EDITOR_MENU).addMenuItem(cmdSetBreakpoint, null)

        //ATTACH EVENT HANDLER
        debugDomain.on('debug_data', debugDataHandler);
        debugDomain.on('debug_err', debugErrorHandler);
        debugDomain.on('close_flag', debugCloseHandler);

        brackets.arduino.dispatcher.on("arduino-event-debug-show",showDebug);
        brackets.arduino.dispatcher.on("arduino-event-debug-hide",hideDebug);
        brackets.arduino.dispatcher.on("arduino-event-debug",this.showHideDebug);
    }


    var showDebug = function(){
        //TODO
        //brackets.arduino.dispatcher.trigger("arduino-event-debug-hide");
        $('#toolbar-debug-btn').removeClass('debughover');

        if (!debugPanel.isVisible()) {
            debugPanel.show();
            /*
             openSerialPort(serialPort, serialPortRate, serialPortEol, function(err){
             if(err) { //TODO send error to arudino console.
             console.error(serialMonitorPrefix + " Error in serial port opening: ", err);
             brackets.arduino.dispatcher.trigger("arduino-event-console-error", serialMonitorPrefix + " Error in serial port opening: " + err.toString());
             }
             else{
             brackets.arduino.dispatcher.trigger("arduino-event-console-log", serialMonitorPrefix + " Serial monitor connected to " + serialPort.address);
             }
             });
             */
            $('#toolbar-debug-btn').addClass('debughover');
            selectElfFile();
        }
    }

    var hideDebug = function(){
        $('#toolbar-debug-btn').removeClass('debughover');

        if (debugPanel.isVisible()){
            debugPanel.hide();
            /*closeSerialPort(serialPort, function(err){
             if(err) { //TODO send error to arudino console.
             console.error(debugPrefix + " Error in serial port closing: ", err);
             brackets.arduino.dispatcher.trigger( "arduino-event-console-error" , debugPrefix + " Error in serial port closing: " + err.toString());
             }
             else{
             brackets.arduino.dispatcher.trigger("arduino-event-console-log", debugPrefix + " Serial monitor disconnected from " + serialPort.address);
             }
             });*/

            debugDomain.exec("stopAll")
                .done(function () {
                    console.log("Debug Stopped...")
                    $('#debugOptions > a' ).each( function(){
                        $(this).attr('disabled',true);
                        $(this).unbind('click')
                    });
                })
                .fail(function(err)
                {
                    console.log("Error in debug stop")
                })
        }
    }

    var loadBreakpointFile = function(file, callback){
        file.read(function(err, data, stat){
            callback(err, data, stat);
        });
    };

    function selectElfFile()
    {
        debugDomain.exec("getTmpFolder")
            .done(function (tmpDir) {
                console.log("Tmp dir : " + tmpDir)
                FileSystem.showOpenDialog(false, false, String.ARDUINO.DIALOG.DEBUGGER.ELF, tmpDir , ['elf'], function(a,selectedElf,c){
                    if (selectedElf[0].length > 0) {
                        console.log("Elf selected : " + selectedElf[0])
                        FileSystem.showOpenDialog(false, true, String.ARDUINO.DIALOG.DEBUGGER.SKETCH_FOLDER, "" , "", function(a,selectedFolder,c){
                            sketchFolder = selectedFolder[0]
                            if (sketchFolder.length > 0) {
                                console.log("Selected folder : " + sketchFolder)
                                debugDomain.exec("launchOpenOcd")
                                    .done(function(pid)
                                    {
                                        if(pid > 1) {
                                            console.log("OpenOcd running...")

                                            debugDomain.exec("launchGdb", selectedElf[0], sketchFolder)
                                                .done(function () {
                                                    console.log("Gdb running...")
                                                    CommandManager.execute(Commands.CMD_ADD_TO_WORKINGSET_AND_OPEN, {fullPath: selectedElf[0].replace('.elf',''), paneId: "first-pane"});
                                                    $('#debugOptions > a' ).each( function(){
                                                        $(this).attr('disabled',false);
                                                    });
                                                    bindButtonsEvents();

                                                    //<editor-fold desc="load bp">
                                                    var bpFileFolder = FileSystem.getFileForPath(selectedElf[0])._parentPath;
                                                    bpFile = FileSystem.getFileForPath( bpFileFolder + '/breakpoints' );
                                                    if(editor == undefined)
                                                        editor = EditorManager.getCurrentFullEditor();
                                                    if(codeMirror == undefined)
                                                        codeMirror = editor._codeMirror;


                                                    loadBreakpointFile(bpFile, function(err, data, stat){
                                                        if(err)
                                                            console.error(debugPrefix + " Error in loading breakpoint file: " + err);
                                                        else{
                                                            bpData = JSON.parse(data);
                                                            brackets.arduino.debug = {"breakpoints" :  bpData  };
                                                            var currentFile = DocumentManager.getCurrentDocument().file;
                                                            $.each(bpData.list, function(index,item) {
                                                                    if(item.file == currentFile._path)
                                                                    {
                                                                        for ( var i = 0 ; i < item.breakpointList.length ; i++ ) {
                                                                            var currentBreakpoint = item.breakpointList[i];
                                                                            codeMirror.addLineClass(currentBreakpoint-1, null, "arduino-breakpoint");

                                                                            debugDomain.exec("set_breakpoint", currentFile._name, currentBreakpoint)
                                                                                .done(function () {
                                                                                    console.log("Breakpoint setted at " + currentFile._name + " : " + currentBreakpoint);
                                                                                })
                                                                                .fail(function (err) {
                                                                                    console.log("Error")
                                                                                })
                                                                        }
                                                                    }
                                                            })
                                                        }
                                                    });
                                                    //</editor-fold>



                                                })
                                                .fail(function(err)
                                                {
                                                    console.log("Error in gdb launch")
                                                })
                                        }
                                    })
                            }
                        } );
                    }
                } );
            })
            .fail(function(err)
            {
                console.log("Error in get tmp dir")
            })
    }

    /**
     * [openDebugWindow description]
     * @return {[type]} [description]
     */
    Debug.prototype.showHideDebug = function(){
        togglePanel();
    }

    /**
     * [setBreakpoint description]
     */
    Debug.prototype.setBreakpoint = function(){
        editor = EditorManager.getCurrentFullEditor();
        codeMirror = editor._codeMirror;
        //TODO : Is a good choice set bp only if the panel is visible???
        if(debugPanel.isVisible()) {
            var line = editor.getCursorPos().line;

            if(bpData) {
                $.each(bpData.list, function (index, item) {
                    if (item.file == DocumentManager.getCurrentDocument().file._path) {
                        //If the selected line isn't yet in the array mark it, unmark otherwise
                        if ($.inArray(line + 1, item.breakpointList) == -1) {
                            item.breakpointList.push(line + 1);
                            item.breakpointList.sort(function (a, b) {
                                return a - b;
                            })
                            //<editor-fold desc=" set breakpoint">
                            debugDomain.exec("set_breakpoint", DocumentManager.getCurrentDocument().file._name, line + 1)
                                .done(function () {
                                    console.log("Breakpoint setted at " + DocumentManager.getCurrentDocument().file._name + " : " + line + 1);
                                    var breakpoint = codeMirror.addLineClass(line, null, "arduino-breakpoint");
                                    bpFile.write(JSON.stringify(bpData), function (err, fs) {
                                        if (err)
                                            console.log("Error in breakpoint file saving")
                                        else
                                            console.log("Breakpoints saved on file")
                                    });
                                })
                                .fail(function (err) {
                                    console.log("Error")
                                })

                            //</editor-fold>
                            var breakpoint = codeMirror.addLineClass(line, null, "arduino-breakpoint");
                        }
                        else {
                            var elementToRemove = line + 1;
                            item.breakpointList = $.grep(item.breakpointList, function (value) {
                                return value != elementToRemove;
                            })

                            //<editor-fold desc=" delete breakpoint">
                            debugDomain.exec("deleteBreakpoint", DocumentManager.getCurrentDocument().file._name, elementToRemove)
                                .done(function () {
                                    console.log("Breakpoint deleted at " + DocumentManager.getCurrentDocument().file._name + " : " + elementToRemove);
                                    var breakpoint = codeMirror.removeLineClass(line, null, "arduino-breakpoint");
                                    bpFile.write(JSON.stringify(bpData), function (err, fs) {
                                        if (err)
                                            console.log("Error in breakpoint file saving")
                                        else
                                            console.log("Breakpoints saved on file")
                                    });
                                })
                                .fail(function (err) {
                                    console.log("Error")
                                })
                            //</editor-fold>


                        }
                    }
                })
            }
            else //if is the first bp
            {
                debugDomain.exec("set_breakpoint", DocumentManager.getCurrentDocument().file._name, line+1)
                    .done(function () {
                        console.log("Breakpoint setted at " + DocumentManager.getCurrentDocument().file._name + " : " + line+1);

                        //push()
                        bpData = {}
                        bpData.list = [];
                        bpData.list.push ({"file" : DocumentManager.getCurrentDocument().file._path , "breakpointList" : [line + 1]});
                        var breakpoint = codeMirror.addLineClass(line, null, "arduino-breakpoint");
                        bpFile.write(JSON.stringify(bpData), function(err,fs){
                            if(err)
                                console.log("Error in breakpoint file saving")
                            else {
                                console.log("Breakpoints saved on file")
                            }
                        });
                    })
                    .fail(function (err) {
                        console.log("Error")
                    })
            }
        }
        else
            var dlg = Dialogs.showModalDialog(DefaultDialogs.DIALOG_ID_INFO, "Debug not active", "Run Debug before proceed");
    }



    var togglePanel = function() {
        if (debugPanel.isVisible()) {
            hideDebug();
        }
        else {
            showDebug();
        }
    };

    var debugDataHandler = function($event, data){
        if(data)
        {
            if(data != "(gdb) ")
                $('#debug_log').html( $('#debug_log').html() + "<span style='color: black;'>" + data.replace("(gdb)","") + "</span><hr>");
            //TODO: evaluate condition ?
            //if(brackets.arduino.preferences.get("arduino.ide.debug.autoscroll") )
            $('#debug_log').scrollTop($('#debug_log')[0].scrollHeight);
        }

    };

    var debugErrorHandler = function($event, error){
        if(error){
            //brackets.arduino.dispatcher.trigger("arduino-event-debug-error", debugPrefix + " Error in debugging : " + error.toString());
            if(error != "(gdb) ")
                $('#debug_log').html( $('#debug_log').html() + "<span style='color: red;'>" + error.replace("(gdb)","") + "</span><hr>");
            $('#debug_log').scrollTop($('#debug_log')[0].scrollHeight);
        }
    }

    var debugCloseHandler = function($event, flag){
        if(flag == "1")
            $('#debug_log').html('');
    }

    function bindButtonsEvents()
    {
        debugPanel.$panel.find("#haltsketchDebug_button").on("click",function(){
            debugDomain.exec("halt")
                .done(function(){
                    console.log("Halt execution")
                })
                .fail(function(err)
                {
                    console.log("Error in halt execution")
                })
        });

        debugPanel.$panel.find("#restartsketchDebug_button").on("click",function(){
            debugDomain.exec("restart")
                .done(function(){
                    console.log("Restart execution")
                })
                .fail(function(err)
                {
                    console.log("Error in restart execution")
                })
        });

        debugPanel.$panel.find("#continuesketchDebug_button").on("click",function(){
            debugDomain.exec("step_next_bp")
                .done(function(){
                    console.log("Continue execution (next bp)")
                })
                .fail(function(err)
                {
                    console.log("Error")
                })
        });

        debugPanel.$panel.find("#stepsketchDebug_button").on("click",function(){
            debugDomain.exec("step_next_line")
                .done(function(){
                    console.log("Continue execution (next line)")
                })
                .fail(function(err)
                {
                    console.log("Error")
                })
        });

        debugPanel.$panel.find("#showbreakpointDebug_button").on("click",function(){
            debugDomain.exec("show_breakpoints")
                .done(function(){
                    console.log("List of breakpoints")
                })
                .fail(function(err)
                {
                    console.log("Error")
                })
        });

        debugPanel.$panel.find("#setbreakpointDebug_button").on("click",function(){
            var currentFileName = DocumentManager.getCurrentDocument().file.name.replace('.ino','.cpp');
            for ( var i = 0 ; i < bp.length ; i++ ) {
                var cur_bp = bp[i];
                debugDomain.exec("set_breakpoint", currentFileName, cur_bp)
                    .done(function () {
                        console.log("Breakpoint setted at " + currentFileName + " : " + cur_bp);
                    })
                    .fail(function (err) {
                        console.log("Error")
                    })
            }
        });

        debugPanel.$panel.find("#showvalueDebug_button").on("click",function(){
            debugDomain.exec("show_variables")
                .done(function(){
                    console.log("Show variables" )
                })
                .fail(function(err)
                {
                    console.log("Error")
                })
        });
    }

    function debugPanelInit(){
        ExtensionUtils.loadStyleSheet(module, "css/Debug.css");

        debugPanelHTML = require("text!modules/Debug/html/Debug.html");
        debugPanel = WorkspaceManager.createBottomPanel("modules/Debug/html/debug.panel", $(debugPanelHTML));
    };

    return Debug;
});

//TODO : Improve UI