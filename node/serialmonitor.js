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
	
	var SerialPort = require('serialport').SerialPort,
		Args  = require('args-js');
	
	var domainName = "org-arduino-ide-domain-serialmonitor",
		dManager;

	var sp = null;	
	
	
	//function open(port, rate, eol) {
	function open(port, rate, eol) {
		var args = Args([
						{ port:   	Args.STRING 	| Args.Required },
						{ rate:		Args.INT		| Args.Required },
						{ eol:		Args.STRING		| Args.Optional },
						], arguments);

		sp = new SerialPort(args.port, { baudRate: args.rate },false);
		/*sp.on('open',function() {
			
			sp.on('data',function(data) {
				dManager.emitEvent (domainName, "serial_data", data.toString());
			});
			
			sp.on('close',function(err) {
				console.log('port closed from the other end', err);
			});
			sp.on('error',function(err) {
				//console.log('serial port error',err);
				//dManager.emitEvent (domainName, "serial_open_errror", err.toString());
			});
			sp.on('err',function(err) {
				//console.log('serial port err',err);
				//dManager.emitEvent (domainName, "serial_open_errror", err.toString());
			});
		});*/
		sp.open(function (err) {
  			if ( err ) {
  				//console.log(error.toString());
    			dManager.emitEvent (domainName, "serial_operation_error", err.toString());
  			} 
  			else {
    			//console.log('open');
				var my_data_array = [];
			    sp.on('data', function(data) {
					var flag = true;


					for(var i = 0; i< data.length; i++)
					{
						if(args.eol.indexOf(',')>0)
						{
							var eols = args.eol.split(',');
							eols[0] = eols[0].substring(1, eols[0].length);
							eols[1] = eols[1].substring(0, eols[1].length-1);
							if (data[i] == eols[0] || data[i] == eols[1]) {
								//my_data_array.push(data[i]);
								var new_buf = new Buffer(my_data_array);
								dManager.emitEvent(domainName, "serial_data", new_buf.toString());
								my_data_array = [];
								flag = false;
							}
							else
								my_data_array.push(data[i]);
						}
						else if(args.eol == "NA")
						{
							if (data[i] == 10 || data[i] == 13) {
								var new_buf = new Buffer(my_data_array);
								dManager.emitEvent(domainName, "serial_data", new_buf.toString());
								my_data_array = [];
								flag = false;
							}
							else
								my_data_array.push(data[i]);
						}
						else
						{
							if (data[i] == args.eol) {
								my_data_array.push(data[i]);
								var new_buf = new Buffer(my_data_array);
								dManager.emitEvent(domainName, "serial_data", new_buf.toString());
								my_data_array = [];
								flag = false;
							}
							else
								my_data_array.push(data[i]);
						}
					}

					/*if(flag) {
						var new_buf = new Buffer(my_data_array);
						dManager.emitEvent(domainName, "serial_data", new_buf.toString());
						my_data_array = [];
					}*/

					//ORIGINAL
					/*if(last_data != 13 || last_data!=10)
					{
						serial_data += data;
						dManager.emitEvent(domainName, "serial_data", data.toString());
					}
					else
					{
						serial_data +=data;
						serial_data = serial_data.substring(0, serial_data.length-1);
						dManager.emitEvent(domainName, "serial_data", serial_data);
						serial_data = "";

					}*/
			      	//dManager.emitEvent (domainName, "serial_data", data.toString());
			    });
			}
		});


	}

	function close(port) {
		//TODO seems that the port is busy after 'close' call
		//console.log("closing the serial port",port);
		sp.close(function(err) {
			if(err)
				dManager.emitEvent (domainName, "serial_operation_error", err.toString());
				//console.log("the port is really closed now");
			//else
				//console.error("error during communication closing");
		});
	}

	function send(message)  {
		sp.write(message,function(err, results) {
			if(err)
				//console.error('err',err)
				dManager.emitEvent (domainName, "serial_operation_error", err.toString());
			//if(results) console.log('results',results)
		});
	}
	

	
	function init(domainManager){
		if(!domainManager.hasDomain( domainName )){
			domainManager.registerDomain( domainName, {major: 0, minor: 1});
		}
		dManager = domainManager;
		
		dManager.registerCommand(
			domainName,
			"open",
			open,
			false,
			"Open serial communication",
			[{	name:"port",
				type:"string",
				description:"Number of port"
			}],
			[{	name:"rate",
				type:"int",
				description:"Baud rate"
			}],
			[{	name:"eol",
				type:"int",
				description:"End of line"
			}]
		);
		
		dManager.registerCommand(
			domainName,
			"close",
			close,
			false,
			"Close serial communication",
			[{	name:"port",
				type:"string",
				description:"Number of port"
			}]
		);
		
		dManager.registerCommand(
			domainName,
			"send",
			send,
			false,
			"Send message",
			[{	name:"message",
				type:"string",
				description:"Message to send"
			}]
		);
		
		dManager.registerEvent(
			domainName,
			"serial_data",
			[{	name:"sdata",
				type:"string",
				description:"serial data from board"
			}]
		);

		dManager.registerEvent(
			domainName,
			"serial_operation_error",
			[{	name:"err",
				type:"string",
				description:"error operating with the serial port"
			}]
		);

	}
	
	exports.init = init;
}());