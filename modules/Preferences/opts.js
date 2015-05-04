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

    var FileUtils           = brackets.getModule("file/FileUtils"),
        FileSystem          = brackets.getModule("filesystem/FileSystem"),
        WorkspaceManager    = brackets.getModule("view/WorkspaceManager"),
        Dialogs             = brackets.getModule("widgets/Dialogs"),
        DefaultDialogs = brackets.getModule("widgets/DefaultDialogs");

    var optionsDirName         = null,
        optionsDir             = null,
        optionsPrefix          = "[arduino ide - options]";

    var optionBoardSelectMessage = "Select your board...",
        optionProgrammerSelectMessage = "Select your programmer...",
        optionPortSelectMessage = "Select your port...",
        listBoardsDetectedHTML = "<option disabled selected>" + optionBoardSelectMessage + "</option>",
        listProgrammersDetectedHTML = "<option disabled selected>" + optionProgrammerSelectMessage + "</option>",
        listPortsDetectedHTML = "<option disabled selected>" + optionPortSelectMessage + "</option>";

    var portsDialog, boardsDialog, programmersDialog;

    /**
     * This module read all files of the core
     * boards, platform and preferences.
     * @param {String} hardwareDirectoryPath absolute path to the harwdare/arduino directory
     */
    function Options (hardwareDirectoryPath) {
        brackets.arduino.options.archs  = {};
        optionsDirName = hardwareDirectoryPath;

        //get the arch/platforms directory name
        optionsDir = FileSystem.getDirectoryForPath( optionsDirName );
        optionsDir.getContents(function(err, contents, stats){              //get the directories of the arch/platform under harwdare/arduino
            if(err)
                console.error(optionsPrefix + " Error in loading options files: " + err);
            else
                contents.forEach(function (element, index, array) {         //element is the directory of the arch/platform
                    //element is a 'Diretory' object
                    if (element.isDirectory) {

                        brackets.arduino.options.archs[element.name] = {};
                        brackets.arduino.options.archs[element.name].boards = [];
                        brackets.arduino.options.archs[element.name].programmers = [];

                        loadOptionsInfo(element.fullPath, function(err, result){
                            if(err)
                                console.error(optionsPrefix + " - " + err);
                            else
                                brackets.arduino.options.archs[element.name].info = result;
                        });

                        loadOptions(element.fullPath, "boards", function(err, result){
                            if(err)
                                console.error(optionsPrefix + " - " + err);
                            else
                                brackets.arduino.options.archs[element.name].boards.push(result);
                        });

                        loadOptions(element.fullPath, "programmers", function(err, result){
                            if(err)
                                console.error(optionsPrefix + " - " + err);
                            else
                                brackets.arduino.options.archs[element.name].programmers.push(result);
                        });
                    }
            });
        });


        brackets.arduino.dispatcher.on("arduino-event-menu-tool-ports", portListEvent);
        brackets.arduino.dispatcher.on("arduino-event-menu-tool-boards", boardListEvent);
        brackets.arduino.dispatcher.on("arduino-event-menu-tool-programmers", programmerListEvent);



    };


    var loadOptionsFile = function(file, callback){
        file.read(function(err, data, stat){
            callback(err, data, stat);
        });
    }

    /**
     *
     * @param path is the absolute path to the arch/platform directory
     * @param info is the options to load ( boards, platform or programmers)
     * @param callback
     */
    var loadOptions = function(path, info ,callback) {

        if (info == "boards" || info == "platform" || info == "programmers") {
            var boardDir = FileSystem.getDirectoryForPath(path + "/opt/" + info);   //get the data dir that contains the boards, platform and programmers info
            if (boardDir) {
                boardDir.getContents(function(err, contents, stats) {
                    if(err)
                        callback(err);
                    else
                        contents.forEach( function (file, index, array) {    // get the files

                            if (file.isFile) {
                                loadOptionsFile(file, function (err, data, stat){  //read the contents of each file.
                                    if(!err){
                                        callback(null, JSON.parse(data));
                                    }
                                    else{
                                        callback(err);
                                    }
                                });
                            }
                        });
                });
            }
            else {
                callback(err);
            }
        }
    }
    /**
     *
     * @param path is the absolute path to the arch/platform directory
     * @param callback
     */
    var loadOptionsInfo = function(path, callback) {
        var infoFile = FileSystem.getFileForPath(path + "/opt/info.json");
        loadOptionsFile(infoFile, function(err, data, stat){
            if(!err){
                callback(null, JSON.parse(data));
            }
            else{
                callback(err);
            }
        });
    }


    function portListEvent($event, data){
        brackets.arduino.dispatcher.trigger("arduino-event-port-serial-get", function(err, result){
            if(!err){
                //result contains the list port

                for(var index in result)
                    listPortsDetectedHTML += '<option value="' + result[index].address + '">' + result[index].label + '</option>';

                //TODO create an HTML template for the modal
                portsDialog = Dialogs.showModalDialog(DefaultDialogs.DIALOG_ID_INFO, "Port Select", "<select id='portSelector'>"+listPortsDetectedHTML+"</select><p id='btnHoldplace'></p>");

                var prevSelection = brackets.arduino.options.target.port.address || brackets.arduino.preferences.get("arduino.ide.selected.port");

                //check if the previous selection exists in the DOM options
                if( typeof prevSelection != "undefined" && findPort(result, prevSelection).length > 0 ) {

                    $('#portSelector').val(prevSelection);
                }

                $("#portSelector").change(function(){
                    var selected = findPort(result ,$( "#portSelector option:selected").val());
                    setPort(selected[0])
                    portsDialog.close();
                });

//                var opt = document.createElement("button");
//                opt.innerHTML = "Refresh List";
//                opt.id = "refreshListBtn";
//                opt.onclick = pbDetector;

//                document.getElementById("btnHoldplace").appendChild(opt);

                listPortsDetectedHTML = "<option disabled selected>" + optionPortSelectMessage + "</option>";
            }
            else{
                //TODO error to the arduino console.
                console.error(optionsPrefix + " " + err);
            }


        });
    }

    /**
     * find the port object by the address (COM1, /dev/tty.... )
     * @param list the list of ports objects
     * @param portAddress the port address (COM1, /dev/tty.... )
     * @returns the object port
     */
    function findPort(list, portAddress){
        var result = $.grep(list, function (element){
            return element.address === portAddress;
        });
        return result
    }

    /**
     * set the port by the user selection, and save the port (address) in the preferences file and in the target object.
     * @param selectedPort
     */
    function setPort(selectedPort) {
        if(selectedPort) {
            //TODO write on the status-bar the selected port
            //$("#labelBoard")[0].textContent = selectedPort.name + " on " + selectedPort.address;
            brackets.arduino.options.target.port = selectedPort;
            brackets.arduino.preferences.set( "arduino.ide.selected.port", selectedPort.address);
        }
    }


    function boardListEvent($event, data){
        //result contains the board list port
        var archs = brackets.arduino.options.archs,
            boards_cnt = [];
        for(var archIdx in archs){ //loop trough the archs/platforms
            listBoardsDetectedHTML += '<option disabled><b>' + archs[archIdx].info.name + '</b></option>';

            var boards = archs[archIdx].boards;
            boards_cnt = boards_cnt.concat(boards);

            for(var boardIdx in boards){ //TODO add archs in the option
                listBoardsDetectedHTML += '<option value="' + boards[boardIdx].id + '">' + boards[boardIdx].name + '</option>';
            }
        }

        //TODO create an HTML template for the modal
        boardsDialog = Dialogs.showModalDialog(DefaultDialogs.DIALOG_ID_INFO, "Board Select", "<select id='boardSelector'>"+listBoardsDetectedHTML+"</select>");

        var prevSelection = brackets.arduino.options.target.board.id || brackets.arduino.preferences.get("arduino.ide.selected.board");

        //check if the previous selection exists in the DOM options
        if( typeof prevSelection != "undefined")
            $('#boardSelector').val(prevSelection);

        $("#boardSelector").change(function(){
            var selected = findBoard(boards_cnt, $("#boardSelector option:selected").val());
            setBoard(selected[0])
            boardsDialog.close();
        });

//                var opt = document.createElement("button");
//                opt.innerHTML = "Refresh List";
//                opt.id = "refreshListBtn";
//                opt.onclick = pbDetector;

//                document.getElementById("btnHoldplace").appendChild(opt);

        listBoardsDetectedHTML = "<option disabled selected>" + optionBoardSelectMessage + "</option>";

    }

    /**
     * find the board object by the id (atmega8, atmega168... )
     * @param list the list of board objects
     * @param boardId the board id (atmega8, atmega168... )
     * @returns the object board
     */
    function findBoard(list, boardId){
        var result = $.grep(list, function (element){
            return element.id === boardId;
        });
        return result
    }

    /**
     * set the board by the user selection, and save it in the target object.
     * @param selectedBoard
     */
    function setBoard(selectedBoard){
        if(selectedBoard) {
            //TODO write on the status-bar the selected board
            //$("#labelBoard")[0].textContent = selectedPort.name + " on " + selectedBoard.id;
            brackets.arduino.options.target.board = selectedBoard;
            brackets.arduino.preferences.set( "arduino.ide.selected.board", selectedBoard.id);
        }
    }


    function programmerListEvent($event, data){


        //result contains the board list port
        var archs = brackets.arduino.options.archs,
            programmers_cnt = [];
        for(var archIdx in archs){ //loop trough the archs/platforms
            //listProgrammersDetectedHTML += '<option disabled><b>' + archs[archIdx].info.name + '</b></option>';

            var programmers = archs[archIdx].programmers,
            programmers_cnt = programmers_cnt.concat(programmers);

            for(var progIdx in programmers){ //TODO add archs in the option
                listProgrammersDetectedHTML += '<option value="' + programmers[progIdx].protocol + '">' + programmers[progIdx].name + '</option>';
            }
        }

        //TODO create an HTML template for the modal
        programmersDialog = Dialogs.showModalDialog(DefaultDialogs.DIALOG_ID_INFO, "Board Select", "<select id='programmerSelector'>"+listProgrammersDetectedHTML+"</select>");

        var prevSelection = brackets.arduino.options.target.programmer.protocol || brackets.arduino.preferences.get("arduino.ide.selected.programmer");

        //check if the previous selection exists in the DOM options
        if( typeof prevSelection != "undefined")
            $('#programmerSelector').val(prevSelection);

        $("#programmerSelector").change(function(){
            var selected = findProgrammer(programmers_cnt, $("#programmerSelector option:selected").val());
            setProgrammer(selected[0])
            programmersDialog.close();
        });

//                var opt = document.createElement("button");
//                opt.innerHTML = "Refresh List";
//                opt.id = "refreshListBtn";
//                opt.onclick = pbDetector;

//                document.getElementById("btnHoldplace").appendChild(opt);

        listProgrammersDetectedHTML = "<option disabled selected>" + optionProgrammerSelectMessage + "</option>";

    }

    /**
     * find the programmer object by the protocol (stk500v1, stk500v2 ...)
     * @param list the list of ports objects
     * @param progProtocol the programmer protocol (stk500v1, stk500v2 ...)
     * @returns the object programmer
     */
    function findProgrammer(list, progProtocol){
        var result = $.grep(list, function (element){
            return element.protocol === progProtocol;
        });
        return result
    }

    /**
     * set the programmer by the user selection, and save it in the target object.
     * @param selectedProgrammer
     */
    function setProgrammer(selectedProgrammer)
    {
        if(selectedProgrammer) {
            //TODO write on the status-bar the selected board
            //$("#labelBoard")[0].textContent = selectedPort.name + " on " + selectedBoard.id;
            brackets.arduino.options.target.programmer = selectedProgrammer;
            brackets.arduino.preferences.set( "arduino.ide.selected.programmer", selectedProgrammer.protocol);
        }
    }
    return Options;
});