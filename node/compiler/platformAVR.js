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

    this.useSerial = function() {
        return true;
    }

    this.getUserHome = function() {
        return process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
    }

    this.getReposPath = function() {
        return this.getUserHome()+((process.platform =='win32')? "\\AppData\\Roaming\\Brackets\\extensions\\user" : "/Library/Applicant Support/Brackets/extensions/user");
        //TODO linux case
    }

    this.verifyUserSketchesDir = function() {
        var dir = this.getUserSketchesDir();
        if(!fs.existsSync(dir)) {
            fs.mkdirSync(dir);
        }
    }

    this.getUserSketchesDir = function() {
        //TODO linux case
        //return this.getUserHome() + '/Sketchbook';

        return this.getUserHome()+((process.platform =='win32') ? '\\Documents\\Arduino' : "/Documents/Arduino");
    }

    this.getUserLibraryDir = function() {
        return this.getUserSketchesDir()+((process.platform =='win32')? '\\libraries' : "/libraries");
    }

    this.root = nodeDir.substring(0, nodeDir.lastIndexOf(path.sep));

    this.getStandardLibraryPath = function() {
        return this.root+((process.platform =='win32')? '\\libraries' : "/libraries");
    }

	this.getCorePath = function(opt) {
        return this.root+((process.platform =='win32')? '\\hardware\\arduino\\' : '/hardware/arduino/')+opt.device.arch+((process.platform =='win32')? '\\cores\\' : '/cores/')+opt.device.build.core;
    }

	this.getVariantPath = function(opt) {
        return this.root+((process.platform =='win32')? '\\hardware\\arduino\\' : '/hardware/arduino/')+opt.device.arch+((process.platform =='win32')? '\\variants\\' : '/variants/')+opt.device.build.variant;
    }

    this.getCompilerBinaryPath = function() {
        return this.root+((process.platform =='win32')? '\\hardware\\tools\\avr\\bin' : '/hardware/tools/avr/bin');
    }

    this.getAvrDudeBinary = function() {
        // ALTERNATIVES //
        //return this.getCompilerBinaryPath()+((process.platform =='win32')? '\\avrdude' : '/avrdude');
        return this.root+((process.platform =='win32')? '\\hardware\\tools\\avr\\bin\\avrdude' : '/hardware/tools/avr/bin/avrdude');
    }

    this.getAvrDudeConf = function() {
        return this.root+((process.platform =='win32')? '\\hardware\\tools\\avr\\etc\\avrdude.conf' : '/hardware/tools/avr/etc/avrdude.conf');
    }

    this.isInstalled = function() {
        return fs.exists(this.root, null);
    }

/* New Functionalities */

    this.getPattern = function() {
        return JSON.parse('{ "archives": true, "combine": true, "eep": true, "bin": false,"hex": true}' );
    };

    this.getCCmd = function(){
        return "avr-gcc";
    };

    this.getCElfCmd = function(){
        return "avr-gcc";
    };

    this.getCppCmd = function(){
        return "avr-g++";
    };

    this.getArCmd = function(){
        return "avr-ar";
    };

    this.getObjcopyCmd = function(){
        return "avr-objcopy";
    };

    this.getElf2HexCmd = function(){
        return "avr-objcopy";
    };


    this.getCFlags = function(){
        return "-c -g -Os -w -ffunction-sections -fdata-sections -MMD";
    };

    this.getCppFlags = function(){
        return "-c -g -Os -w -fno-exceptions -ffunction-sections -fdata-sections -fno-threadsafe-statics -MMD";
    };

    this.getCElfFlags = function(){
        return "-w -Os -Wl,--gc-sections";
    };

    this.getSFlags = function(){
        return "-c -g -x assembler-with-cpp"
    };

    this.getArFlags = function(){
        return "rcs";
    };

    this.getObjcopyEepFlags = function(){
        return "-O ihex -j .eeprom --set-section-flags=.eeprom=alloc,load --no-change-warnings --change-section-lma .eeprom=0";
    };

    this.getElf2HexFlags = function(){
        return "-O ihex -R .eeprom";
    };

    /* New Functionalities */


    this.getCompileCppCmd = function(options, outdir, includepaths, cfile) {
        var cmd = [ this.getCompilerBinaryPath() + path.sep + this.getCppCmd() ];

        var flags = this.getCppFlags().split(" ");

        for(var i in flags)
            cmd.push(flags[i])

        cmd.push("-mmcu="+options.device.build.mcu);

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

    this.getCompileCCmd = function(options, outdir, includepaths, cfile) {
        var cmd = [ this.getCompilerBinaryPath() + path.sep + this.getCCmd() ];

        var flags = this.getCFlags().split(" ");

        for(var i in flags)
            cmd.push(flags[i]);

        cmd.push("-mmcu="+options.device.build.mcu);

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

        includepaths.forEach(function(path){
            cmd.push("-I"+path);
        })

        cmd.push(cfile); //add the actual c file
        cmd.push('-o');
        var filename = cfile.substring(cfile.lastIndexOf( path.sep )+1);

        cmd.push(outdir + path.sep + filename+'.o');

        return cmd;
    }

    this.getLinkCmd = function(options, file, outdir) {
       var linkCmd = [ this.getCompilerBinaryPath() + path.sep + this.getArCmd() ];

        var tmp = this.getArFlags().split(" ");

        for(var i in tmp)
            linkCmd.push(tmp[i])

        linkCmd.push( outdir + path.sep + 'core.a' );
        linkCmd.push( file );

        return linkCmd;
    }

    this.getLinkElfCmd = function(options, libofiles, outdir) {
        //link everything into the .elf file
        var elfcmd = [ this.getCompilerBinaryPath() + path.sep + this.getCElfCmd()];

        var tmp = this.getCElfFlags().split(" ");

        for(var i in tmp)
            elfcmd.push(tmp[i])

		elfcmd.push("-mmcu="+options.device.build.mcu);
        elfcmd.push("-o");
        elfcmd.push(outdir + path.sep + options.name+".cpp.elf");
        elfcmd.push(outdir + path.sep + options.name+".cpp.o");


        elfcmd = elfcmd.concat(libofiles);
        elfcmd = elfcmd.concat([
            outdir + path.sep + "core.a",
            "-L"+outdir,
            "-lm",
        ]);

        return elfcmd;
    }

    this.getEEPROMCmd = function(options, outdir) {
        var eepcmd = [ this.getCompilerBinaryPath() + path.sep + this.getObjcopyCmd() ];

        var tmp = this.getObjcopyEepFlags().split(" ");

        for(var i in tmp)
            eepcmd.push(tmp[i])

        eepcmd.push( outdir + path.sep + options.name+".cpp.elf");
        eepcmd.push( outdir + path.sep + options.name+".cpp.eep");
        return eepcmd;
    }

    this.getHexCmd = function(options, outdir) {
        var hexcmd = [ this.getCompilerBinaryPath() + path.sep + this.getElf2HexCmd() ];

        var hexflags = this.getElf2HexFlags().split(" ");

        for(var i in hexflags)
            hexcmd.push(hexflags[i])

        hexcmd.push(outdir + path.sep + options.name+".cpp.elf");
        hexcmd.push(outdir + path.sep + options.name+".cpp.hex");

        hexFile = hexcmd[hexcmd.length-1];

        return hexcmd;
    }

    this.getUploadCmd = function(hexfile, options, outdir){
        if(options.platform.useSerial()) {
            var uploadcmd = [
                this.getAvrDudeBinary(),    	//[ /hardware/tools/avr/bin/avrdude]
                '-C'+this.getAvrDudeConf(),		//[ /hardware/tools/avr/etc/avrdude.conf]
                '-v', //'-v','-v', '-v', //super verbose
                '-p'+options.device.build.mcu,
                '-c'+options.device.upload.protocol,
                '-P'+options.port,
                '-b'+options.device.upload.speed,
                '-D', //don't erase
                '-Uflash:w:'+hexfile+':i'
            ];

            //if(options.verboseupload)
            //    cmd.push('-v','-v','-v', '-v');

        } else {
            var uploadcmd = [
                this.getAvrDudeBinary(),
                '-C'+this.getAvrDudeConf(),
                '-c',options.platform.getProgrammerId(),//'usbtiny',
                '-p',options.device.build.mcu,//'attiny85',
                '-Uflash:w:'+hexfile,
            ];
        }
        return uploadcmd;
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