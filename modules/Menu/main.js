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

    var sketch_importLibraryPanel           = require("text!./html/importLibrary.html"),
        sketch_importLibraryDialog          = null,     //dialog window for import arduino libraries and select zip or folder
        sketch_importLibraryDirectory       = null,     //arduino libraries directory
        sketch_importLibraryUserDirectory   = null;   //user libraries directory


    //TODO HOW TO GET THE REAL PATH
    var examplesPath 	= "C:\\Program Files (x86)\\Arduino\\examples",
        sketchesPath 	= "C:\\Users\\Sebastiano\\Documents\\Arduino\\SKETCH";

    //Menus IDs
    var ARDUINO_MENU_FILE_ID 	= "arduino.ide.menu.file",
        ARDUINO_MENU_EDIT_ID 	= "arduino.ide.menu.edit",
        ARDUINO_MENU_TOOLS_ID 	= "arduino.ide.menu.tools",
        ARDUINO_MENU_SKETCH_ID 	= "arduino.ide.menu.sketch";

    //Tool Menu IDs
    var ARDUINO_MENU_TOOL_AUTO_FORMATTING 		    = "arduino.ide.menu.tool.auto_formatting",
        ARDUINO_MENU_TOOL_STORE_SKETCH              = "arduino.ide.menu.tool.store_sketch",
        ARDUINO_MENU_TOOL_VERIFY_CODE_AND_RELOAD    = "arduino.ide.menu.tool.verify_code_and_reload",
        ARDUINO_MENU_TOOL_SERIAL_MONITOR 		    = "arduino.ide.menu.tool.serial_monitor",
        ARDUINO_MENU_TOOL_SELECT_BOARD              = "arduino.ide.menu.tool.select_board",
        ARDUINO_MENU_TOOL_SELECT_PORT               = "arduino.ide.menu.tool.select_port",
        ARDUINO_MENU_TOOL_SELECT_PROGRAMMER         = "arduino.ide.menu.tool.select_programmer",
        ARDUINO_MENU_TOOL_WRITE_BOOTLOADER          = "arduino.ide.menu.tool.write_bootloader";

    //Sketch Menu IDs
    var ARDUINO_MENU_SKETCH_VERIFY_AND_COMPILE 		= "arduino.ide.menu.sketch.verify_and_compile",
        ARDUINO_MENU_SKETCH_ADD_FILE         		= "arduino.ide.menu.sketch.add_file",
        ARDUINO_MENU_SKETCH_IMPORT_LIBS			    = "arduino.ide.menu.sketch.import_libs",
        ARDUINO_MENU_SKETCH_OPEN_SKETCH_FOLDER 	    = "arduino.ide.menu.sketch.open_sketch_folder";

    //File Menu IDs
    var ARDUINO_MENU_FILE_OPEN_SKETCH_FOLDER 	    = "arduino.ide.menu.file.open_sketch_folder",
        ARDUINO_MENU_FILE_LOAD 						= "arduino.ide.menu.file.load",
        ARDUINO_MENU_FILE_LOAD_BY_PROGRAMMER 		= "arduino.ide.menu.file.load_by_programmer",
        ARDUINO_MENU_FILE_PAGE_SETTINGS 			= "arduino.ide.menu.file.page_settings",
        ARDUINO_MENU_FILE_PRINT 					= "arduino.ide.menu.file.print",
        ARDUINO_MENU_FILE_SETTINGS 					= "arduino.ide.menu.file.settings";

    //Edit Menu IDs
    var ARDUINO_MENU_EDIT_COPY_FORUM 			    = "arduino.ide.menu.edit.copy_forum",
        ARDUINO_MENU_EDIT_COPY_HTML 				= "arduino.ide.menu.edit.copy_html",
        ARDUINO_MENU_EDIT_FIND_SELECTED 			= "arduino.ide.menu.edit.find_selected";


    /**
     * This module set the brackets menu
     */
    function Menu () {
        //get domains
        filesystemDomain = brackets.arduino.domains[filesystemDomainName];
        copypasteDomain  = brackets.arduino.domains[copypasteDomainName];

        sketch_importLibraryDirectory       = brackets.arduino.options.librariesdir;
        //sketch_importLibraryUserDirectory   = FileSystem.getDirectoryForPath("/Users/sergio/Desktop/TEST"); //TODO this is for TEST ONLY

        //Menus.removeMenu(Menus.AppMenuBar.FIND_MENU);
        Menus.removeMenu(Menus.AppMenuBar.NAVIGATE_MENU);
        Menus.removeMenu(Menus.AppMenuBar.VIEW_MENU);
        Menus.removeMenu("debug-menu");

        createToolMenu();
        createSketchMenu();
        createEditMenu();
        createFileMenu();

        filesystemDomain.exec("getPlatform");
        filesystemDomain.on("sampleList_data", setMenuActions);
        filesystemDomain.on("platform_data", getPlatformAction);

    };


    function getPlatformAction($event, userLibrariesFolder, standard)
    {
        //var libsFolder = standard;
        sketch_importLibraryUserDirectory = userLibrariesFolder;

        //TODO get the user folder in the main file, get the lib path, sketchbook and
        ///Users/sergio/Documents/Arduino
    }

    //TODO a che serve?
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


    function bePatient(){
        //window.alert("Be patient :)");
        var dlg = Dialogs.showModalDialog(DefaultDialogs.DIALOG_ID_INFO, "Be patient", "Be patient :) <br> we are working to complete all the missing functions. <br> stay tuned! ");
    }

    //CREATE MENUS
    function createToolMenu() {
        var ToolsMenu = Menus.addMenu("Tools", ARDUINO_MENU_TOOLS_ID, Menus.FIRST);

        CommandManager.register("Auto formatting [coming soon (A)]", ARDUINO_MENU_TOOL_AUTO_FORMATTING, bePatient);
        CommandManager.register("Store sketch [coming soon]", ARDUINO_MENU_TOOL_STORE_SKETCH, bePatient);
        CommandManager.register("Verify code and reload [coming soon (A)]", ARDUINO_MENU_TOOL_VERIFY_CODE_AND_RELOAD, bePatient);
        CommandManager.register("Serial monitor", ARDUINO_MENU_TOOL_SERIAL_MONITOR, toolMenu_SerialMonitor);

        CommandManager.register("Board", ARDUINO_MENU_TOOL_SELECT_BOARD, toolMenu_SelectBoardPanel);
        CommandManager.register("Port", ARDUINO_MENU_TOOL_SELECT_PORT, toolMenu_SelectPortPanel);

        CommandManager.register("Programmer", ARDUINO_MENU_TOOL_SELECT_PROGRAMMER, toolMenu_SelectProgrammerPanel);
        CommandManager.register("Write Bootloader [coming soon]",ARDUINO_MENU_TOOL_WRITE_BOOTLOADER, bePatient);

        ToolsMenu.addMenuItem(ARDUINO_MENU_TOOL_AUTO_FORMATTING);
        ToolsMenu.addMenuItem(ARDUINO_MENU_TOOL_STORE_SKETCH);
        ToolsMenu.addMenuItem(ARDUINO_MENU_TOOL_VERIFY_CODE_AND_RELOAD);
        ToolsMenu.addMenuItem(ARDUINO_MENU_TOOL_SERIAL_MONITOR);
        ToolsMenu.addMenuDivider("arduino.menu.tools.divider1");
        ToolsMenu.addMenuItem(ARDUINO_MENU_TOOL_SELECT_BOARD);
        ToolsMenu.addMenuItem(ARDUINO_MENU_TOOL_SELECT_PORT);
        ToolsMenu.addMenuDivider("arduino.menu.tools.divider2");
        ToolsMenu.addMenuItem(ARDUINO_MENU_TOOL_SELECT_PROGRAMMER);
        ToolsMenu.addMenuItem(ARDUINO_MENU_TOOL_WRITE_BOOTLOADER);
    }

    function createSketchMenu() {
        var SketchMenu = Menus.addMenu("Sketch", ARDUINO_MENU_SKETCH_ID, Menus.FIRST);

        CommandManager.register("Verifica e Compila (TO DO)", ARDUINO_MENU_SKETCH_VERIFY_AND_COMPILE, bePatient);
        CommandManager.register("Add File", ARDUINO_MENU_SKETCH_ADD_FILE, sketchMenu_AddFile);
        CommandManager.register("Import Library (in progress)", ARDUINO_MENU_SKETCH_IMPORT_LIBS, sketchMenu_ImportLibs);
        CommandManager.register("Apri cartella sketch (TO DO)", ARDUINO_MENU_SKETCH_OPEN_SKETCH_FOLDER, bePatient);


        SketchMenu.addMenuItem(ARDUINO_MENU_SKETCH_VERIFY_AND_COMPILE);
        SketchMenu.addMenuDivider("arduino.menu.sketch.divider1");
        SketchMenu.addMenuItem(ARDUINO_MENU_SKETCH_ADD_FILE);
        SketchMenu.addMenuItem(ARDUINO_MENU_SKETCH_IMPORT_LIBS);
        SketchMenu.addMenuItem(ARDUINO_MENU_SKETCH_OPEN_SKETCH_FOLDER);
    }

    function createEditMenu(){
        //Menus.removeMenu(Menus.AppMenuBar.EDIT_MENU);

        var EditMenu = Menus.getMenu(Menus.AppMenuBar.EDIT_MENU);//Menus.addMenu("Edit", ARDUINO_MENU_EDIT_ID, Menus.FIRST);

        CommandManager.register("Copy for forum", ARDUINO_MENU_EDIT_COPY_FORUM, editMenu_copyForum);
        CommandManager.register("Copy as html [coming soon]", ARDUINO_MENU_EDIT_COPY_HTML, bePatient);
        CommandManager.register("Find selected text [coming soon]", ARDUINO_MENU_EDIT_FIND_SELECTED, bePatient);

        EditMenu.addMenuDivider("arduino.menu.edit.divider1");
        EditMenu.addMenuItem(ARDUINO_MENU_EDIT_COPY_FORUM);
        EditMenu.addMenuItem(ARDUINO_MENU_EDIT_COPY_HTML);
        EditMenu.addMenuItem(ARDUINO_MENU_EDIT_FIND_SELECTED);

        /*
                EditMenu.addMenuItem(Commands.EDIT_UNDO);
                EditMenu.addMenuItem(Commands.EDIT_REDO);
                EditMenu.addMenuDivider("arduino.menu.edit.divider1");
                EditMenu.addMenuItem(Commands.EDIT_CUT);
                EditMenu.addMenuItem(Commands.EDIT_COPY);
                EditMenu.addMenuItem(ARDUINO_MENU_EDIT_COPY_FORUM);
                EditMenu.addMenuItem(ARDUINO_MENU_EDIT_COPY_HTML);
                EditMenu.addMenuItem(Commands.EDIT_PASTE);
                EditMenu.addMenuItem(Commands.EDIT_SELECT_ALL);
                EditMenu.addMenuDivider("arduino.menu.edit.divider2");
                EditMenu.addMenuItem(Commands.EDIT_LINE_COMMENT);
                EditMenu.addMenuItem(Commands.EDIT_INDENT);
                EditMenu.addMenuItem(Commands.EDIT_UNINDENT);
                EditMenu.addMenuItem(Commands.CMD_FIND);
                EditMenu.addMenuItem(Commands.CMD_FIND_NEXT);
                EditMenu.addMenuItem(Commands.CMD_FIND_PREVIOUS);
                EditMenu.addMenuItem(ARDUINO_MENU_EDIT_FIND_SELECTED);
         */
    }

    function createFileMenu() {
        Menus.removeMenu(Menus.AppMenuBar.FILE_MENU);

         var FileMenu2 = Menus.addMenu("File", ARDUINO_MENU_FILE_ID, Menus.FIRST);
         //settingsFile;
         //FileUtils;
         CommandManager.register("Open samples", ARDUINO_MENU_FILE_OPEN_SKETCH_FOLDER, SamplesFunction);
         CommandManager.register("Load [coming soon (A)]", ARDUINO_MENU_FILE_LOAD, bePatient);
         CommandManager.register("Load by programmer [coming soon]", ARDUINO_MENU_FILE_LOAD_BY_PROGRAMMER, bePatient);
         CommandManager.register("Page Settings [In the future]", ARDUINO_MENU_FILE_PAGE_SETTINGS, bePatient);
         CommandManager.register("Print [In the future]", ARDUINO_MENU_FILE_PRINT, bePatient);
         CommandManager.register("Preferences", ARDUINO_MENU_FILE_SETTINGS, fileMenu_showPreferences);

         FileMenu2.addMenuItem(Commands.FILE_NEW);
         FileMenu2.addMenuItem(Commands.FILE_OPEN);
         FileMenu2.addMenuItem(ARDUINO_MENU_FILE_OPEN_SKETCH_FOLDER);
         FileMenu2.addMenuItem(Commands.FILE_OPEN_FOLDER); //cartella esempi
         FileMenu2.addMenuItem(Commands.FILE_CLOSE);
         FileMenu2.addMenuItem(Commands.FILE_SAVE);
         FileMenu2.addMenuItem(Commands.FILE_SAVE_AS);
         FileMenu2.addMenuItem(ARDUINO_MENU_FILE_LOAD);
         FileMenu2.addMenuItem(ARDUINO_MENU_FILE_LOAD_BY_PROGRAMMER);
         FileMenu2.addMenuDivider("arduino.menu.file.divider1");
         FileMenu2.addMenuItem(ARDUINO_MENU_FILE_PAGE_SETTINGS);
         FileMenu2.addMenuItem(ARDUINO_MENU_FILE_PRINT);
         FileMenu2.addMenuDivider("arduino.menu.file.divider2")
         FileMenu2.addMenuItem(ARDUINO_MENU_FILE_SETTINGS);
         FileMenu2.addMenuDivider("arduino.menu.file.divider3")

         //TODO SHOW FILE.QUIT ONLY IF IS NOT MACOSX
         FileMenu2.addMenuItem(Commands.FILE_QUIT);
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

        FileSystem.showOpenDialog(false, false, "Select file:","","",function(a, selectedFile, b){
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
        sketch_importLibraryDialog = Dialogs.showModalDialog(DefaultDialogs.DIALOG_ID_INFO, "Import libraries", sketch_importLibraryPanel);
        $("#includeLibFolderBtn").click(sketchMenu_importLibFolder);
        $("#includeLibArchiveBtn").click(sketchMenu_importLibArchive);
        sketchMenu_importLibCreateList();
    }

    //TODO INCOMPLETE
    function sketchMenu_importLibFolder(){
        //var libsFolder = "C:/Users/Sebastiano/Desktop/testArduino/libs/"; //get Libs folder (platform.js ???)

        FileSystem.showOpenDialog(false, true, "Select folder :","","",function(a, dirSelected, b) {
            sketch_importLibraryDialog.close();

            //var suf = fileSelected[0].split("/")[fileSelected[0].split("/").length-1];
            if (dirSelected.length > 0) {
                var srcDir = FileSystem.getDirectoryForPath(dirSelected[0]);
                var destDir =  FileSystem.getDirectoryForPath(sketch_importLibraryUserDirectory.fullPath + srcDir.name);

                //TODO remove use of node domain
                //NOTE: NON FUNZIONA QUESTA CHIAMATA VEDERE CON SEBBA
                filesystemDomain.exec("addDir", srcDir.fullPath, destDir.fullPath);
            }
        });
    }
    //TODO INCOMPLETE domain call does not work
    function sketchMenu_importLibArchive(){
        FileSystem.showOpenDialog(false, false, "Select zip archive :","","",function(a, fileSelected, b){

            var srcArchive = FileSystem.getFileForPath(fileSelected[0]);
            if( FileUtils.getFileExtension(srcArchive.fullPath) == "zip" )
            {
                sketch_importLibraryDialog.close();
                //NOTE: NON FUNZIONA QUESTA CHIAMATA VEDERE CON SEBBA
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
        var element;
        //load ARDUINO LIBRARIES
        brackets.fs.readdir(sketch_importLibraryDirectory.fullPath, function(err, contents){
            if (err === brackets.fs.NO_ERROR) {

                for (var item in contents) {
                    element = document.createElement("button");

                    element.type = "button";
                    element.id = contents[item];
                    element.textContent = contents[item];
                    element.onclick = clickButton;

                    document.getElementById("listDiv").appendChild(element);
                    document.getElementById("listDiv").appendChild(document.createElement("br"));
                }
            }
            //else
            //    return console.error(err);
        });

        //load ARDUINO LIBRARIES
        brackets.fs.readdir(sketch_importLibraryUserDirectory.fullPath, function(err, contents){
            if (err === brackets.fs.NO_ERROR) {
                document.getElementById("listDiv").appendChild(document.createElement("hr"));

                for (var item in contents) {
                    element = document.createElement("button");

                    element.type = "button";
                    element.id = contents[item];
                    element.textContent = contents[item];
                    element.onclick = clickButton;

                    document.getElementById("listDiv").appendChild(element);
                    document.getElementById("listDiv").appendChild(document.createElement("br"));
                }
            }
            //else
            //    return console.error(err);

        });
    }

    function clickButton(evt) {
        sketch_importLibraryDialog.close();
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
    //TODO NON MI FUNZIONA
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

    //TODO che fa?
    function SamplesFunction()
    {
        /*FileSystem.showOpenDialog(false,false,"Samples",examplesPath,[".ino"], function(d1,data,d2){
         var a1 = 0;
         var a3 = 4;
         CommandManager.execute(Commands.CMD_ADD_TO_WORKINGSET_AND_OPEN, {fullPath: data[0], paneId: "first-pane"});
         });	*/

        var PATH1 = FileUtils.getNativeBracketsDirectoryPath(),
            PATH = "C:\\Program Files (x86)\\Arduino\\examples";
        var SAMPLE_PATH = PATH1.replace("dev/src","Compiler/node/examples");
        PATH = module.uri.replace("SetMenus/main.js","Compiler/node/examples");
        fsI.exec("readSampleDir", PATH);
    }

    return Menu;
});