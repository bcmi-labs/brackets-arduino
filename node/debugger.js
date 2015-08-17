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
		timer			= require('timers');
	
	var domainName = "org-arduino-ide-domain-debug",
		dManager;

	var interval = 2000;

	var arduinopath = "C:/Users/Sebastiano/Downloads/arduino-1.7.5.org-windows/arduino-1.7.5/",
		openocd = "hardware/tools/OpenOCD-0.9.0-arduino/bin/openocd.exe",
		scripts = "hardware/tools/OpenOCD-0.9.0-arduino/share/openocd/scripts",
		script = "hardware/arduino/samd/variants/arduino_zero/openocd_scripts/arduino_zero.cfg",
		gdb = "hardware/tools/gcc-arm-none-eabi-4.8.3-2014q1/bin/arm-none-eabi-gdb",
		blinkfolder = "examples/01.Basics/Blink";

	var openOcdProcess,
		ocdProcess;

	function launchOpenOcd()
	{
		var OpenOcdCmd = [arduinopath+openocd, "-s", arduinopath+scripts, "-f", arduinopath+script];
		openOcdProcess = child_process.spawn(OpenOcdCmd[0], OpenOcdCmd.slice(1));

		return openOcdProcess.pid;
	}

	function launchGdb()
	{
		var OcdCmd = [arduinopath+gdb, "-d", arduinopath+blinkfolder]
		ocdProcess = child_process.exec(OcdCmd[0], OcdCmd.slice(1));

		ocdProcess.stdout.on("data", function(data){
			dManager.emitEvent(domainName, "debug_data", data.toString());
		});

		ocdProcess.stderr.on("data", function(data){
			dManager.emitEvent(domainName, "debug_err", data.toString());
		});

		if(ocdProcess.pid)
			timer.setTimeout(function(){
				locateElfFile("C:/Users/Sebastiano/AppData/Local/Temp/build7710172437809297057.tmp/Blink.cpp.elf")
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
		dManager.emitEvent(domainName, "debug_data", "monitor reset halt"+" \n")
	}

	function restartExecution()
	{
		console.log("--|| Restart sketch ||--")
		ocdProcess.stdin.write(" monitor reset init"+" \n")
		dManager.emitEvent(domainName, "debug_data", "monitor reset init"+" \n")
	}

	function continueExecution()
	{
		console.log("--|| Continue sketch execution ||--")
		ocdProcess.stdin.write(" continue"+" \n")
		dManager.emitEvent(domainName, "debug_data", "continue"+" \n")
	}

	function showFunction(foo)
	{
		console.log("--|| Show " + foo + " ||--")
		ocdProcess.stdin.write("l " + foo + " \n")
		dManager.emitEvent(domainName, "debug_data", "l " + foo + " \n")
	}

	function showBreakpoints()
	{
		console.log("--|| Show a list of breakpoints ||--")
		ocdProcess.stdin.write("info breakpoints " + " \n")
		dManager.emitEvent(domainName, "debug_data", "info breakpoints" + " \n")
	}

	function setBreakpoint(line)
	{
		console.log("--|| Set breakpoint at " + line + " ||--")
		ocdProcess.stdin.write("b " + line + " \n")
		dManager.emitEvent(domainName, "debug_data", "b " + line + " \n")
	}

	function showVariable(variable)
	{
		console.log("--|| Show the value of " + variable + " ||--")
		//ocdProcess.stdin.write("b " + line + " \n")
		dManager.emitEvent(domainName, "debug_data", "ANCORA NON IMPLEMENTATA")
	}

	function init(domainManager){
		if(!domainManager.hasDomain( domainName )){
			domainManager.registerDomain( domainName, {major: 0, minor: 1});
		}
		dManager = domainManager;

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

		dManager.registerCommand(
			domainName,
			"halt",
			stopExecution,
			false,
			"Stop sketch execution"
		);

		dManager.registerCommand(
			domainName,
			"init",
			restartExecution,
			false,
			"Restart sketch execution"
		);

		dManager.registerCommand(
			domainName,
			"continue",
			continueExecution,
			false,
			"Restart sketch execution"
		);

		dManager.registerCommand(
			domainName,
			"launchGdb",
			launchGdb,
			false,
			"Start Gdb"
		);

		dManager.registerCommand(
			domainName,
			"show_function",
			showFunction,
			false,
			"Show setup function",
			[{	name:"functionName",
				type:"string",
				description:"Function to show"
			}],
			[{	name:"functionBody",
				type:"string",
				description:"Function body"
			}]
		);

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

		dManager.registerCommand(
			domainName,
			"set_breakpoint",
			setBreakpoint,
			false,
			"Set breakpoint",
			[{	name:"breakpointLine",
				type:"int",
				description:"Set a breakpoint at breakpointLine row"
			}]
		);

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




		dManager.registerEvent(
			domainName,
			"debug_data",
			[{	name:"ddata",
				type:"string",
				description:"data from gdb"
			}]
		);

		dManager.registerEvent(
			domainName,
			"debug_err",
			[{	name:"derr",
				type:"string",
				description:"error from gdb"
			}]
		);

	}
	
	exports.init = init;
}());