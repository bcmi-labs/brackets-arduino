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
	
	var Serial = require('serialport'),
		Args  = require('args-js'),
		//ArduinoSerial = require('arduino-discover-serial'),
		evilscan = require('evilscan'),
		Async = require('async');
	
	var domainName = "org-arduino-ide-domain-discovery",
		dManager;
	

	var boardPorts = [],
		pids = ["0X2A03", "0X2341", "0X1B4F", "0X03EB"];	//Arduino Srl, Arduino Llc, SparckFun, Atmel


		pids = [];	//no filter

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
		Async.waterfall([
			function(cbk_1){							//1. detect devices
				Serial.list(function (err, ports) {
					if(err)
						cbk_1(err);
					else
						cbk_1(null, ports);
				});

			},
			function(ports, cbk_2){					//2. filter only arduino's devices
				Async.filter(ports,
					function(item, cbk_2_1){

						//MACOSX
						if(process.platform == "mac" || process.platform == "darwin"){
							if(pids.length == 0)
								cbk_2_1(true);
							else
								if(	pids.length > 0 && pids.indexOf( item.vendorId.toString().toUpperCase()) > -1 )
									cbk_2_1(true);
								else
									cbk_2_1(false);
						}

						//WIN:
						if(process.platform == "win" || process.platform == "win32" || process.platform == "win64"){

							item.vendorId  = "0X"+item.pnpId.substring(item.pnpId.indexOf("VID_")+4, item.pnpId.indexOf("VID_")+8);
							item.productId = "0X"+item.pnpId.substring(item.pnpId.indexOf("PID_")+4, item.pnpId.indexOf("PID_")+8);

							if(pids.length == 0)
								cbk_2_1(true);
							else
								if(pids.length > 0 &&  pids.indexOf( item.vendorId.toString().toUpperCase() ) > -1 )
									cbk_2_1(true);
								else
									cbk_2_1(false);
						}

						//TODO LINUX

					},
					function(result){
						cbk_2(null, result);
					});
			},
			function(filtered, cbk_3){		//3. for every port detected create a new port object and push it to the serial port list
				var serialPortList = [];
				Async.each(filtered,
					function(port, cbk_3_1){
						var bport = {};

						bport.address = port.comName;		//ADDRESS
						bport.protcol = "serial";			//PROTOCOL
						//MACOSX
						if(process.platform == "mac" || process.platform == "darwin"){
							bport.vid =  port.vendorId;
							bport.pid =  port.productId;
						}
						//WIN
						if(process.platform == "win" || process.platform == "win32" || process.platform == "win64"){
							bport.vid =  port.vendorId;
							bport.pid =  port.productId;
						}
						//TODO LINUX


						bport.label = port.comName;//( bport.name =  "" || typeof(bport.name) == 'undefined' || !bport.name) ? bport.address : bport.address + " - " + bport.name;
						bport.manufacturer = port.manufacturer;
						bport.serial = port.serial;

						serialPortList.push(bport);
						cbk_3_1();
					},
					function(err){
						if(err)
							cbk_3(null, []);
						else
							cbk_3(null, serialPortList);
					}
				);
			}
		],
		function(err, result){
			if(err)
				callback(err);
			else
				callback(null, result);

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