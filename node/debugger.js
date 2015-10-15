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

(function () {
	"use strict";

	var child_process   = require('child_process'),
		timer			= require('timers'),
		os              = require('os'),
		path			= require('path');

	var domainName = "org-arduino-ide-domain-debug",
		dManager;

	var openOcdProcess,
		gdbProcess;

	var rootDir = __dirname.substring(0, __dirname.lastIndexOf(path.sep)),
		interval = 0;

	var message_flag = '';
	var tmp_obj_values = [];

	function getTmpFolder()
	{
		return os.tmpdir();
	}

	function getOpenOcd()
	{
		return rootDir+((process.platform =='win32')? '\\hardware\\tools\\OpenOCD-0.9.0-arduino\\bin\\openocd' : '/hardware/tools/OpenOCD-0.9.0-arduino/bin/openocd')
	}

	function getScriptDir()
	{
		return rootDir+((process.platform =='win32')? '\\hardware\\tools\\OpenOCD-0.9.0-arduino\\share\\openocd\\scripts' : '/hardware/tools/OpenOCD-0.9.0-arduino/share/openocd/scripts')
	}

	function getScript()
	{
		return rootDir+((process.platform =='win32')? '\\hardware\\arduino\\samd\\variants\\arduino_zero\\openocd_scripts\\arduino_zero.cfg' : '/hardware/arduino/samd/variants/arduino_zero/openocd_scripts/arduino_zero.cfg')
	}

	function getGdb()
	{
		return rootDir+((process.platform =='win32')? '\\hardware\\tools\\samd\\bin\\arm-none-eabi-gdb' : '/hardware/tools/samd/bin/arm-none-eabi-gdb')
	}

	function stopAll()
	{
		if(!openOcdProcess.killed)
		{
			if(process.platform == 'win32')
				process.kill(openOcdProcess.pid, 'SIGKILL');
			else
				process.kill(-openOcdProcess.pid)
		}
		if(!gdbProcess.killed)
			process.kill(gdbProcess.pid, 'SIGKILL');

	}

	function launchOpenOcd()
	{
		var OpenOcdCmd = [getOpenOcd(), "-s", getScriptDir(), "-f", getScript()];
		openOcdProcess = child_process.spawn(OpenOcdCmd[0], OpenOcdCmd.slice(1), {detached: true});
		message_flag = "run_ocd";

		openOcdProcess.on('close', function(code, signal){
			console.log("OPENOCD PROCESS KILLED");
			dManager.emitEvent(domainName, "close_flag", "1")
		});

		return openOcdProcess.pid;
	}

	function launchGdb(elfFile, sketchFolder)
	{
		var gdbCmd = [getGdb(), "-d", "'" + sketchFolder + "'"]
		gdbProcess = child_process.exec(gdbCmd[0], gdbCmd.slice(1));
		message_flag = "run_gdb";

		gdbProcess.stdout.on("data", function(data){
			parseMessage(message_flag, data);
			dManager.emitEvent(domainName, "debug_data", data.toString());
		});

		gdbProcess.stderr.on("data", function(data){
			dManager.emitEvent(domainName, "debug_err", data.toString());
		});

		gdbProcess.on('close', function(code, signal){
			console.log("GDB PROCESS KILLED");
			dManager.emitEvent(domainName, "close_flag", "1")
		});

		if(gdbProcess.pid)
			timer.setTimeout(function(){
				locateElfFile(elfFile)
				timer.setTimeout(function(){
					locateLiveProgram()
				}, interval);
			}, interval);
	}

	function locateElfFile(filepath)
	{
		console.log("--|| Locate elf file ||--")
		gdbProcess.stdin.write("file " + filepath + " \n")
		message_flag = "elf"
		console.log("file " + filepath + " \n")
	}

	function locateLiveProgram()
	{
		console.log("--|| Locate live program ||--")
		gdbProcess.stdin.write("target remote localhost:3333"+" \n")
		message_flag = "live"
		console.log("target remote localhost:3333"+" \n")
		//dManager.emitEvent(domainName, "debug_data", "target remote localhost:3333"+" \n");
	}

	function stopExecution()
	{
		console.log("--|| Stop sketch ||--")
		gdbProcess.stdin.write(" monitor reset halt"+" \n")
		message_flag = 'stop';
		dManager.emitEvent(domainName, "debug_data", "Halt")
	}

	function restartExecution()
	{
		console.log("--|| Restart sketch ||--")
		gdbProcess.stdin.write(" monitor reset run"+" \n")
		message_flag = 'restart';
		dManager.emitEvent(domainName, "debug_data", "Resume")
	}

	function stepNextBp()
	{
		console.log("--|| Continue sketch execution ||--")
		gdbProcess.stdin.write(" continue" + " \n")
		message_flag = 'next_bp';
		//dManager.emitEvent(domainName, "debug_data", "continue")
	}

	function stepNextLine()
	{
		console.log("--|| Step Next Line ||--")
		gdbProcess.stdin.write(" next" + " \n")
		message_flag = 'next_line';
		//dManager.emitEvent(domainName, "debug_data", "next")
	}

	function showBreakpoints()
	{
		console.log("--|| Show a list of breakpoints ||--")
		gdbProcess.stdin.write(" info breakpoints " + " \n")
		message_flag = 'show_bp';
		//dManager.emitEvent(domainName, "debug_data", "info breakpoints")
	}

	function setBreakpoint(filename, line)
	{
		console.log("--|| Set breakpoint at " + line + " ||--")
		gdbProcess.stdin.write(" break " + filename +  ":" + line + " \n")
		message_flag = 'set_bp';
		//dManager.emitEvent(domainName, "debug_data", "b " + line)
	}

	function showVariables()
	{
		console.log("--|| Show variables ||--")
		gdbProcess.stdin.write(" info locals" + " \n")
		message_flag = 'show_var'
		//dManager.emitEvent(domainName, "debug_data", "print " + variable)
	}

	function saveBreakpoints(bpList, filename)
	{
		console.log("--|| Save breakpoint on file ||--")
		//gdbProcess.stdin.write("save breakpoints" + filename +" \n")
		//or
		fs.writeFile(filename, bpList, function(err){
			if(err)
				dManager.emitEvent(domainName, "debug_err", "Error in breakpoint file saving...");
			else
				dManager.emitEvent(domainName, "debug_data", "Breakpoint file saved");

		})
	}

	function deleteBreakpoint(filename, line)
	{
		console.log("--|| Delete breakpoint at " + line + " ||--")
		message_flag = 'del_bp';
		gdbProcess.stdin.write("clear " + filename +  ":" + line + " \n")
	}

	function parseMessage(type, message)
	{
		var obj = {"type":type, "message":""};
		message = message.replace("(gdb)","");
		switch(type) {
			case 'stop':

			case 'restart':

			case 'del_bp':
				obj.message = {
					"bpNumber": message.match(/(\d+)/g)[0],
					"Raw": message.replace(/\r?\n|\r/g, "")
				}
				break;

			case 'set_bp':
				//TODO : valid message ?
				obj.message = {
					'BreakpointNumber': message.match(/(\d+)/g)[0],
					'MemoryLocation': message.match(/(0x(\w+))/g)[0],
					'File': message.match("file (.*), ")[1],
					'Line': message.match("line (.*).")[1],
					'Raw': message.replace(/\r?\n|\r/g, "")
				}
				break;


			//TODO Handle exceptions
			case 'next_bp':
				if (message.indexOf('Breakpoint') > -1){

					var mexSplit = message.split("\n");
					if (mexSplit[0].trim() == "")
						mexSplit.shift();
					if (mexSplit[mexSplit.length - 1].trim() == "")
						mexSplit.pop();

					obj.message = {
						'BreakpointNumber': message.match(/(\d+)/)[0],
						'FunctionName': message.match(/(\d,)(.*)/)[2],
						'File': message.match(/(at)(.*)([:]+\d+)/)[2],
						'LineNumber': message.match(/(:\d+)/)[0].replace(":", ""),
						//'Code': message.match(/([:]\d+)(.*)/)[2],
						'Code': mexSplit[mexSplit.length - 1],
						'Raw': message
					}
				}
				break;






			// Ok 95%
			case 'show_bp':
				if(message.indexOf('No breakpoints') > -1 )
					obj.message = { "Raw" : message.replace(/\r?\n|\r/g, " ") }
				else
				{
					var mex = message.replace("Num     Type           Disp Enb Address    What" , "").replace("\n"," ").replace(/\r?\n|\r/g, " ").replace(/\s\s+/g, " ");
					var mexArray = mex.split(" ");
					mexArray.shift();
					mexArray.pop();

					obj.breakpoints = [];
					for(var i = 0; i+8 < mexArray.length ; ) {
						obj.breakpoints.push({
							"Num": mexArray[i],
							"Type": mexArray[i + 1],
							"Disp": mexArray[i + 2],
							"Enb": mexArray[i + 3],
							"Address": mexArray[i + 4],
							"What": mexArray[i + 6],
							"File": mexArray[i + 8].substring(0, mexArray[i+8].lastIndexOf(":")),
							"Row": mexArray[i + 8].substring( mexArray[i+8].lastIndexOf(":"))
						})
						i+=9;
					};
					console.log( obj.breakpoints );
				}
				break;

			// Ok
			case 'show_var':
				if(message.indexOf('No locals') > -1 )
					obj.message = { "Raw" : message.replace(/\r?\n|\r/g, " ") }
				else
				{
					/*if(obj.variables == undefined)
						obj.variables = [];

					var mexArray1 = message.split(/\r?\n|\r/);
					mexArray1.forEach( function(item, index, array){
						if(item != "" && item != " ")
							obj.variables.push(item)
					})
					if(message.substring(message.length-2) == "\n ")
						obj.variables = [];
					console.log(obj.variables)*/

					var mexArray = message.split(/\r?\n|\r/);
					mexArray.forEach( function(item, index, array){
						if(item != "" && item != " ")
							tmp_obj_values.push(item)
					})

					if(message.substring(message.length-2) == "\n ")
					{
						obj.variables = tmp_obj_values;
						tmp_obj_values = [];
					}

				}
				break;

			// Ok
			 case 'next_line':
				 var valid = false;
				 if(message.match(/^([0-9a-z]+)$/i) > -1 )
				 	valid = true;
				 var mex = message.replace("\n",""),
					 mexArray = mex.split("\t");


				 obj.message = {
					 'Valid' : valid,
					 'LineNumber' : (valid)?  mexArray[0]: "",
					 'Code' : (valid)? (mexArray.shift(), mexArray.join()) : ""
				 }
				 break;


			default :
				break;
		}
		//message_flag = '';
		//return obj;
	}

	function init(domainManager){
		if(!domainManager.hasDomain( domainName )){
			domainManager.registerDomain( domainName, {major: 0, minor: 1});
		}
		dManager = domainManager;


//------------     COMMANDS     ------------
		//<editor-fold desc="launchOpenOcd">
		dManager.registerCommand(
			domainName,
			"launchOpenOcd",
			launchOpenOcd,
			false,
			"Start Open Ocd",
			[],
			[{	name:"OpenOcdPID",
				type:"string",
				description:"OpenOcd Process ID"
			}]
		);
		//</editor-fold>

		//<editor-fold desc="stopAll">
		dManager.registerCommand(
			domainName,
			"stopAll",
			stopAll,
			false,
			"Stop Debug"
		);
		//</editor-fold>

		//<editor-fold desc="halt">
		dManager.registerCommand(
			domainName,
			"halt",
			stopExecution,
			false,
			"Stop sketch execution"
		);
		//</editor-fold>

		//<editor-fold desc="restart">
		dManager.registerCommand(
			domainName,
			"restart",
			restartExecution,
			false,
			"Restart sketch execution"
		);
		//</editor-fold>

		//<editor-fold desc="launchGdb">
		dManager.registerCommand(
			domainName,
			"launchGdb",
			launchGdb,
			false,
			"Start Gdb",
			[{
				name:"elfFile",
				type:"string",
				description:"Elf file to locate"
			},
				{
					name:"sketchFolder",
					type:"string",
					description:"Sketch folder"
				}]
		);
		//</editor-fold>

		//<editor-fold desc="show_breakpoints">
		dManager.registerCommand(
			domainName,
			"show_breakpoints",
			showBreakpoints,
			false,
			"Show a list of breakpoints",
			[],
			[{	name:"breakpointList",
				type:"string",
				description:"List of breakpoints"
			}]
		);
		//</editor-fold>

		//<editor-fold desc="set_breakpoint">
		dManager.registerCommand(
			domainName,
			"set_breakpoint",
			setBreakpoint,
			false,
			"Set breakpoint",
			[{	name:"sketchname",
				type:"string",
				description:"File in witch set breakpoint"
			},
				{	name:"breakpointLine",
					type:"int",
					description:"Set a breakpoint at breakpointLine row"
				}]
		);
		//</editor-fold>

		//<editor-fold desc="deleteBreakpoint">
		dManager.registerCommand(
			domainName,
			"deleteBreakpoint",
			deleteBreakpoint,
			false,
			"Delete breakpoint",
			[{	name:"sketchname",
				type:"string",
				description:"File in witch delete breakpoint"
			},
				{	name:"breakpointLine",
					type:"int",
					description:"Delete the breakpoint at breakpointLine row"
				}]
		);
		//</editor-fold>

		//<editor-fold desc="saveBreakpoint">
		dManager.registerCommand(
			domainName,
			"saveBreakpoints",
			saveBreakpoints,
			false,
			"Save breakpoint in a file",
			[{	name:"bpList",
				type:"string",
				description:"List of breakpoints"
			},
				{	name:"filename",
					type:"string",
					description:"Name of file(absolute) to save breakpoints"
				}]
		);
		//</editor-fold>

		//<editor-fold desc="show_variables">
		dManager.registerCommand(
			domainName,
			"show_variables",
			showVariables,
			false,
			"Show variables with their values"
		);
		//</editor-fold>

		//<editor-fold desc="step_next_line">
		dManager.registerCommand(
			domainName,
			"step_next_line",
			stepNextLine,
			false,
			"Step next line"
		);
		//</editor-fold>

		//<editor-fold desc="step_next_bp">
		dManager.registerCommand(
			domainName,
			"step_next_bp",
			stepNextBp,
			false,
			"Step next line"
		);
		//</editor-fold>

		//<editor-fold desc="getTmpFolder">
		dManager.registerCommand(
			domainName,
			"getTmpFolder",
			getTmpFolder,
			false,
			"Get tmp folder"
		);
		//</editor-fold>

//------------     EVENTS     ------------
		//<editor-fold desc="debug_data">
		dManager.registerEvent(
			domainName,
			"debug_data",
			[{	name:"ddata",
				type:"string",
				description:"data from gdb"
			}]
		);
		//</editor-fold>

		//<editor-fold desc="debug_err">
		dManager.registerEvent(
			domainName,
			"debug_err",
			[{	name:"derr",
				type:"string",
				description:"error from gdb"
			}]
		);
		//</editor-fold>

		//<editor-fold desc="close_flag">
		dManager.registerEvent(
			domainName,
			"close_flag",
			[{	name:"flag",
				type:"int",
				description:"Communicates if openOcd and GDB were closed"
			}]
		);
		//</editor-fold>

	}

	exports.init = init;
}());
