var SerialPort = require('serialport').SerialPort,
	child_process = require('child_process')
	sp = null;

var SerialPort2 = require('serialport');
	
//function runAVRDude(hexfile, portpath, options, debug, cb) {
function runAVRDude(hexfile, options, debug, cb) {
    debug("running AVR dude");
	console.log("[ SEBBA PORTA ] : " + options.port)
    if(options.platform.useSerial()) {
        var uploadcmd = [
            options.platform.getAvrDudeBinary(),    	//[ /hardware/tools/avr/bin/avrdude]
            '-C'+options.platform.getAvrDudeConf(),		//[ /hardware/tools/avr/etc/avrdude.conf]
            '-v','-v','-v', '-v', //super verbose
            '-p'+options.device.build.mcu,
            '-c'+options.device.upload.protocol,
            //'-P'+portpath,
            '-P'+options.port,
            '-b'+options.device.upload.speed,
            '-D', //don't erase
            '-Uflash:w:'+hexfile+':i'
        ];
    } else {
        var uploadcmd = [
            options.platform.getAvrDudeBinary(),	
            '-C'+options.platform.getAvrDudeConf(),
            '-c',options.platform.getProgrammerId(),//'usbtiny',
            '-p',options.device.build.mcu,//'attiny85',
            '-Uflash:w:'+hexfile,
        ];
    }

    console.log("running", uploadcmd.join(' '));
	//---------------------------------
	//sp = new SerialPort(portpath,{
//	sp = new SerialPort(options.port,{ baudRate:1200 });
//	sp = new SerialPort(options.port);

//	sp.on('open',function() {
//		sp.close(function(err) {
//			if(!err){
				//var start = new Date().getTime();
				//while(((new Date).getTime()-start)<=2000){};
				
				var result = child_process.execFile(
					uploadcmd[0],
					uploadcmd.slice(1),
					function(error, stdout, stderr) {
						console.log(error,stdout,stderr);
						if(error) {
							console.log("error. code = ",error.code);
							console.log(error);
							var err = new Error("there was a problem running " + uploadcmd.join(" "));
							err.cmd = uploadcmd;
							err.output = stdout + stderr;
							console.log(stdout);
							console.log(stderr)
							debug(err);
							if(cb) cb(err);
						} else {
							debug("uploaded");
							if(cb) cb();
						}
					}
				);
//			}
//			else
//				console.log("APERTURA errore");
//		});
//	});
}

function scanForPortReturn(list1,options, cb) {
	var selected = "";
    SerialPort2.list(function(err, list2) {
        console.log("list 2 is ",list2);
        console.log("lengths = ",list1.length,list2.length);
        if(list2.length < list1.length) {
            console.log("we need to rescan");
			console.log("TEST 1: "+options.device.uid.length);
            setTimeout(function() {
                scanForPortReturn(list1, options, cb);
            },700);
        } else {
            console.log('we are back to normal!');
//TODO    controllare
			console.log("....................................................")
			setTimeout(function() {
			console.log(JSON.stringify(list2));
				console.log("TEST 2: "+options.device.uid.length);
			for(item in list2)
			{
				console.log("TEST 2b: "+options.device.uid.length);
				for(var i = 0; i < options.device.uid.length; i++) {
					var suf_pid = options.device.uid[i].pid.substring(2);
					if (list2[item].pnpId.indexOf('PID_' + suf_pid) > -1 || list2[item].pnpId==""){
					//if (list2[item].pnpId=="") {
						console.log("SELECTED : " + JSON.stringify(list2[item]));
						selected = list2[item].comName;
						//cb(list2[item].comName);
					}
				}
			}
                //cb(list1[list1.length-1].comName);
				cb(selected);
            },500);
        }
    });
}

//customize the command, used in sketch loading through programmer 
function customizeUpload(cmd, prg){
	var index;
	switch(prg)
	{
		case 'stk500v1': 
		//	eliminare -D 
		//	eliminare -b
			index = searchStringInArray('-D', cmd);
			if(index > -1)
				cmd.splice(index,1);
			index = searchStringInArray('-b', cmd);
			if(index > -1)
				cmd.splice(index,1);
			break;
		case 'stk500v2':
		case 'usbasp':		
		//	modificare -P
		//	eliminare -D 
		//	eliminare -b
			index = searchStringInArray('-D', cmd);
			if(index > -1)
				cmd.splice(index,1);
			index = searchStringInArray('-b', cmd);
			if(index > -1)
				cmd.splice(index,1);
			index = searchStringInArray('-P', cmd);
			if(index > -1)
				cmd[index] = '-Pusb'
			break;
		case 'usbtiny':
		case 'arduinoisp':
		case 'arduinoasisp':
		//	eliminare -D 
		//	eliminare -b
		//	eliminare -P (??)
			index = searchStringInArray('-D', cmd);
			if(index > -1)
				cmd.splice(index,1);
			index = searchStringInArray('-b', cmd);
			if(index > -1)
				cmd.splice(index,1);
			index = searchStringInArray('-P', cmd);
			if(index > -1)
				cmd.splice(index,1);
			break;
		case 'dapa':
		//	aggiungere -F	
		//	eliminare -D	
		//	eliminare -P	
			index = searchStringInArray('-D', cmd);
			if(index > -1)
				cmd.splice(index,1);
			index = searchStringInArray('-P', cmd);
			if(index > -1)
				cmd.splice(index,1);
			index = searchStringInArray('-c', cmd);
			if(index > -1)
				cmd.splice(index,0, "-F");
			break;
		case 'arduinoasisp':
			break;
	}
	return cmd;
}

function searchStringInArray (str, strArray) {
    for (var j=0; j<strArray.length; j++) {
        if (strArray[j].match(str)) return j;
    }
    return -1;
}

exports.upload = function(hexfile,options, publish, callback) {
    function debug(message) {
        var args = Array.prototype.slice.call(arguments);
        if(message instanceof Error) {
            publish({type:'error', message: args.join(" ") + message.output});
        } else {
            publish({type:"upload", message:args.join(" ")});
        }
    }
    console.log("uploading to device using ",options.device);

    //if(options.device.bootloader.path == 'caterina') {
    if(options.device.bootloader.file.indexOf('caterina')> -1) {
        console.log("need to do the leonardo dance");

        //scan for ports
		SerialPort2.list(function(err,list1) {
            console.log("list 1 is ",list1);
            //open port at 1200 baud
            var sp2 = new SerialPort(options.port, { baudrate: 1200 });
            sp2.on('open',function() {
                console.log("opened at 1200bd");
                //close port
                sp2.flush(function() {
                    sp2.close(function() {
                        console.log("did a successful close");
                        console.log("closed at 1200bd");
                        //wait 300ms
                        setTimeout(function() {
                            console.log("doing a second list");
                            //scan for ports again
								scanForPortReturn(list1, options, function(ppath) {
									console.log("got new path 1 : ",ppath);
									options.port = ppath;
										console.log("got new path 2 : ",options.port);
									runAVRDude(hexfile, options, debug, callback);
                            })
                        },500);
                    })
                });

            });

        });
    } else {
        runAVRDude(hexfile, options,debug, callback);
    }
}

//TODO modificare port con options.port e lasciare un solo parametro
exports.writeBootloader = function(port, options){
	    console.log("running AVR dude");

        var uploadcmd = [
            options.platform.getAvrDudeBinary(),
            '-C'+options.platform.getAvrDudeConf(),
            '-v','-v','-v', '-v',
            '-p'+options.device.build.mcu,
            '-c'+options.device.upload.protocol,
            '-P'+port,
            '-b'+options.device.upload.speed,
            '-e',
            '-Ulock:w:'+options.device.bootloader.unlock_bits+":m",
            '-Uefuse:w:'+options.device.bootloader.extended_fuses+":m",			
            '-Uhfuse:w:'+options.device.bootloader.high_fuses+":m",
            '-Ulfuse:w:'+options.device.bootloader.low_fuses+":m"           
        ];
		
	console.log("******************************************");
    console.log("writing bootloader \n", uploadcmd.join(' '));
	
	var newcmd = customizeUpload(uploadcmd, uploadcmd[searchStringInArray('-c', uploadcmd)].slice(2));
	
	console.log('COMMAND : '+ newcmd.join(' '));
	
	var result = child_process.execFile(
					uploadcmd[0],
					uploadcmd.slice(1),
					function(error, stdout, stderr) {
						console.log(error,stdout,stderr);
						if(error) {
							console.log("error. code = ",error.code);
							console.log(error);
							var err = new Error("there was a problem running " + uploadcmd.join(" "));
							err.cmd = uploadcmd;
							err.output = stdout + stderr;
							console.log(stdout);
							console.log(stderr)
							console.log(err);
							if(cb) cb(err);
						} else {
							console.log("uploaded");
						}
					}
				);
}