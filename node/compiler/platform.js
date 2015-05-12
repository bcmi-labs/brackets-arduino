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
}


var _default = new Platform();
_default.init = function(device) {
    this.device = device;
    return this;
}



exports.getDefaultPlatform = function() {
    return _default;
}

/*
exports.getPlatform = function(device) {
    if(device.id == 'digispark-pro') return Object.create(_digispark_pro).init(device);
    if(device.id == 'digispark-tiny') return Object.create(_digispark_pro).init(device);
    if(device.id == 'trinket3') return Object.create(_trinket3).init(device);
    if(device.id == 'trinket5') return Object.create(_trinket3).init(device);
    if(device.id == 'gemma') return Object.create(_trinket3).init(device);
    if(device.id == 'flora') return Object.create(_flora).init(device);
    return Object.create(_default).init(device);
}
*/

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