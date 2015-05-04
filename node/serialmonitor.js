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

(function () {
	"use strict";
	
	var SerialPort = require('serialport').SerialPort,
		Args  = require('args-js');
	
	var domainName = "org-arduino-ide-domain-serialmonitor",
		dManager;

	var sp = null;	
	
	
	//function open(port, rate, eol) {
	function open(port, rate) {
		var args = Args([
						{ port:   	Args.STRING 	| Args.Required }
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
			    sp.on('data', function(data) {
			      //console.log('data received: ' + data);
			      dManager.emitEvent (domainName, "serial_data", data.toString());
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