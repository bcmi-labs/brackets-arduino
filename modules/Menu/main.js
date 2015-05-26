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

define(function (require, exports, module) {
    "use strict";

    var	AppInit         = brackets.getModule("utils/AppInit"),
        CommandManager  = brackets.getModule("command/CommandManager"),
        Commands        = brackets.getModule("command/Commands"),
        Menus           = brackets.getModule("command/Menus"),
        Dialogs         = brackets.getModule("widgets/Dialogs"),
        DefaultDialogs  = brackets.getModule("widgets/DefaultDialogs"),
        NodeDomain      = brackets.getModule("utils/NodeDomain"),
        ExtensionUtils  = brackets.getModule("utils/ExtensionUtils"),
        FileSystem      = brackets.getModule("filesystem/FileSystem"),
        Directory       = brackets.getModule("filesystem/Directory"),
        File            = brackets.getModule("filesystem/File"),
        FileUtils       = brackets.getModule("file/FileUtils"),
        EditorManager   = brackets.getModule("editor/EditorManager"),
        Editor          = brackets.getModule("editor/Editor"),
        DocumentManager = brackets.getModule("document/DocumentManager"),
        Document        = brackets.getModule("document/Document"),
        ProjectManager  = brackets.getModule("project/ProjectManager");

    var filesystemDomainName    = "org-arduino-ide-domain-filesystem",
        filesystemDomain        = null,
        copypasteDomainName     = "org-arduino-ide-domain-copypaste",
        copypasteDomain         = null;

    var menuPrefix         = "[arduino ide - menu] ";

    var sketch_importLibraryPanel           = null,//require("text!./html/importLibrary.html"),
        sketch_importLibraryDialog          = null,     //dialog window for import arduino libraries and select zip or folder
        sketch_importLibraryDirectory       = null,     //arduino libraries directory
        sketch_importLibraryUserDirectory   = null;   //user libraries directory

    //Menus IDs
    var ARDUINO_MENU_FILE_ID 	= "arduino.ide.menu.file",
        ARDUINO_MENU_EDIT_ID 	= "arduino.ide.menu.edit",
        ARDUINO_MENU_TOOLS_ID 	= "arduino.ide.menu.tools",
        ARDUINO_MENU_SKETCH_ID 	= "arduino.ide.menu.sketch",
        ARDUINO_MENU_HELP_ID 	= "arduino.ide.menu.help";

    //Tool Menu IDs
    var ARDUINO_MENU_TOOL_AUTO_FORMATTING 		    = "arduino.ide.menu.tool.auto_formatting",
        ARDUINO_MENU_TOOL_STORE_SKETCH              = "arduino.ide.menu.tool.store_sketch",
        //ARDUINO_MENU_TOOL_VERIFY_CODE_AND_RELOAD    = "arduino.ide.menu.tool.verify_code_and_reload",
        ARDUINO_MENU_TOOL_SERIAL_MONITOR 		    = "arduino.ide.menu.tool.serial_monitor",
        ARDUINO_MENU_TOOL_SELECT_BOARD              = "arduino.ide.menu.tool.select_board",
        ARDUINO_MENU_TOOL_SELECT_PORT               = "arduino.ide.menu.tool.select_port",
        ARDUINO_MENU_TOOL_SELECT_PROGRAMMER         = "arduino.ide.menu.tool.select_programmer",
        ARDUINO_MENU_TOOL_WRITE_BOOTLOADER          = "arduino.ide.menu.tool.write_bootloader";

    //Sketch Menu IDs
    var ARDUINO_MENU_SKETCH_VERIFY_COMPILE 		= "arduino.ide.menu.sketch.verify_and_compile",
        ARDUINO_MENU_SKETCH_ADD_FILE         		= "arduino.ide.menu.sketch.add_file",
        ARDUINO_MENU_SKETCH_IMPORT_LIBS			    = "arduino.ide.menu.sketch.import_libs",
        ARDUINO_MENU_SKETCH_OPEN_SKETCH_FOLDER 	    = "arduino.ide.menu.sketch.open_sketch_folder";

    //File Menu IDs
    var ARDUINO_MENU_FILE_OPEN_SAMPLE_FOLDER 	    = "arduino.ide.menu.file.open_sketch_folder",
        ARDUINO_MENU_FILE_UPLOAD 					= "arduino.ide.menu.file.upload",
        ARDUINO_MENU_FILE_UPLOAD_BY_PROGRAMMER 		= "arduino.ide.menu.file.upload_by_programmer",
        ARDUINO_MENU_FILE_PAGE_SETTINGS 			= "arduino.ide.menu.file.page_settings",
        ARDUINO_MENU_FILE_PRINT 					= "arduino.ide.menu.file.print",
        ARDUINO_MENU_FILE_SETTINGS 					= "arduino.ide.menu.file.settings";

    //Edit Menu IDs
    var ARDUINO_MENU_EDIT_COPY_FORUM 			    = "arduino.ide.menu.edit.copy_forum",
        ARDUINO_MENU_EDIT_COPY_HTML 				= "arduino.ide.menu.edit.copy_html",
        ARDUINO_MENU_EDIT_FIND_SELECTED 			= "arduino.ide.menu.edit.find_selected";


    //Edit Menu IDs
    var ARDUINO_MENU_HELP_ABOUT 			        = "arduino.ide.menu.help.about";

    var Strings;
    /**
     * This module set the brackets menu
     */
    function Menu () {
        //get domains
        filesystemDomain = brackets.arduino.domains[filesystemDomainName];
        copypasteDomain  = brackets.arduino.domains[copypasteDomainName];
        Strings = brackets.arduino.strings;
        sketch_importLibraryDirectory       = brackets.arduino.options.librariesdir;

        //Menus.removeMenu(Menus.AppMenuBar.FIND_MENU);
        Menus.removeMenu(Menus.AppMenuBar.NAVIGATE_MENU);
        Menus.removeMenu(Menus.AppMenuBar.VIEW_MENU);
 //       Menus.removeMenu("debug-menu");

        createToolMenu();
        createSketchMenu();
        createEditMenu();
        createFileMenu();
        createHelpMenu();

        filesystemDomain.exec("getPlatform");
        filesystemDomain.on("sampleList_data", setMenuActions);
        filesystemDomain.on("platform_data", getPlatformAction);

        ExtensionUtils.loadStyleSheet(module, "css/Menu.css");
        ExtensionUtils.loadStyleSheet(module, "css/aboutDialog.css");

    };

    //TODO IMPROVE
    function getPlatformAction($event, userLibrariesFolder, standard)
    {
        //var libsFolder = standard;
        sketch_importLibraryUserDirectory = FileSystem.getDirectoryForPath(FileUtils.convertWindowsPathToUnixPath(userLibrariesFolder));

        //TODO get the user folder in the main file, get the lib path, sketchbook and
        ///Users/user/Documents/Arduino
    }

    function bePatient(){
        //window.alert("Be patient :)");
        var dlg = Dialogs.showModalDialog(DefaultDialogs.DIALOG_ID_INFO, "Be patient", "Be patient :) <br> we are working to complete all the missing functions. <br> stay tuned! ");
    }

    //CREATE MENUS
    function createToolMenu() {
        var ToolsMenu = Menus.addMenu(Strings.ARDUINO.MENU.TOOLS.TITLE, ARDUINO_MENU_TOOLS_ID, Menus.FIRST);

        CommandManager.register(Strings.ARDUINO.MENU.TOOLS.ITEM_AUTO_FORMATTING  + " [" + Strings.ARDUINO.EXTRAS.COMING_SOON + "]", ARDUINO_MENU_TOOL_AUTO_FORMATTING, bePatient);
        CommandManager.register(Strings.ARDUINO.MENU.TOOLS.ITEM_STORE_SKETCH + " [" + Strings.ARDUINO.EXTRAS.COMING_SOON + "]", ARDUINO_MENU_TOOL_STORE_SKETCH, bePatient);
        //CommandManager.register("Fix encoding and reload [Coming Soon (A)]", ARDUINO_MENU_TOOL_VERIFY_CODE_AND_RELOAD, bePatient);
        CommandManager.register(Strings.ARDUINO.MENU.TOOLS.ITEM_SERIAL_MONITOR, ARDUINO_MENU_TOOL_SERIAL_MONITOR, toolMenu_SerialMonitor);

        CommandManager.register(Strings.ARDUINO.MENU.TOOLS.ITEM_BOARD, ARDUINO_MENU_TOOL_SELECT_BOARD, toolMenu_SelectBoardPanel);
        CommandManager.register(Strings.ARDUINO.MENU.TOOLS.ITEM_PORT, ARDUINO_MENU_TOOL_SELECT_PORT, toolMenu_SelectPortPanel);

        CommandManager.register(Strings.ARDUINO.MENU.TOOLS.ITEM_PROGRAMMER, ARDUINO_MENU_TOOL_SELECT_PROGRAMMER, toolMenu_SelectProgrammerPanel);
        CommandManager.register(Strings.ARDUINO.MENU.TOOLS.ITEM_BURN_BOOTLOADER + " [" +Strings.ARDUINO.EXTRAS.COMING_SOON + "]", ARDUINO_MENU_TOOL_WRITE_BOOTLOADER, bePatient);

        ToolsMenu.addMenuItem(ARDUINO_MENU_TOOL_AUTO_FORMATTING);
        ToolsMenu.addMenuItem(ARDUINO_MENU_TOOL_STORE_SKETCH);
        //ToolsMenu.addMenuItem(ARDUINO_MENU_TOOL_VERIFY_CODE_AND_RELOAD);
        ToolsMenu.addMenuItem(ARDUINO_MENU_TOOL_SERIAL_MONITOR);
        ToolsMenu.addMenuDivider("arduino.menu.tools.divider1");
        ToolsMenu.addMenuItem(ARDUINO_MENU_TOOL_SELECT_BOARD);
        ToolsMenu.addMenuItem(ARDUINO_MENU_TOOL_SELECT_PORT);
        ToolsMenu.addMenuDivider("arduino.menu.tools.divider2");
        ToolsMenu.addMenuItem(ARDUINO_MENU_TOOL_SELECT_PROGRAMMER);
        ToolsMenu.addMenuItem(ARDUINO_MENU_TOOL_WRITE_BOOTLOADER);
    }

    function createSketchMenu() {
        var SketchMenu = Menus.addMenu(Strings.ARDUINO.MENU.SKETCH.TITLE, ARDUINO_MENU_SKETCH_ID, Menus.FIRST);

        CommandManager.register(Strings.ARDUINO.MENU.SKETCH.ITEM_BUILD, ARDUINO_MENU_SKETCH_VERIFY_COMPILE, sketchMenu_VerifyCompile);
        CommandManager.register(Strings.ARDUINO.MENU.SKETCH.ITEM_ADD_FILE, ARDUINO_MENU_SKETCH_ADD_FILE, sketchMenu_AddFile);
        CommandManager.register(Strings.ARDUINO.MENU.SKETCH.ITEM_IMPORT_LIB + " [" + Strings.ARDUINO.EXTRAS.WIP +"]", ARDUINO_MENU_SKETCH_IMPORT_LIBS, sketchMenu_ImportLibs);
        CommandManager.register(Strings.ARDUINO.MENU.SKETCH.ITEM_SHOW_FOLDER + " [" + Strings.ARDUINO.EXTRAS.COMING_SOON + "]", ARDUINO_MENU_SKETCH_OPEN_SKETCH_FOLDER, bePatient);

        SketchMenu.addMenuItem(ARDUINO_MENU_SKETCH_VERIFY_COMPILE);
        SketchMenu.addMenuDivider("arduino.menu.sketch.divider1");
        SketchMenu.addMenuItem(ARDUINO_MENU_SKETCH_ADD_FILE);
        SketchMenu.addMenuItem(ARDUINO_MENU_SKETCH_IMPORT_LIBS);
        SketchMenu.addMenuItem(ARDUINO_MENU_SKETCH_OPEN_SKETCH_FOLDER);
    }

    function createEditMenu(){
        //Menus.removeMenu(Menus.AppMenuBar.EDIT_MENU);

        var EditMenu = Menus.getMenu(Menus.AppMenuBar.EDIT_MENU);//Menus.addMenu("Edit", ARDUINO_MENU_EDIT_ID, Menus.FIRST);

        CommandManager.register(Strings.ARDUINO.MENU.EDIT.ITEM_COPY_FORUM, ARDUINO_MENU_EDIT_COPY_FORUM, editMenu_copyForum);
        CommandManager.register(Strings.ARDUINO.MENU.EDIT.ITEM_COPY_HTML + " [" + Strings.ARDUINO.EXTRAS.COMING_SOON + "]", ARDUINO_MENU_EDIT_COPY_HTML, bePatient);
        CommandManager.register(Strings.ARDUINO.MENU.EDIT.ITED_FIND_SELECTED + " [" + Strings.ARDUINO.EXTRAS.COMING_SOON + "]", ARDUINO_MENU_EDIT_FIND_SELECTED, bePatient);

        EditMenu.addMenuDivider("arduino.menu.edit.divider1");
        EditMenu.addMenuItem(ARDUINO_MENU_EDIT_COPY_FORUM);
        EditMenu.addMenuItem(ARDUINO_MENU_EDIT_COPY_HTML);
        EditMenu.addMenuItem(ARDUINO_MENU_EDIT_FIND_SELECTED);
    }

    function createFileMenu() {
        Menus.removeMenu(Menus.AppMenuBar.FILE_MENU);

        var FileMenu2 = Menus.addMenu(Strings.ARDUINO.MENU.FILE.TITLE, ARDUINO_MENU_FILE_ID, Menus.FIRST);
        //settingsFile;
        //FileUtils;
        CommandManager.register(Strings.ARDUINO.MENU.FILE.ITEM_OPEN_SAMPLES, ARDUINO_MENU_FILE_OPEN_SAMPLE_FOLDER, fileMenu_SampleFolder);
        CommandManager.register(Strings.ARDUINO.MENU.FILE.ITEM_UPLOAD, ARDUINO_MENU_FILE_UPLOAD, fileMenu_Upload);
        CommandManager.register(Strings.ARDUINO.MENU.FILE.ITEM_UPLOAD_USE_PROGR + " [" + Strings.ARDUINO.EXTRAS.COMING_SOON + "]", ARDUINO_MENU_FILE_UPLOAD_BY_PROGRAMMER, bePatient);
        CommandManager.register(Strings.ARDUINO.MENU.FILE.ITEM_PRINT_PAGE_SETTING  + " [" + Strings.ARDUINO.EXTRAS.COMING_SOON + "]", ARDUINO_MENU_FILE_PAGE_SETTINGS, bePatient);
        CommandManager.register(Strings.ARDUINO.MENU.FILE.ITEM_PRINT + " [" + Strings.ARDUINO.EXTRAS.COMING_SOON + "]", ARDUINO_MENU_FILE_PRINT, bePatient);
        CommandManager.register(Strings.ARDUINO.MENU.FILE.ITEM_PREFERENCES + " [" + Strings.ARDUINO.EXTRAS.WIP + "]", ARDUINO_MENU_FILE_SETTINGS, fileMenu_showPreferences);

        FileMenu2.addMenuItem(Commands.FILE_NEW);
        FileMenu2.addMenuItem(Commands.FILE_OPEN);
        FileMenu2.addMenuItem(ARDUINO_MENU_FILE_OPEN_SAMPLE_FOLDER);
        FileMenu2.addMenuItem(Commands.FILE_OPEN_FOLDER); //cartella esempi
        FileMenu2.addMenuItem(Commands.FILE_CLOSE);
        FileMenu2.addMenuItem(Commands.FILE_SAVE);
        FileMenu2.addMenuItem(Commands.FILE_SAVE_AS);
        FileMenu2.addMenuItem(ARDUINO_MENU_FILE_UPLOAD);
        FileMenu2.addMenuItem(ARDUINO_MENU_FILE_UPLOAD_BY_PROGRAMMER);
        FileMenu2.addMenuDivider("arduino.menu.file.divider1");
        FileMenu2.addMenuItem(ARDUINO_MENU_FILE_PAGE_SETTINGS);
        FileMenu2.addMenuItem(ARDUINO_MENU_FILE_PRINT);
        FileMenu2.addMenuDivider("arduino.menu.file.divider2")
        FileMenu2.addMenuItem(ARDUINO_MENU_FILE_SETTINGS);
        FileMenu2.addMenuDivider("arduino.menu.file.divider3")

        //TODO SHOW FILE.QUIT ONLY IF IS NOT MACOSX
        FileMenu2.addMenuItem(Commands.FILE_QUIT);
    }

    function createHelpMenu() {
        var HelpMenu = Menus.getMenu(Menus.AppMenuBar.HELP_MENU, ARDUINO_MENU_HELP_ID);

        CommandManager.register(Strings.ARDUINO.MENU.HELP.ITEM_ABOUT, ARDUINO_MENU_HELP_ABOUT, helpMenu_showAboutDialog);

        HelpMenu.addMenuDivider("arduino.menu.help.divider1");
        HelpMenu.addMenuItem(ARDUINO_MENU_HELP_ABOUT);

    }

    //TOOL
    function toolMenu_SelectBoardPanel(){
        brackets.arduino.dispatcher.trigger("arduino-event-menu-tool-boards");
    }

    function toolMenu_SelectPortPanel(){
        brackets.arduino.dispatcher.trigger("arduino-event-menu-tool-ports");
    }

    function toolMenu_SelectProgrammerPanel(){
        brackets.arduino.dispatcher.trigger("arduino-event-menu-tool-programmers");
    }

    function toolMenu_SerialMonitor(){
        brackets.arduino.dispatcher.trigger("arduino-event-menu-tool-serialmonitor");
    }

    //SKETCH
    function sketchMenu_AddFile(){

        var destPath = FileSystem.getDirectoryForPath(DocumentManager.getCurrentDocument().file._parentPath);

        FileSystem.showOpenDialog(false, false, Strings.ARDUINO.DIALOG.GENERIC.TITLE_SELECT_FILE,"","",function(a, selectedFile, b){
            if(selectedFile.length > 0) {
                //var suf = FileUtils.getBaseName(selectedFile[0]);
                var srcFile = FileSystem.getFileForPath(selectedFile[0]);
                var destFile = FileSystem.getFileForPath(destPath.fullPath + srcFile.name);

                //TODO MAKE 'SAVE CLOSE' DIALOG IF FILE ALREADY EXISTS.
                /*
                 destFile.exists(function(err, exist){
                 if(exist){
                 var dlg = Dialogs.showModalDialog(Dialogs.DIALOG_ID_SAVE_CLOSE, "Overwrite?", "The file already exists, overwrite? ");
                 dlg.done(function(res){
                 })
                 }
                 */
                brackets.fs.copyFile(srcFile.fullPath, destFile.fullPath, function(err, src, dest){
                    if (err === brackets.fs.NO_ERROR)
                        brackets.arduino.dispatcher.trigger("arduino-event-console-log", menuPrefix + srcFile.name + " successfully imported.");
                    else
                        brackets.arduino.dispatcher.trigger("arduino-event-console-error", menuPrefix + srcFile.name + " not imported, check if source file exists");
                });
            }
        });

    }

    function sketchMenu_ImportLibs(){
        sketch_importLibraryPanel         = require("text!./html/importLibrary.html");
        var sketch_importLibraryPanelHTML = Mustache.render(sketch_importLibraryPanel, Strings.ARDUINO.DIALOG.IMPORT_LIBRARIES);

        sketch_importLibraryDialog = Dialogs.showModalDialog(DefaultDialogs.DIALOG_ID_INFO, Strings.ARDUINO.DIALOG.IMPORT_LIBRARIES.TITLE, sketch_importLibraryPanelHTML);
        $("#includeLibFolderBtn").click(sketchMenu_importLibFolder);
        $("#includeLibArchiveBtn").click(sketchMenu_importLibArchive);
        sketchMenu_importLibCreateList();
    }

    function sketchMenu_VerifyCompile(){
        brackets.arduino.dispatcher.trigger("arduino-event-console-clear");
        brackets.arduino.dispatcher.trigger('arduino-event-build');
    }

    function sketchMenu_importLibFolder(){
        //var libsFolder = "C:/Users/Sebastiano/Desktop/testArduino/libs/"; //get Libs folder (platform.js ???)

        FileSystem.showOpenDialog(false, true, Strings.ARDUINO.DIALOG.GENERIC.TITLE_SELECT_FOLDER,"","",function(a, dirSelected, b) {
            //var suf = fileSelected[0].split("/")[fileSelected[0].split("/").length-1];
            if (dirSelected.length > 0) {
                var srcDir = FileSystem.getDirectoryForPath(dirSelected[0]);
                var destDir =  FileSystem.getDirectoryForPath(sketch_importLibraryUserDirectory.fullPath + srcDir.name);

                //TODO remove use of node domain
                filesystemDomain.exec("addDir", srcDir.fullPath, destDir.fullPath);
                sketch_importLibraryDialog.close();
            }
        });
    }

    function sketchMenu_importLibArchive(){
        FileSystem.showOpenDialog(false, false, Strings.ARDUINO.DIALOG.GENERIC.TITLE_SELECT_FILE,"","",function(a, fileSelected, b){

            var srcArchive = FileSystem.getFileForPath(fileSelected[0]);
            if( FileUtils.getFileExtension(srcArchive.fullPath) == "zip" )
            {
                sketch_importLibraryDialog.close();
                filesystemDomain.exec("addDirFromArchive", srcArchive.fullPath, sketch_importLibraryUserDirectory.fullPath);
            }
            else
            {
                //sketch_importLibraryDialog.close();
                Dialogs.showModalDialog(DefaultDialogs.DIALOG_ID_INFO, "Warning", "Select zip archive.");
            }
        });
    }

    function sketchMenu_importLibCreateList() {
        
        var libs_arr = [];

        //load ARDUINO LIBRARIES
        sketch_importLibraryDirectory.getContents(function(err, contents, stats){
            if(!err){
                contents.forEach(function(file, index, array){    // get the files
                    if(!file.isFile) {
                        var farr = [];
                        farr['name'] = file.name;
                        farr['type'] = 'arduino_lib';
                        libs_arr.push(farr);
                    }
                });
            }

            //load USER LIBRARIES
            sketch_importLibraryUserDirectory.getContents(function(err, contents, stats){
                if(!err){
                    contents.forEach(function(file, index, array){
                        if (!file.isFile) {
                            var farr = [];
                            farr['name'] = file.name;
                            farr['type'] = 'user_lib';
                            libs_arr.push(farr);
                        }
                    });
                }
            });
            
            if(libs_arr.length > 0){
                libs_arr.sort(function(a, b) { 
                    return a.name.localeCompare(b.name);
                });

                var libs_body = $('#libs_body').html();
                
                $.each(libs_arr, function(index, value){
                    libs_body = libs_body+"<tr><td class='cbtn'><a id='"+value['name']+"'><img class='"+value['type']+"' /></a></td><td>"+value['name']+"</td><td class='cbtn'><img id='"+value['name']+"' class='add_btn' /></td></tr>";
                });

                $('#libs_body').html(libs_body);
                $('.add_btn').click(clickButton);
            }
        });
    }

    function clickButton(evt) {
        //sketch_importLibraryDialog.close();
        //"include" lib into the user code from ARDUINO LIBRARIES
        brackets.fs.readdir(sketch_importLibraryDirectory.fullPath+"/"+evt.target.id+"/src", function(err, conts) {
            if (err === brackets.fs.NO_ERROR) {
                var currentEditor = EditorManager.getCurrentFullEditor();
                for (var i in conts) {
                    var libFile = FileSystem.getFileForPath(sketch_importLibraryDirectory.fullPath + "/" + evt.target.id + "/src/" + conts[i]);
                    if (FileUtils.getFileExtension(libFile.fullPath) == "h") {
                        currentEditor.document.replaceRange("#include <" + libFile.name + ">\n", {line: 0, ch: 0});
                    }
                }
            }
            //else
            //    return console.error(err);

        });

        //"include" lib into the user code from ARDUINO USER LIBRARIES
        brackets.fs.readdir(sketch_importLibraryUserDirectory.fullPath+"/"+evt.target.id+"/src", function(err, conts){
            if (err === brackets.fs.NO_ERROR) {
                var currentEditor = EditorManager.getCurrentFullEditor();
                for (var i in conts) {
                    var libFile = FileSystem.getFileForPath(sketch_importLibraryUserDirectory.fullPath + "/" + evt.target.id + "/src/" + conts[i]);
                    if (FileUtils.getFileExtension(libFile.fullPath) == "h") {
                        currentEditor.document.replaceRange("#include <" + libFile.name + ">\n", {line: 0, ch: 0});
                    }
                }
            }
            //else
            //    return console.error(err);
        });

    }

    //EDIT
    function editMenu_copyForum(){
        var thisEditor = EditorManager.getCurrentFullEditor();
        var selection;
        if(!thisEditor.hasSelection())
            thisEditor.selectAllNoScroll();

        selection = thisEditor.getSelectedText();
        copypasteDomain.exec("forumCopy", selection);
    };

    //FILE
    function fileMenu_showPreferences(){
        brackets.arduino.dispatcher.trigger("arduino-event-menu-tool-preferences");
    }

    function fileMenu_Upload(){
        brackets.arduino.dispatcher.trigger("arduino-event-console-clear");
        brackets.arduino.dispatcher.trigger('arduino-event-upload');
    }

    //HELP
    function helpMenu_showAboutDialog(){
        var template = require("text!./html/aboutDialog.html");

        var info = $.extend({}, brackets.arduino.revision, Strings);

        var html = Mustache.render(template, info);
        Dialogs.showModalDialog(DefaultDialogs.DIALOG_ID_INFO, Strings.ARDUINO.DIALOG.ABOUT.TITLE, html);
    }

    //ARDUINO EXAMPLES
    function setMenuActions($event,data){
        var d1 = Dialogs.showModalDialog(DefaultDialogs.DIALOG_ID_INFO, "", createObjects(data));
        var elm = document.getElementsByClassName("first");
        if(elm.length > 0)
        {
            for(var i in elm)
                document.getElementById(elm[i].id).onclick= function(evt){
                    secondLevelAction(evt, data);
                    console.log("FIRST");
                };
        }
        else
        {
            elm = document.getElementsByClassName("second");
            for(var i in elm)
                document.getElementById(elm[i].id).onclick= function(evt){
                    console.log("SECOND");
                    d1.close();
                    var filename = evt.target.value.split("/")[evt.target.value.split("/").length-1] + ".ino",
                        filePath = FileUtils.convertWindowsPathToUnixPath(evt.target.value+"/"+filename);
                    var fileObjectNative = FileUtils.convertWindowsPathToUnixPath (filePath);
                    CommandManager.execute(Commands.CMD_ADD_TO_WORKINGSET_AND_OPEN, {fullPath: filePath, paneId: "first-pane"});
                };
        }
    };

    function createObjects(list){
        var output = "";

        for(var i=0; i<list.length; i++)
        {
            var item = list[i].type.split("/")[list[i].type.split("/").length-1];
            output += "<button id='"+item+"' value='"+list[i].type+"' class='"+cc+"' >"+item+"</button><br>";
            //document.getElementById(item).onclick = function(){console.log("lino : ")};
            //document.getElementById("nodeGoto").addEventListener("click", function() {gotoNode(result.name);}, false);
        }
        cc = "first";
        return output
    };

    function fileMenu_SampleFolder(){
        //TODO: open examples inside the libraries / user libraries path.
        //NOTE this only open generic arduino example, not libraries and user libraries examples.
        //FileSystem.showOpenDialog(false, true, Strings.ARDUINO_DIALOG_SELECT_FOLDER, test  /*brackets.arduino.options.examples.fullPath*/, "" , function(a, dirSelected, b){
            ProjectManager.openProject(brackets.arduino.options.examples.fullPath)
                .done(function(){
                    brackets.arduino.dispatcher.trigger("arduino-event-console-success", menuPrefix + brackets.arduino.options.examples.fullPath + " " + Strings.ARDUINO.MESSAGE.SUCCESS_LOAD)
                })
                .fail(function(err){
                    brackets.arduino.dispatcher.trigger("arduino-event-console-err", menuPrefix + Strings.ARDUINO.MESSAGE.ERROR_LOAD + " " + err);
            });
        //});

    }

    return Menu;
});