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

    var async = require('async'),
        exec  = require('child_process').exec,
        path  = require('path');

    var domainName = "org-arduino-ide-domain-driver",
        dManager;

    function isWin64() {
        return process.arch === 'x64' || process.env.hasOwnProperty('PROCESSOR_ARCHITEW6432');
    }


    function install(driverPath){console.log("A "+driverPath);
        async.series([
                function(callback){console.log("B1");
                    // arduino and linino windows drivers
                    var fileexe = isWin64() ? path.join(driverPath , 'dpinst-amd64.exe') : path.join(driverPath + 'dpinst-x86.exe'); console.log("B2 " + fileexe);
                    var driverInstallation  = exec("\""+fileexe+"\"",
                        function (error, stdout, stderr) {
							console.log("B2.1");
                            if (error !== null){
								console.error('B3: ' + error);
                                callback(error);
							}
                            else{
								console.log("B3 " + stdout);
								callback(null, 'arduino');
							}
                        });
                },
                function(callback){console.log("C1 ");
                    // atmel windows drivers
					var fileexe = path.join(driverPath + 'driver-atmel-bundle-7.0.712.exe'); console.log("CC " + fileexe);
                    var atmelInstallation  = exec( "\""+ fileexe + "\"" ,
                        function (error, stdout, stderr) {
                            if (error !== null)
                            //console.log('exec error: ' + error);
                                callback(error);
                            else
                                callback(null, 'arduino');
                        });
                }
            ],
            // optional callback
            function(err, results){
                if(!err){console.log("ERR "+err);
                    console.error(err);
                }
                else{
                    console.log("Driver installation results");
					return(results);
				}
            });

    }

    function init(domainManager) {
        if (!domainManager.hasDomain(domainName)) {
            domainManager.registerDomain(domainName, {major: 0, minor: 1});
        }
        dManager = domainManager;

        domainManager.registerCommand(
            domainName,
            "install",
            install,
            false,
            "Install Windows Drivers",
            [{
                name: "dir",
                type: "string",
                description: "Windows Drivers Directory Path"
            }]
        );
    }

    exports.init = init;

}());