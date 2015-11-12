/**
 *  BASED ON
 *  https://github.com/joshmarinacci/ElectronIDE
 *  BY Josh Marinacci
 *
 *  MODIFIED BY Arduino.org Team
 */

//TODO : expose only commands ?
var fs = require('fs');
var http = require('http');
var path = require('path');

console.log("os = " , process.platform);

var nodeDir = __dirname.substring(0, __dirname.lastIndexOf(path.sep));

var settings = {
    datapath:  nodeDir+((process.platform == 'win32') ? "\\node_modules\\arduinodata\\libraries" : "/node_modules/arduinodata/libraries" ),
    sketchtemplate: "sketchtemplate.ino"
};

function Platform() {
    this.os = process.platform;

    // OK
    this.useSerial = function() {
        return true;
    }

    // OK
    this.getUserHome = function() {
        return process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
    }

    // OK
    this.getReposPath = function() {
        return this.getUserHome()+((process.platform =='win32')? "\\AppData\\Roaming\\Brackets\\extensions\\user" : "/Library/Applicant Support/Brackets/extensions/user");
        //TODO linux case
    }

    // OK
    this.verifyUserSketchesDir = function() {
        var dir = this.getUserSketchesDir();
        if(!fs.existsSync(dir)) {
            fs.mkdirSync(dir);
        }
    }

    // OK
    this.getUserSketchesDir = function() {
        //TODO linux case
        //return this.getUserHome() + '/Sketchbook';
        return this.getUserHome()+((process.platform =='win32') ? '\\Documents\\Arduino' : "/Documents/Arduino");
    }

    // OK
    this.getUserLibraryDir = function() {
        return this.getUserSketchesDir()+((process.platform =='win32')? '\\libraries' : "/libraries");
    }

    // OK
    this.root = nodeDir.substring(0, nodeDir.lastIndexOf(path.sep));

    // OK
    this.getStandardLibraryPath = function() {
        return this.root+((process.platform =='win32')? '\\libraries' : "/libraries");
    }

    // OK
	this.getCorePath = function(opt) {		
		return this.root+((process.platform =='win32')? '\\hardware\\arduino\\' : '/hardware/arduino/')+opt.device.arch+((process.platform =='win32')? '\\cores\\' : '/cores/')+opt.device.build.core;		
    }

    // OK
	this.getVariantPath = function(opt) {
        return this.root+((process.platform =='win32')? '\\hardware\\arduino\\' : '/hardware/arduino/')+opt.device.arch+((process.platform =='win32')? '\\variants\\' : '/variants/')+opt.device.build.variant;
    }

    this.getCompilerBinaryPath = function() {
        return this.root+((process.platform =='win32')? '\\hardware\\tools\\samd\\bin' : '/hardware/tools/samd/bin');
    }

    this.getAvrDudeBinary = function() {
        // ALTERNATIVES //
        //return this.getCompilerBinaryPath()+((process.platform =='win32')? '\\avrdude' : '/avrdude');
        return this.root+((process.platform =='win32')? '\\hardware\\tools\\avr\\bin\\avrdude' : '/hardware/tools/avr/bin/avrdude');
    }

    this.getAvrDudeConf = function() {
        return this.root+((process.platform =='win32')? '\\hardware\\tools\\avr\\etc\\avrdude.conf' : '/hardware/tools/avr/etc/avrdude.conf');
    }

    // OK
    this.isInstalled = function() {
        return fs.exists(this.root, null);
    }

/* New Functionalities */

    this.getCMISPath = function(){
        return [    this.root+((process.platform =='win32')? '\\hardware\\tools\\CMSIS\\CMSIS\\Include' : '/hardware/tools/CMSIS/CMSIS/Include'),
                    this.root+((process.platform =='win32')? '\\hardware\\tools\\CMSIS\\Device\\ATMEL' : '/hardware/tools/CMSIS/Device/ATMEL')
        ];
    }

    this.getPattern = function() {
        //TODO : lasciare il campo eeprom come falso o eliminarlo direttamente ?
        return JSON.parse('{ "c": true, "cpp": true, "archives": true, "combine": true, "eeprom":false, "bin": true, "hex": true}' );
    };

    //OK
    this.getCCmd = function(){
        return "arm-none-eabi-gcc";
    };
    //OK
    this.getCElfCmd = function(){
        return "arm-none-eabi-g++";
    };
    //OK
    this.getCppCmd = function(){
        return "arm-none-eabi-g++";
    };
    //OK
    this.getArCmd = function(){
        return "arm-none-eabi-ar";
    };
    //OK
    this.getObjcopyCmd = function(){
        return "arm-none-eabi-objcopy";
    };
    //OK
    this.getElf2HexCmd = function(){
        return "arm-none-eabi-objcopy";
    };

    //OK
    this.getCFlags = function(){
        return "-c -g -Os -w -ffunction-sections -fdata-sections -nostdlib --param max-inline-insns-single=500 -Dprintf=iprintf";
    };
    //OK
    this.getCppFlags = function(){
        return "-c -g -Os -w -ffunction-sections -fdata-sections -nostdlib --param max-inline-insns-single=500 -fno-rtti -fno-exceptions -Dprintf=iprintf";
    };
    //OK
    this.getCElfFlags = function(){
        return "-Os -Wl,--gc-sections";
    };
    //OK
    this.getSFlags = function(){
        return "-c -g -x assembler-with-cpp"
    };
    //OK
    this.getArFlags = function(){
        return "rcs";
    };
    //OK
    this.getObjcopyEepFlags = function(){
        return "-O ihex -j .eeprom --set-section-flags=.eeprom=alloc,load --no-change-warnings --change-section-lma .eeprom=0";
    };
    //OK
    this.getElf2HexFlags = function(){
        return "-O ihex -R .eeprom";
    };
    //OK
    this.getElf2HexBinFlags = function(){
        return "-O binary";
    };

    this.getCElfFlags2 = function (){
        return "-Wl,--start-group -lm -lgcc -Wl,--end-group -mthumb -Wl,--cref -Wl,--check-sections -Wl,--gc-sections -Wl,--entry=Reset_Handler -Wl,--unresolved-symbols=report-all -Wl,--warn-common -Wl,--warn-section-align -Wl,--warn-unresolved-symbols -Wl,--start-group";
    }

    this.getLdScript = function(){
        return this.root+((process.platform =='win32')? '\\hardware\\arduino\\samd' : '/hardware/arduino/samd')+((process.platform =='win32')? '\\variants\\arduino_zero\\linker_scripts\\gcc\\flash_with_bootloader.ld' : '/variants/arduino_zero/linker_scripts/gcc/flash_with_bootloader.ld');
    }


    //Commands
    //OK
    this.getCompileCCmd = function(options, outdir, includepaths, cfile) {
        var cmd = [ this.getCompilerBinaryPath() + path.sep + this.getCCmd() ];

        var flags = this.getCFlags().split(" ");

        for(var i in flags)
            cmd.push(flags[i]);

        cmd.push("-mcpu="+options.device.build.mcu);

        cmd.push('-DF_CPU='+options.device.build.f_cpu);
        cmd.push('-DARDUINO=10705');
        cmd.push("-DARDUINO_"+options.device.build.board);
        cmd.push("-DARDUINO_ARCH_"+options.device.arch.toUpperCase());

        if(options.device.build.extra_flags) {
            var extraflags = options.device.build.extra_flags.split(" ");
            for (var i in extraflags)
                cmd.push(extraflags[i]);
        }

		if(options.verbosebuild)
            cmd.push('-w'); //'-Wall', //turn on verbose warnings
        if(options.device.build.vid)
            cmd.push('-DUSB_VID='+options.device.build.vid)
        if(options.device.build.pid)
            cmd.push('-DUSB_PID='+options.device.build.pid)

        cmd.push('-DUSBCON')

        if(options.device.build.usb_manifacturer)
            cmd.push('-DUSB_MANUFACTURER='+options.device.build.usb_manifacturer)
        else
            cmd.push('-DUSB_MANUFACTURER= ')

        if(options.device.build.usb_product)
            cmd.push('-DUSB_PRODUCT="'+options.device.build.usb_product+'"')
        else
            cmd.push('-DUSB_PRODUCT=')

        var cmsispaths = this.getCMISPath();
        for (var i in cmsispaths)
                cmd.push("-I" + cmsispaths[i]);

       

        includepaths.forEach(function(path){
            cmd.push("-I"+path);
        })

        cmd.push(cfile); //add the actual c file
        cmd.push('-o');
        var filename = cfile.substring(cfile.lastIndexOf( path.sep )+1);

        cmd.push(outdir + path.sep + filename+'.o');

        return cmd;
    }
    //OK
    this.getCompileCppCmd = function(options, outdir, includepaths, cfile) {
        var cmd = [ this.getCompilerBinaryPath() + path.sep + this.getCppCmd() ];

        var flags = this.getCppFlags().split(" ");

        for(var i in flags)
            cmd.push(flags[i])

        cmd.push("-mcpu="+options.device.build.mcu);

        cmd.push("-DF_CPU="+options.device.build.f_cpu);
        cmd.push("-DARDUINO=10705");
        cmd.push("-DARDUINO_"+options.device.build.board);
        cmd.push("-DARDUINO_ARCH_"+options.device.arch.toUpperCase());

        if(options.device.build.extra_flags) {
            var extraflags = options.device.build.extra_flags.split(" ");
            for (var i in extraflags)
                cmd.push(extraflags[i]);
        }

        if(options.verbosebuild)
            cmd.push('-w');
        if(options.device.build.vid)
            cmd.push('-DUSB_VID='+options.device.build.vid)
        if(options.device.build.pid)
            cmd.push('-DUSB_PID='+options.device.build.pid)

        cmd.push('-DUSBCON')

        if(options.device.build.usb_manifacturer)
            cmd.push('-DUSB_MANUFACTURER='+options.device.build.usb_manifacturer)
        else
            cmd.push('-DUSB_MANUFACTURER= ')

        if(options.device.build.usb_product)
            cmd.push('-DUSB_PRODUCT="'+options.device.build.usb_product+'"')
        else
            cmd.push('-DUSB_PRODUCT=')

		var cmsispaths = this.getCMISPath();
        for (var i in cmsispaths)
            cmd.push("-I" + cmsispaths[i]);

        

        includepaths.forEach(function(path){
            cmd.push('-I'+path);
        })

        cmd.push(cfile); //add the actual c++ file
        cmd.push('-o'); //output object file
        var filename = cfile.substring(cfile.lastIndexOf(path.sep)+1);
        var filename_cut = filename.substring(filename.lastIndexOf( path.sep )+1);
        cmd.push(outdir + path.sep + filename_cut+'.o');

        return cmd;
    }
    //OK
    this.getLinkCmd = function(options, file, outdir) {
        var linkCmd = [ this.getCompilerBinaryPath() + path.sep + this.getArCmd() ];

        var tmp = this.getArFlags().split(" ");
        for(var i in tmp)
            linkCmd.push(tmp[i])

        linkCmd.push( outdir + path.sep + 'core.a' );
        linkCmd.push( file );

        return linkCmd;
    }
    //OK
    this.getLinkElfCmd = function(options, libofiles, outdir) {
        //link everything into the .elf file
        var elfcmd = [ this.getCompilerBinaryPath() + path.sep + this.getCElfCmd()];

        var tmp = this.getCElfFlags().split(" ");
        for(var i in tmp)
            elfcmd.push(tmp[i])

        elfcmd.push("-save-temps");

        elfcmd.push("-mcpu="+options.device.build.mcu);

        elfcmd.push("-T" + this.getLdScript());
        elfcmd.push("-Wl,-Map," +  outdir + path.sep + options.name + ".cpp.map")
        elfcmd.push("-o");
        elfcmd.push(outdir + path.sep + options.name+".cpp.elf");
        elfcmd.push("--specs=nano.specs");
        elfcmd.push("-L"+ outdir);

        var elfFlags2 = options.platform.getCElfFlags2().split(" ");
        for(var i in elfFlags2)
            elfcmd.push(elfFlags2[i])

        elfcmd.push(outdir + path.sep + "syscalls.c.o");
        elfcmd.push(outdir + path.sep + options.name + ".cpp.o");
        elfcmd.push(outdir + path.sep + "core.a");

        elfcmd.push("-Wl,--end-group");
        elfcmd.push("-Wl,--section-start=.text=" + options.device.build.section_start);

        return elfcmd;
    }

    //TODO : in SAM ark this phase is not required. I delete it (remove from pattern) or leave it returns a blank cmd?
    this.getEEPROMCmd = function() {
        return ;
    }

    //OK
    this.getHexCmd = function(options, outdir) {
        var hexcmd = [ this.getCompilerBinaryPath() + path.sep + this.getElf2HexCmd() ];

        var hexflags = this.getElf2HexFlags().split(" ");

        for(var i in hexflags)
            hexcmd.push(hexflags[i])

        //TODO : what about .ccp ?
        hexcmd.push(outdir + path.sep + options.name+".cpp.elf");
        hexcmd.push(outdir + path.sep + options.name+".cpp.hex");

        return hexcmd;
    }
    //OK
    this.getBinCmd = function(options, outdir){
        var bincmd = [ this.getCompilerBinaryPath() + path.sep + this.getElf2HexCmd() ];

        var binflags = this.getElf2HexBinFlags().split(" ");

        for(var i in binflags)
            bincmd.push(binflags[i])

        bincmd.push(outdir + path.sep + options.name+".cpp.elf");
        bincmd.push(outdir + path.sep + options.name+".cpp.bin");

        return bincmd;
    }

    this.getUploadCmd = function(hexfile, options, outdir){
		if(options.device.upload.native_usb)
		{	
			//Native Usb Case       
			var uploadcmd = [
				this.getAvrDudeBinary(),
				'-C'+this.getAvrDudeConf()
			];

			//if(options.verboseupload)
				uploadcmd.push('-v','-v');

			uploadcmd.push( '-p'+options.device.build.emu_mcu,
							'-c'+options.device.upload.protocol,
							'-P'+options.port,
							'-b'+options.device.upload.speed,
							'-Uflash:w:'+hexfile+':i');
		}
		else
		{
			//Programming Port Case
			var uploadcmd = [
				this.getOpenOcd(),
				"-s",
				this.getOpenOcdScripts(),
				"-f",
				"../../../../../arduino/samd/variants/"+options.device.build.variant+"/"+options.device.build.openocdscript,
				"-c",
				"program {{"+ outdir + path.sep + options.name + ".cpp.bin}} verify " + options.device.build.section_start + " reset exit"
				];
		}
		
        return uploadcmd;
    }
    /* New Functionalities */
	
	//TEST
	this.getOpenOcd = function(){
		return this.root+((process.platform =='win32')? '\\hardware\\tools\\OpenOCD-0.9.0-arduino\\bin\\openocd.exe' : '/hardware/tools/OpenOCD-0.9.0-arduino/bin/openocd');
	}
	
	//TEST
	this.getOpenOcdScripts = function(){
		return this.root+((process.platform =='win32')? '\\hardware\\tools\\OpenOCD-0.9.0-arduino\\share\\openocd\\scripts' : '/hardware/tools/OpenOCD-0.9.0-arduino/share/openocd/scripts');
	}
}


var _default = new Platform();
_default.init = function(device) {
    this.device = device;
    return this;
}



exports.getDefaultPlatform = function() {
    return _default;
}

exports.getSettings = function() {
    var cln = {};
    for(var name in settings) {
        cln[name] = settings[name];
    }
    cln.user_sketches_dir = exports.getDefaultPlatform().getUserSketchesDir();
    return cln;
}

exports.setSettings = function(newset, cb) {
    console.log("WRITING SETTINGS ",SETTINGS_FILE);
    console.log("new settings = ", newset);
    fs.writeFile(SETTINGS_FILE,JSON.stringify(newset,null,'  '), function(e) {
        console.log("done writing",e);
        settings = newset;
        cb();
    })
}

var SETTINGS_FILE = __dirname+"/settings.json";

exports.loadSettings = function() {
    console.log("LOADING SETTINGS",SETTINGS_FILE);
    if(!fs.existsSync(SETTINGS_FILE)) return;
    var json = fs.readFileSync(SETTINGS_FILE);
    try {
        var ext_settings = JSON.parse(json);
        console.log('ext settings = ',ext_settings);
        console.log("settings",settings);
        for(var name in ext_settings) {
            settings[name] = ext_settings[name];
        }
        console.log("settings",settings);
    } catch (e) {
        console.log("error loading the settings",e);
    }
}

//exports.loadSettings();