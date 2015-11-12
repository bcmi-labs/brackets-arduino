/*
 *  BASED ON
 *  https://github.com/joshmarinacci/ElectronIDE
 *  BY Josh Marinacci
 *
 *  MODIFIED BY Arduino.org Team
 */


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
        return this.root+((process.platform =='win32')? '\\hardware\\tools\\samd\\bin' : '/hardware/tools/samd/bin');
    }

    this.getBossac = function() {
        return this.root + path.sep + "hardware" + path.sep + "tools" + path.sep + ((process.platform =='win32') ? "bossac.exe" : "bossac");
    }


    this.isInstalled = function() {
        return fs.exists(this.root, null);
    }


    this.getCMISPath = function(opt){
        var systemPath = this.root + path.sep + "hardware" + path.sep + "arduino" + path.sep + opt.device.arch + path.sep + "system";

        return [ systemPath + path.sep + "CMSIS" + path.sep + "CMSIS" + path.sep + "Include" + path.sep ,
            systemPath + path.sep + "CMSIS" + path.sep + "Device" + path.sep + "ATMEL" + path.sep
        ]

    }


    this.getPattern = function() {
        return JSON.parse('{ "c": true, "cpp": true, "archives": true, "combine": true, "eeprom":false, "bin": true, "hex": false}' );
    };


    this.getCCmd = function(){
        return "arm-none-eabi-gcc";
    };


    this.getCElfCmd = function(){
        return "arm-none-eabi-gcc";
    };


    this.getCppCmd = function(){
        return "arm-none-eabi-g++";
    };


    this.getArCmd = function(){
        return "arm-none-eabi-ar";
    };


    this.getObjcopyCmd = function(){
        return "arm-none-eabi-objcopy";
    };


    this.getElf2HexCmd = function(){
        return "arm-none-eabi-objcopy";
    };


    this.getCFlags = function(){
        return "-c -g -Os -w -ffunction-sections -fdata-sections -nostdlib --param max-inline-insns-single=500 -Dprintf=iprintf -MMD";
    };


    this.getCppFlags = function(){
        return "-c -g -Os -w -ffunction-sections -fdata-sections -nostdlib -fno-threadsafe-statics --param max-inline-insns-single=500 -fno-rtti -fno-exceptions -Dprintf=iprintf -MMD";
    };


    this.getCElfFlags = function(){
        return "-Os -Wl,--gc-sections";
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
        return "-O binary";
    };


    this.getCElfFlags2 = function (){
        return "-mthumb -Wl,--cref -Wl,--check-sections -Wl,--gc-sections -Wl,--entry=Reset_Handler -Wl,--unresolved-symbols=report-all -Wl,--warn-common -Wl,--warn-section-align -Wl,--warn-unresolved-symbols -Wl,--start-group";
    }

    this.getLdScript = function(){
        return this.root+((process.platform =='win32')? '\\hardware\\arduino\\sam' : '/hardware/arduino/sam')+((process.platform =='win32')? '\\variants\\arduino_due_x\\linker_scripts\\gcc\\flash.ld' : '/variants/arduino_due_x/linker_scripts/gcc/flash.ld');
    }

    this.getLibSamC = function (opt){
        var systemPath = this.root + path.sep + "hardware" + path.sep + "arduino" + path.sep + opt.device.arch + path.sep + "system";
        return systemPath + path.sep + "libsam";
    }


    this.getLibsamElf = function (opt){
        return this.getVariantPath(opt) + path.sep + "libsam_sam3x8e_gcc_rel.a";
    }


    //Commands

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

        if(options.device.build.vid)
            cmd.push('-DUSB_VID='+options.device.build.vid)
        if(options.device.build.pid)
            cmd.push('-DUSB_PID='+options.device.build.pid)

        cmd.push('-DUSBCON')

        if(options.device.build.usb_manifacturer)
            cmd.push('-DUSB_MANUFACTURER='+options.device.build.usb_manifacturer)
        else
            cmd.push('-DUSB_MANUFACTURER=Unknown')

        if(options.device.build.usb_product)
            cmd.push('-DUSB_PRODUCT="'+options.device.build.usb_product+'"')
        else
            cmd.push('-DUSB_PRODUCT=')


        cmd.push("-I"+this.getLibSamC(options))


        if(options.verbosebuild);
        //cmd.push('-w'); //'-Wall', //turn on verbose warnings

        var cmsispaths = this.getCMISPath(options);
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

        if(options.device.build.vid)
            cmd.push('-DUSB_VID='+options.device.build.vid)
        if(options.device.build.pid)
            cmd.push('-DUSB_PID='+options.device.build.pid)

        cmd.push('-DUSBCON')

        if(options.device.build.usb_manifacturer)
            cmd.push('-DUSB_MANUFACTURER='+options.device.build.usb_manifacturer)
        else
            cmd.push('-DUSB_MANUFACTURER=Unknown ')

        if(options.device.build.usb_product)
            cmd.push('-DUSB_PRODUCT="'+options.device.build.usb_product+'"')
        else
            cmd.push('-DUSB_PRODUCT=')







        cmd.push("-I"+this.getLibSamC(options))



        if(options.verbosebuild);
        //cmd.push('-w');


        var cmsispaths = this.getCMISPath(options);
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

        elfcmd.push("-mcpu="+options.device.build.mcu);

        elfcmd.push("-T" + this.getLdScript());
        elfcmd.push("-Wl,-Map," +  outdir + path.sep + options.name + ".cpp.map")
        elfcmd.push("-o");
        elfcmd.push(outdir + path.sep + options.name+".cpp.elf");
        elfcmd.push("-L"+ outdir);

        var elfFlags2 = options.platform.getCElfFlags2().split(" ");
        for(var i in elfFlags2)
            elfcmd.push(elfFlags2[i])

        elfcmd.push(outdir + path.sep + "syscalls_sam3.c.o");
        elfcmd.push(outdir + path.sep + options.name + ".cpp.o");

        elfcmd.push(outdir + path.sep + "variant.cpp.o");

        elfcmd.push(this.getLibsamElf(options));

        elfcmd.push(outdir + path.sep + "core.a");
        elfcmd.push("-Wl,--end-group");
        elfcmd.push("-lm");
        elfcmd.push("-gcc");

        return elfcmd;
    }



    this.getBinCmd = function(options, outdir){
        var bincmd = [ this.getCompilerBinaryPath() + path.sep + this.getElf2HexCmd() ];

        var binflags = this.getElf2HexFlags().split(" ");

        for(var i in binflags)
            bincmd.push(binflags[i])

        bincmd.push(outdir + path.sep + options.name+".cpp.elf");
        bincmd.push(outdir + path.sep + options.name+".cpp.bin");

        return bincmd;
    }


    this.getUploadCmd = function(hexfile, options, outdir){
        var uploadcmd = [
            this.getBossac()
        ];

        //if(options.verboseupload)
        uploadcmd.push("-i","-d");

        uploadcmd.push( "--port=" + options.port.split(path.sep).pop(),
            "--force_usb_port="+ options.device.upload.native_usb,
            "-e",
            "-w",
            "-v",
            "-b",
            outdir + path.sep + options.name+".cpp.bin",
            "-R"
        );

        return uploadcmd;
    }

    /* New Functionalities */


    this.getOpenOcd = function(){
        return this.root+((process.platform =='win32')? '\\hardware\\tools\\OpenOCD-0.9.0-arduino\\bin\\openocd.exe' : '/hardware/tools/OpenOCD-0.9.0-arduino/bin/openocd');
    }


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