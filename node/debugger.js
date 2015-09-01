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
		ocdProcess;

	var rootDir = __dirname.substring(0, __dirname.lastIndexOf(path.sep)),
		interval = 2000;

	function getTmpFolder()
	{
		return os.tmpdir();
	}

	function getOpenOcd()
	{
		return rootDir+((process.platform =='win32')? '\\hardware\\tools\\OpenOCD-0.9.0-arduino\\bin\\openocd' : 'hardware/tools/OpenOCD-0.9.0-arduino/bin/openocd')
	}

	function getScriptDir()
	{
		return rootDir+((process.platform =='win32')? '\\hardware\\tools\\OpenOCD-0.9.0-arduino\\share\\openocd\\scripts' : 'hardware/tools/OpenOCD-0.9.0-arduino/share/openocd/scripts')
	}

	function getScript()
	{
		return rootDir+((process.platform =='win32')? '\\hardware\\arduino\\samd\\variants\\arduino_zero\\openocd_scripts\\arduino_zero.cfg' : 'hardware/arduino/samd/variants/arduino_zero/openocd_scripts/arduino_zero.cfg')
	}

	function getGdb()
	{
		return rootDir+((process.platform =='win32')? '\\hardware\\tools\\samd\\bin\\arm-none-eabi-gdb' : 'hardware/tools/samd/bin/arm-none-eabi-gdb')
	}



	function launchOpenOcd()
	{
		var OpenOcdCmd = [getOpenOcd(), "-s", getScriptDir(), "-f", getScript()];
		openOcdProcess = child_process.spawn(OpenOcdCmd[0], OpenOcdCmd.slice(1));

		return openOcdProcess.pid;
	}

	function launchGdb(elfFile, sketchFolder)
	{
		var OcdCmd = [getGdb(), "-d", sketchFolder]
		ocdProcess = child_process.exec(OcdCmd[0], OcdCmd.slice(1));

		ocdProcess.stdout.on("data", function(data){
			dManager.emitEvent(domainName, "debug_data", data.toString());
		});

		ocdProcess.stderr.on("data", function(data){
			dManager.emitEvent(domainName, "debug_err", data.toString());
		});

		if(ocdProcess.pid)
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
		ocdProcess.stdin.write("file " + filepath + " \n")
		console.log("file " + filepath + " \n")

	}

	function locateLiveProgram()
	{
		console.log("--|| Locate live program ||--")
		ocdProcess.stdin.write("target remote localhost:3333"+" \n")
		dManager.emitEvent(domainName, "debug_data", "target remote localhost:3333"+" \n");
	}




	function stopExecution()
	{
		console.log("--|| Stop sketch ||--")
		ocdProcess.stdin.write(" monitor reset halt"+" \n")
		dManager.emitEvent(domainName, "debug_data", "Halt")
	}

	function restartExecution()
	{
		console.log("--|| Restart sketch ||--")
		ocdProcess.stdin.write(" monitor reset run"+" \n")
		dManager.emitEvent(domainName, "debug_data", "Resume")
	}

	function stepNextBp()
	{
		console.log("--|| Continue sketch execution ||--")
		ocdProcess.stdin.write(" continue" + " \n")
		//dManager.emitEvent(domainName, "debug_data", "continue")
	}

	function stepNextLine()
	{
		console.log("--|| Step Next Line ||--")
		ocdProcess.stdin.write(" next" + " \n")
		//dManager.emitEvent(domainName, "debug_data", "next")
	}

	function showBreakpoints()
	{
		console.log("--|| Show a list of breakpoints ||--")
		ocdProcess.stdin.write("info breakpoints " + " \n")
		//dManager.emitEvent(domainName, "debug_data", "info breakpoints")
	}

	function setBreakpoint(filename, line)
	{
		console.log("--|| Set breakpoint at " + line + " ||--")
		ocdProcess.stdin.write("break " + filename +  ":" + line + " \n")
		//dManager.emitEvent(domainName, "debug_data", "b " + line)
	}

	//[SUSPENDED]
	function showVariable(variable)
	{
		console.log("--|| Show the value of " + variable + " ||--")
		ocdProcess.stdin.write("print " + variable + " \n")
		//dManager.emitEvent(domainName, "debug_data", "print " + variable)
	}

	function showVariables()
	{
		console.log("--|| Show variables ||--")
		ocdProcess.stdin.write("info locals" + " \n")
		//dManager.emitEvent(domainName, "debug_data", "print " + variable)
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

		//[SUSPENDED]
		//<editor-fold desc="show_value">
		dManager.registerCommand(
			domainName,
			"show_value",
			showVariable,
			false,
			"Show variable value",
			[{	name:"variableName",
				type:"string",
				description:"Name of varibale to inspect"
			}],
			[{	name:"variableValue",
				type:"string",
				description:"Value of variableName"
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

	}
	
	exports.init = init;
}());