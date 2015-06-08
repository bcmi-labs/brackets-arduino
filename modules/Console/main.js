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
 * Copyright 2015 Arduino Srl (http://www.arduino.org/) support@arduino.org
 *
 * authors: arduino.org team
 *
 */

/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4,
 maxerr: 50, browser: true */
/*global $, define, brackets */

define(function(require, exports, module){
	"use strict";

	var	AppInit = brackets.getModule("utils/AppInit"),
		WorkspaceManager = brackets.getModule("view/WorkspaceManager"),
		ExtensionUtils = brackets.getModule("utils/ExtensionUtils"),
		StatusBar = brackets.getModule("widgets/StatusBar");

	var panelHTML = require("text!./html/Console.html"),
		panel,
		bTag = $('<div style="font-weight: bold"></div>'),
		pTag = $('<div style="font-weight: bold"></div>');

	var Strings;

	bTag.click(function(){
		brackets.arduino.dispatcher.trigger("arduino-event-menu-tool-boards","");
	});

	pTag.click(function(){
		brackets.arduino.dispatcher.trigger("arduino-event-menu-tool-ports","");
	});

		var writeLog 	= function($event, data){
							if(data){
								var logtype = $event.type;
							 	switch(logtype){
							 		case 'arduino-event-console-log':
							 				$('#logger').html($('#logger').html()+"["+new Date().toLocaleString()+"] - <span style='color: black;'>"+data+"</span><br />");
							 				break;
							 		case 'arduino-event-console-error':
							 				$('#logger').html($('#logger').html()+"["+new Date().toLocaleString()+"] - <span style='color: red;'>"+data+"</span><br />");
							 				break;
							 		case 'arduino-event-console-success':
							 				$('#logger').html($('#logger').html()+"["+new Date().toLocaleString()+"] - <span style='color: green;'>"+data+"</span><br />");
							 				break;
							 		default:
							 				break;
							 	}
							 	$('#logger').scrollTop($('#logger')[0].scrollHeight);
							}
		},
		clearLog	=	function($event){
							$('#logger').empty();
		},
		setBoard	=	function($event, data){
							if(data)
								document.getElementById("bTag").innerText = data;
		},
		setPort		=	function($event, data){
							if(data)
								document.getElementById("pTag").innerText = data;
		},
		showConsole = function($event){
							brackets.arduino.dispatcher.trigger("arduino-event-serialmonitor-hide");
							if(!panel.isVisible){
								panel.show();
								$('#toolbar-console-btn').addClass('consolehover');
							}
		},
		hideConsole = function($event){
							if(panel.isVisible){
								panel.hide();
								$('#toolbar-console-btn').removeClass('consolehover');
							}
		},
		showHideConsole = function($event){
							if(panel.isVisible()){
								panel.hide();
								$('#toolbar-console-btn').removeClass('consolehover');
							}
							else{
								brackets.arduino.dispatcher.trigger("arduino-event-serialmonitor-hide");
								panel.show();
								$('#toolbar-console-btn').addClass('consolehover');
							}
		};


	function Console()
	{
		Strings = brackets.arduino.strings;

		bTag.html(Strings.ARDUINO.STATUS_BAR.DEF_LBL_BOARD);
		pTag.html(Strings.ARDUINO.STATUS_BAR.DEF_LBL_PORT);

		brackets.arduino.dispatcher.on("arduino-event-console-log", writeLog);
		brackets.arduino.dispatcher.on("arduino-event-console-error", writeLog);
		brackets.arduino.dispatcher.on("arduino-event-console-success", writeLog);

		brackets.arduino.dispatcher.on("arduino-event-console-board", setBoard);
		brackets.arduino.dispatcher.on("arduino-event-console-port", setPort);

		brackets.arduino.dispatcher.on("arduino-event-console-clear", clearLog);

		brackets.arduino.dispatcher.on("arduino-event-console-show", showConsole);
		brackets.arduino.dispatcher.on("arduino-event-console-hide", hideConsole);
		brackets.arduino.dispatcher.on("arduino-event-console", showHideConsole);

		if(brackets.arduino.preferences.get("arduino.ide.preferences.consoleshow")){
			panel.show();
			$('#toolbar-console-btn').addClass('consolehover');
		}
	}

	AppInit.htmlReady(function () {
        
        ExtensionUtils.loadStyleSheet(module, "css/Console.css");

		StatusBar.addIndicator("pTag", pTag, true, "", "");
		StatusBar.addIndicator("bTag", bTag, true, "", "");

		panel = WorkspaceManager.createBottomPanel("console.panel", $(panelHTML));
		hideConsole();

	});

	return Console;

});