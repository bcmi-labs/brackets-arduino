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

    var FileUtils           = brackets.getModule("file/FileUtils"),
        FileSystem          = brackets.getModule("filesystem/FileSystem"),
        WorkspaceManager    = brackets.getModule("view/WorkspaceManager"),
        Dialogs             = brackets.getModule("widgets/Dialogs"),
        DefaultDialogs      = brackets.getModule("widgets/DefaultDialogs");

    /*var optionBoardSelectMessage        = "No board selected...",
        optionProgrammerSelectMessage   = "No programmer selected...",
        optionPortSelectMessage         = "No port selected...",
     */
    var listBoardsDetectedHTML,          //= "<option disabled selected>" + optionBoardSelectMessage + "</option>",
        listProgrammersDetectedHTML,     //= "<option disabled selected>" + optionProgrammerSelectMessage + "</option>",
        listPortsDetectedHTML;           //= "<option disabled selected>" + optionPortSelectMessage + "</option>";


    var portsDialog, boardsDialog, programmersDialog;
    var optionsDirName         = null,
        optionsDir             = null,
        optionsPrefix          = "[arduino ide - options]";
    var Strings;

    /**
     * This module read all files of the core
     * boards, platform and preferences.
     * @param {String} hardwareDirectoryPath absolute path to the harwdare/arduino directory
     */
    function Options (hardwareDirectoryPath) {
        Strings = brackets.arduino.strings;
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

        listBoardsDetectedHTML          = "<option disabled selected>" + Strings.ARDUINO.DIALOG.BOARD.OPT_DEFAULT + "</option>";
        listProgrammersDetectedHTML     = "<option disabled selected>" + Strings.ARDUINO.DIALOG.PROGRAMMER.OPT_DEFAULT + "</option>";
        listPortsDetectedHTML           = "<option disabled selected>" + Strings.ARDUINO.DIALOG.PORT.OPT_DEFAULT + "</option>";

        brackets.arduino.dispatcher.on("arduino-event-menu-tool-ports", portListEvent);
        brackets.arduino.dispatcher.on("arduino-event-menu-tool-boards", boardListEvent);
        brackets.arduino.dispatcher.on("arduino-event-menu-tool-programmers", programmerListEvent);

    };


    var loadOptionsFile = function(file, callback){
        file.read(function(err, data, stat){
            callback(err, data, stat);
        });
    };

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

                            if (file.isFile && FileUtils.getFileExtension(file.fullPath) == "json") {
                                loadOptionsFile(file, function (err, data, stat){ //read the contents of each file.
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
                listPortsDetectedHTML +="<option disabled> "+Strings.ARDUINO.DIALOG.PORT.OPT_SERIAL+"</option>";
                for(var index in result)
                    listPortsDetectedHTML += '<option value="' + result[index].address + '">' + result[index].label + '</option>';

                //TODO create an HTML template for the modal
                portsDialog = Dialogs.showModalDialog(DefaultDialogs.DIALOG_ID_INFO, Strings.ARDUINO.DIALOG.PORT.TITLE, "<center>"+ Strings.ARDUINO.DIALOG.PORT.LBL_SELECT +"<select id='portSelector'>"+listPortsDetectedHTML+"</select></center><p id='btnHoldplace'></p>");

                var prevSelection = brackets.arduino.options.target.port.address || brackets.arduino.preferences.get("arduino.ide.options.target.port");

                //check if the previous selection exists in the DOM options
                if( typeof prevSelection != "undefined" && findPort(result, prevSelection).length > 0 ) {

                    $('#portSelector').val(prevSelection);
                }

                $("#portSelector").change(function(){
                    var selected = findPort(result ,$( "#portSelector option:selected").val());
                    setPort(selected[0])
                    portsDialog.close();
                });

/*
                var opt = document.createElement("button");
                opt.innerHTML = "Refresh List";
                opt.id = "refreshListBtn";
                opt.onclick = portListEvent;

                document.getElementById("btnHoldplace").appendChild(opt);
*/
                listPortsDetectedHTML = "<option disabled selected>" + Strings.ARDUINO.DIALOG.PORT.OPT_DEFAULT + "</option>";
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
            brackets.arduino.preferences.set( "arduino.ide.options.target.port", selectedPort.address);
            brackets.arduino.dispatcher.trigger( "arduino-event-port-change", selectedPort);
            brackets.arduino.dispatcher.trigger( "arduino-event-console-port", selectedPort.address);
        }
    }


    function boardListEvent($event, data){
        //result contains the board list port
        var archs = brackets.arduino.options.archs,
            boards_cnt = [];
        for(var archIdx in archs){ //loop trough the archs/platforms
            listBoardsDetectedHTML += '<option disabled># ' + archs[archIdx].info.name + '</option>';

            var boards = archs[archIdx].boards;
            boards_cnt = boards_cnt.concat(boards);

            for(var boardIdx in boards){ //TODO add archs in the option
                if(archs[archIdx].info.enabled &&  boards[boardIdx].enabled)
                    listBoardsDetectedHTML += '<option value="' + boards[boardIdx].id + '">' + boards[boardIdx].name + '</option>';
                else
                    listBoardsDetectedHTML += '<option disabled value="' + boards[boardIdx].id + '">' + boards[boardIdx].name + '</option>';
            }
        }

        //TODO create an HTML template for the modal
        boardsDialog = Dialogs.showModalDialog(DefaultDialogs.DIALOG_ID_INFO, Strings.ARDUINO.DIALOG.BOARD.TITLE, "<center>"+ Strings.ARDUINO.DIALOG.BOARD.LBL_SELECT +"<select id='boardSelector'>"+listBoardsDetectedHTML+"</select></center>");

        var prevSelection = brackets.arduino.options.target.board.id || brackets.arduino.preferences.get("arduino.ide.options.target.board");

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

        listBoardsDetectedHTML = "<option disabled selected>" + Strings.ARDUINO.DIALOG.BOARD.OPT_DEFAULT + "</option>";

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
            brackets.arduino.preferences.set( "arduino.ide.options.target.board", selectedBoard.id);
            brackets.arduino.dispatcher.trigger( "arduino-event-console-board", selectedBoard.name);
        }
    }


    function programmerListEvent($event, data){


        //result contains the board list port
        var archs = brackets.arduino.options.archs,
            programmers_cnt = [];
        for(var archIdx in archs){ //loop trough the archs/platforms
            //listProgrammersDetectedHTML += '<option disabled><b>' + archs[archIdx].info.name + '</b></option>';

            var programmers = archs[archIdx].programmers;
            programmers_cnt = programmers_cnt.concat(programmers);

            for(var progIdx in programmers){ //TODO add archs in the option
                listProgrammersDetectedHTML += '<option value="' + programmers[progIdx].protocol + '">' + programmers[progIdx].name + '</option>';
            }
        }

        //TODO create an HTML template for the modal
        programmersDialog = Dialogs.showModalDialog(DefaultDialogs.DIALOG_ID_INFO, Strings.ARDUINO.DIALOG.PROGRAMMER.TITLE, "<center>"+ Strings.ARDUINO.DIALOG.PROGRAMMER.LBL_SELECT +"<select id='programmerSelector'>"+listProgrammersDetectedHTML+"</select></center>");

        var prevSelection = brackets.arduino.options.target.programmer.protocol || brackets.arduino.preferences.get("arduino.ide.options.target.programmer");

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

        listProgrammersDetectedHTML = "<option disabled selected>" + Strings.ARDUINO.DIALOG.PROGRAMMER.OPT_DEFAULT + "</option>";

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
    function setProgrammer(selectedProgrammer) {
        if(selectedProgrammer) {
            //TODO write on the status-bar the selected board
            //$("#labelBoard")[0].textContent = selectedPort.name + " on " + selectedBoard.id;
            brackets.arduino.options.target.programmer = selectedProgrammer;
            brackets.arduino.preferences.set( "arduino.ide.options.target.programmer", selectedProgrammer.protocol);
        }
    }


    Options.prototype.setTargetBoard = function(boardId){
        setTimeout(function(){//TODO horrible!!! call this method with an async series mechanism
        var archs = brackets.arduino.options.archs;
        for(var archIdx in archs){ //loop trough the archs/platforms
            var boards = archs[archIdx].boards;
            for(var boardIdx in boards){ //TODO add archs in the option
                if(boards[boardIdx].id == boardId){
                    if(archs[archIdx].info.enabled &&  boards[boardIdx].enabled) {
                        setBoard(boards[boardIdx]);
                        return;
                    }
                }
            }
        }
        }, 1500);
    };

    Options.prototype.setTargetPort = function(portId){
        setTimeout(function() {//TODO horrible!!! call this method with an async series mechanism
            brackets.arduino.dispatcher.trigger("arduino-event-port-serial-get", function (err, result) {
                if (!err) {
                    for (var index in result) {
                        if (result[index].address == portId) {
                            setPort(result[index]);
                            return;
                        }
                    }
                }
            });
        },1500);
    };

    Options.prototype.setTargetProgrammer = function(programmerId){
        setTimeout(function() {//TODO horrible!!! call this method with an async series mechanism
            var archs = brackets.arduino.options.archs;
            for (var archIdx in archs) { //loop trough the archs/platforms
                var programmers = archs[archIdx].programmers;
                for (var progIdx in programmers) {
                    if (programmers[progIdx].protocol == programmerId) {
                        setProgrammer(programmers[progIdx]);
                        return;
                    }
                }
            }
        },1500);
    };

    return Options;
});