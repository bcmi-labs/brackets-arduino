/**
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

var nodeDir = __dirname.substring(0, __dirname.lastIndexOf("\\"));
var nodeDir2 = __dirname.substring(0, __dirname.lastIndexOf((process.platform == 'win32') ? '\\' : '/'));
var nodeDir3 = __dirname.substring(0, __dirname.lastIndexOf(path.sep));

var settings = {
    datapath:  nodeDir+((process.platform == 'win32') ? "\\node_modules\\arduinodata\\libraries" : "/node_modules/arduinodata/libraries" ), //"/node_modules/arduinodata/libraries",
    boardpath: nodeDir+"/node_modules/arduinodata/boards",
	programmerspath: nodeDir+"/node_modules/arduinodata/programmers",
    sketchtemplate: "sketchtemplate.ino"
};

console.log("DIRNAME : "+__dirname);
console.log("NODE DIR 1 : "+ nodeDir);
console.log("NODE DIR 2 : "+ nodeDir2);
console.log("SEPARATOR : "+ path.sep);
console.log("NODE DIR 3 : "+ nodeDir3);
console.log("SETTINGS TEST " +JSON.stringify(settings));

function Platform() {
    this.os = process.platform;

    this.useSerial = function() {
        return true;
    }

    this.getUserHome = function() {
        return process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
    }

    this.getReposPath = function() {
        if(this.os == 'darwin')
            return this.getUserHome() + '/Library/Applicant Support/Brackets/extensions/user';
        else if(this.os == 'win' || this.os == 'win32' || this.os == 'win64')
                return this.getUserHome() + '/AppData/Roaming/Brackets/extensions/user';
        //TODO linux case
    }

    this.verifyUserSketchesDir = function() {
        var dir = this.getUserSketchesDir();
        if(!fs.existsSync(dir)) {
            fs.mkdirSync(dir);
        }
    }

    this.getUserSketchesDir = function() {
        if(settings.user_sketches_dir) return settings.user_sketches_dir;
        if(this.os == 'darwin') {
            return this.getUserHome()+'/Documents/Arduino';
        }
        if(this.os == 'win' || this.os == 'win32' || this.os == 'win64') {
            return this.getUserHome()+'/Documents/Arduino';
        }
        //TODO linux case
        //return this.getUserHome() + '/Sketchbook';
    }

    this.getUserLibraryDir = function() {

        return this.getUserSketchesDir() + '/libraries';
    }

    //this.root = this.getReposPath();
    this.root = nodeDir.substring(0, nodeDir.lastIndexOf("\\"));

    this.getStandardLibraryPath = function() {
        return this.root + '/libraries';
    }

    this.getCorePathOLD = function() {
        return this.root + '/hardware/arduino/cores/'+this.device.build.core;
    }

	this.getCorePath = function(opt) {
        return this.root + '/hardware/arduino/'+opt.device.arch+'/cores/'+opt.device.build.core;
    }

    this.getVariantPathOLD = function() {
        return this.root + '/hardware/arduino/variants/'+this.device.build.variant;
    }

	this.getVariantPath = function(opt) {
		//var ark = opt.device.build.board.substring(0,opt.device.build.board.indexOf("_")).toLowerCase();
        return this.root + '/hardware/arduino/'+opt.device.arch+'/variants/'+opt.device.build.variant;
    }

    this.getCompilerBinaryPath = function() {
        return this.root + '/hardware/tools/avr/bin';
    }

    this.getAvrDudeBinary = function() {
        if(this.os == 'linux') {
            return this.root + '/hardware/tools/avrdude';
        }
        return this.root + '/hardware/tools/avr/bin/avrdude';
    }

    this.getAvrDudeConf = function() {
        if(this.os == 'linux') {
            return this.root + '/hardware/tools/avrdude.conf';
        }
        return this.root + '/hardware/tools/avr/etc/avrdude.conf';
    }

    this.isInstalled = function() {
        return fs.exists(this.root, null);
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

exports.getPlatform = function(device) {
    if(device.id == 'digispark-pro') return Object.create(_digispark_pro).init(device);
    if(device.id == 'digispark-tiny') return Object.create(_digispark_pro).init(device);
    if(device.id == 'trinket3') return Object.create(_trinket3).init(device);
    if(device.id == 'trinket5') return Object.create(_trinket3).init(device);
    if(device.id == 'gemma') return Object.create(_trinket3).init(device);
    if(device.id == 'flora') return Object.create(_flora).init(device);
    return Object.create(_default).init(device);
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