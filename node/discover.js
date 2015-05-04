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
		Args  = require('args-js'),
		ArduinoSerial = require('arduino-discover-serial'),
		evilscan = require('evilscan'),
		Async = require('async');
	
	var domainName = "org-arduino-ide-domain-discovery",
		dManager;
	

	var boardPorts = [];


	//The boardport object.... should be improve as a 'class' with encapusalation
	//	{
	//		address : "/dev/tty.usbmodem1421",   (or "192.168.1.100")	//comunication info
	//		name    : "Arduino Magic Board",							//name of the board
	//		vid     : "0x2a03",											//vendor id
	//		pid     : "0x1234",											//product id
	//		label   : "/dev/tty.usbmodem1421 - Arduino Magic Board",	//presentation name
	//		protocol: "serial" (or network)								//communication protocol
	//		manufacturer : "Arduino Srl"								//manufacturer name
	//	}


	/**
	 * get the list of board connected by usb
	 * @param  {Function} callback [description]
	 */
	function serialDiscover(callback){
		var serialPortList = [];
		ArduinoSerial.portDetect(function(ports){
			Async.each(ports,
				function(port, callback){
					var bport = {};

					bport.address = port.comName;		//ADDRESS
					bport.protcol = "serial";			//PROTOCOL
					//MAC
					if(process.platform == "darwin"){	//PID & VID
						bport.vid =  port.vendorId;
						bport.pid =  port.productId;
					}
					//WIN
					if(process.platform == "win32"){	
						bport.vid =  port.pnpId;
						//bport.pid =  ports.;	
					}
					//LINUX
					//TODO
					
					//TODO finish implements the funcion
					//bport.name = resolveNameByVidPid(bport.vid, bport.pid);	//NAME
					bport.label = port.comName;//( bport.name =  "" || typeof(bport.name) == 'undefined' || !bport.name) ? bport.address : bport.address + " - " + bport.name;
					bport.manufacturer = port.manufacturer;
					bport.serial = port.serial;

					serialPortList.push(bport);
					callback();
				},
				function(err){
					if(err)
						callback(err);
					else
						callback(null, serialPortList);
				});

		});

	}	


	function networkDiscover(callback){
		//TODO


		var networkPortList = [];
		callback(null, networkPortList);
	}


	function init(domainManager){
		if(!domainManager.hasDomain( domainName )){
			domainManager.registerDomain( domainName, {major: 0, minor: 1});
		}
		dManager = domainManager;
		
		dManager.registerCommand(
			domainName,
			"serialDiscover",
			serialDiscover,
			true,
			"Get all the 'serial' ports"
		);

		dManager.registerCommand(
			domainName,
			"networkDiscover",
			networkDiscover,
			true,
			"Get all the 'netowrked' boards"
		);
	}
	
	exports.init = init;
}());