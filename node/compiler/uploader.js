/**
 *  BASED ON
 *  https://github.com/joshmarinacci/ElectronIDE
 *  BY Josh Marinacci
 *
 *  MODIFIED BY Arduino.org Team
 */

var SerialPort = require('serialport').SerialPort,
	child_process = require('child_process')
	sp = null;

var SerialPort2 = require('serialport');

function scanForPortReturn(list1,options, cb) {
	var selected = "";
    SerialPort2.list(function(err, list2) {
        if(list2.length < list1.length) {
            console.log("we need to rescan");
            setTimeout(function() {
                scanForPortReturn(list1, options, cb);
            },700);
        } else {
            console.log('we are back to normal!');
			setTimeout(function() {
			for(item in list2)
			{
			console.log("ELEMENT : " + JSON.stringify(item));
				for(var i = 0; i < options.device.uid.length; i++) {
					var suf_pid = options.device.uid[i].pid.substring(2).toUpperCase();
					if (list2[item].pnpId.indexOf('PID_' + suf_pid) > -1 || list2[item].pnpId==""){
					//if (list2[item].pnpId=="") {
						console.log("SELECTED : " + JSON.stringify(list2[item]));
						selected = list2[item].comName;
					}
				}
			}
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
			index = searchStringInArray('-D', cmd);
			if(index > -1)
				cmd.splice(index,1);
			index = searchStringInArray('-b', cmd);
			if(index > -1)
				cmd.splice(index,1);
			break;
		case 'stk500v2':
		case 'usbasp':
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

//IN TESTING
exports.upload = function(upcmd,options, publish, callback) {
	function debug(message) {
		var args = Array.prototype.slice.call(arguments);
		if(message instanceof Error) {
			publish({type:'error', message: args.join(" ") + message.output});
		} else {
			publish({type:"upload", message:args.join(" ")});
		}
	}
	console.log("uploading to device using ",options.device);
	if( options.device.upload.wait_for_upload_port ) {
		console.log("need to do the leonardo dance");
		//scan for ports
		SerialPort2.list(function(err,list1) {
			//open port at 1200 baud
			var sp2 = new SerialPort(options.port, { baudrate: 1200 });
			sp2.on('open',function() {
				console.log("opened at 1200bd");
				//close port
				sp2.flush(function() {
					sp2.close(function() {
						console.log("closed at 1200bd");
						//wait 300ms
						setTimeout(function() {
							console.log("doing a second list");
							//scan for ports again
							scanForPortReturn(list1, options, function(ppath) {
								//TODO : in upcmd search "-P"+options.port and substitute with "-P"+ppath
								upcmd[upcmd.indexOf("-P"+options.port)] = "-P"+ppath;
								//options.port = ppath;
								runAVRDude(upcmd, debug, callback);
							})
						},3000);
					})
				});

			});

		});
	} else {
		runAVRDude(upcmd, debug, callback);
	}
}



function runAVRDude(uploadcmd, debug, cb) {
	debug("Uploading...");
	
	console.log("running", uploadcmd.join(' '));
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
				//err.output = stdout + stderr;
				err.message = stdout + stderr;   ///  creare direttamente in new Error (row 53)
				err.type = "error";
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
}

//TODO edit port -> options.port ; 1 parameter
exports.writeBootloader = function(port, options){
	    console.log("Writing bootloader...");

        var uploadcmd = [
            options.platform.getAvrDudeBinary(),
            '-C'+options.platform.getAvrDudeConf(),
            //'-v','-v','-v', '-v',
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

	if(options.verboseupload)
		cmd.push('-v','-v','-v', '-v');

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