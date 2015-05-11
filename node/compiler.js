(function () {
    "use strict";

    var fs              = require('fs'),
        async           = require('async'),
        wrench          = require('wrench'),
        os              = require('os'),
        child_process   = require('child_process');

    var uploader        = require('./compiler/uploader');
    var platform        = require('./compiler/platform');
    //var boards          = require('./compiler/boards').loadBoards();
    var LIBRARIES       = require('./compiler/libraries');

    var domainName = "org-arduino-ide-domain-compiler";
    var t_options = {userlibs: platform.getSettings().userlibs};

    var dm, upPort, upBoard, prg = "arduino";

    var standardLibraryPath =__dirname+'/libraries';
    var corePathsAVR = __dirname+'/hardware/arduino/avr/cores/arduino';
    var CorePath = __dirname+'/hardware/arduino/avr/cores/arduino';
    var variantPathsAVR = __dirname+"/hardware/arduino/avr/variants/";

    var hexFile;

    String.prototype.endsWith = function(suffix) {
        return this.indexOf(suffix, this.length - suffix.length) !== -1;
    };
    String.prototype.startsWith = function(suffix) {
        return this.indexOf(suffix) == 0;
    };

    function checkfile(path) {
        if(!fs.existsSync(path)) throw new Error("file not found " + path);
    }

    function detectLibs(code) {
        var libs = [];
        var lines = code.split('\n');
        lines.forEach(function(line){
            var re = /\s*#include\s*[<"](\w+)\.h[>"]/i;
            var res = line.match(re);
            if(res) libs.push(res[1]);
        });
        return libs;
    }

    var FUNCTION_DEFINITION_REGEX =  /(unsigned )*\s*(void|short|long|char|int)\s+(\w+)\((.*)\)/;

    function generateDecs(code) {
        var decs = [];
        code.split('\n').forEach(function(line) {
            var def = line.match(FUNCTION_DEFINITION_REGEX);
            if(def) {
                var dec = def[1]+' '+def[2]+'('+def[3]+');\n';
                decs.push(def[0]+';\n');
            }
        });

        return decs;
    }

    function generateCPPFile(cfile,sketchPath) {
        //write the standard header
        fs.writeFileSync(cfile,'#include "Arduino.h"\n');

        var funcdecs = [];
        var codes = [];

        //loop through all sketch files
        fs.readdirSync(sketchPath).forEach(function(file){
            if(file.toLowerCase().endsWith('.ino')) {
                var code = fs.readFileSync(sketchPath+'\\'+file).toString();
                generateDecs(code).forEach(function(dec){
                    funcdecs.push(dec);
                });
                codes.push(code);
            }
        })


        //insert the generated definitions
        funcdecs.forEach(function(dec){
            fs.appendFileSync(cfile,dec);
        });

        //insert the code chunks
        codes.forEach(function(def){
            fs.appendFileSync(cfile,def);
        });

        //extra newline just in case
        fs.appendFileSync(cfile,"\n");

        dm.emitEvent (domainName, "console-log", "CPP File Created ["+cfile+"]");
    }

    function calculateLibs(list, paths, libs, debug, cb, plat) {
        LIBRARIES.install(list,function() {
            //install libs if needed, and add to the include paths
            list.forEach(function(libname){
                if(libname == 'Arduino') return; //already included, skip it
                debug('scanning lib',libname);
                if(LIBRARIES.isUserLib(libname,plat)) {
                    console.log("it's a user lib");
                    var lib = LIBRARIES.getUserLib(libname,plat);
                    lib.getIncludePaths(plat).forEach(function(path) {
                        paths.push(path);
                    });
                    libs.push(lib);
                    return;
                }

                var lib = LIBRARIES.getById(libname.toLowerCase());
                if(!lib) {
                    debug("ERROR. couldn't find library",libname);
                    throw new Error("Missing Library! " + libname);
                }
                if(!lib.isInstalled()) {
                    throw new Error("library should already be installed! " + libname);
                }
                debug("include path = ",lib.getIncludePaths(plat));
                lib.getIncludePaths(plat).forEach(function(path) { paths.push(path); });
                libs.push(lib);
                if(lib.dependencies) {
                    console.log("deps = ",lib.dependencies);
                    lib.dependencies.map(function(libname) {
                        return LIBRARIES.getById(libname);
                    }).map(function(lib){
                        console.log("looking at lib",lib);
                        debug("include path = ",lib.getIncludePaths(plat));
                        lib.getIncludePaths(plat).forEach(function(path) { paths.push(path); });
                        libs.push(lib);
                    })
                }
            });

            if(cb) cb();
        });
    }

    function listdir(path) {
        return fs.readdirSync(path)
            .filter(function(file) {
                if(file.startsWith('.')) return false;
                return true;
            })
            .map(function(file) {
                return path+'/'+file;
            });
    }

    function exec(cmd, cb, debug) {
        var result = child_process.execFile(
            cmd[0],
            cmd.slice(1),
            function(error, stdout, stderr) {
                if(error) {
                    console.log(error);
                    console.log("code = ",error.code);
                    console.log(cmd.join(" "));
                    console.log(stdout);
                    console.log(stderr);
                    var err = new Error("there was a problem running " + cmd.join(" "));
                    err.cmd = cmd;
                    err.output = stdout + stderr;
                    if(debug) debug(err);
                    cb(err);
                    return;
                }
                if(cb) cb();
            }
        );
    }

    function linkFile(options, file, outdir, cb, debug) {
        var cmd = [
            options.platform.getCompilerBinaryPath()+'/avr-ar',
            'rcs',
            outdir+'/core.a',
            file,
        ];
        exec(cmd, cb, debug);
        var filename = file.split("/");

        dm.emitEvent (domainName, "console-log", filename[filename.length-1]+" linked to core.a");
    }

    function linkElfFile(options, libofiles, outdir, cb, debug) {
        //link everything into the .elf file
        var elfcmd = [
            options.platform.getCompilerBinaryPath()+'/avr-gcc', //gcc
            '-Os', //??
            '-Wl,--gc-sections', //not using relax yet
            '-mmcu='+options.device.build.mcu, //the mcu, ex: atmega168
            '-o', //??
            outdir+'/'+options.name+'.cpp.elf',
            outdir+'/'+options.name+'.cpp.o',
        ];

        elfcmd = elfcmd.concat(libofiles);
        elfcmd = elfcmd.concat([
            outdir+'/core.a',
            '-L'+outdir,
            '-lm',
        ]);


        exec(elfcmd, cb, debug);

        dm.emitEvent (domainName, "console-log", options.name+ ".cpp.elf linked to core.a");
    }

    function extractEEPROMData(options, outdir, cb, debug) {
        var eepcmd = [
            options.platform.getCompilerBinaryPath()+'/avr-objcopy',
            '-O',
            'ihex',
            '-j',
            '.eeprom',
            '--set-section-flags=.eeprom=alloc,load',
            '--no-change-warnings',
            '--change-section-lma',
            '.eeprom=0',
            outdir+'/'+options.name+'.cpp.elf',
            outdir+'/'+options.name+'.eep',
        ];

        exec(eepcmd, cb, debug);
    }

    function buildHexFile(options, outdir, cb, debug) {
        var hexcmd = [
            options.platform.getCompilerBinaryPath()+'/avr-objcopy',
            '-O',
            'ihex',
            '-R',
            '.eeprom',
            outdir+'/'+options.name+'.cpp.elf',
            outdir+'/'+options.name+'.cpp.hex',
        ];
        hexFile = hexcmd[hexcmd.length-1];
        exec(hexcmd, cb, debug);
        dm.emitEvent (domainName, "console-log", options.name+ ".hex builded");
    }

    function processList(list, cb, publish) {
        if(list.length <= 0) {
            cb();
            return;
        }
        var item = list.shift();
        try {
            item(function(err) {
                console.log("--------------------");
                if(err) return cb(err);
                processList(list,cb, publish);
            });
        } catch(err) {
            console.log("there was an error");
            console.log(err.toString());
            console.log("publish = ", publish);
            publish({
                type:'error',
                message:err.toString(),
                path:err.path,
                errno: err.errno,
                code: err.code
            });
        }
    }

    function publishEvent(mex){
        //console.log("EVENT : " + JSON.stringify(mex));
    }

    function finalEvent(){
        console.log("---> final cb <---");
    }



    function compile(options, sketchDir, up) {
        console.log("I'm Compiler and I'm wearing my sunglasses");
        dm.emitEvent (domainName, "console-log", "Start Building");
        var BUILD_DIR       = os.tmpdir(),   // Right ???
            userSketchesDir = BUILD_DIR;

        //var sketch = ino[1].split(".")[0];
        //t_options.name = sketch;


        platform;

        //TEMPORANEAMENTE DISATTIVATO
        //t_options.device.upload.protocol = prg;

        var outdir = BUILD_DIR + '/' + 'build' + new Date().getTime();
        //var options = t_options;
        //var options = "";

        //options.name = sketch;
        //options.device = brackets.arduino.options.target.board;
        options.platform = platform.getDefaultPlatform(); //TODO  <--------- get the correct platform

        //var sketchDir = ino[0];
        var sketchPath = sketchDir;
        var finalcb = finalEvent;
        var publish = publishEvent;

        console.log("compiling to");
        console.log("sketchpath ", sketchPath);
        console.log("outdir = ", outdir);
        //console.log("options = ", options);
        console.log("sketchdir = ", sketchDir);

        var errorHit = false;


        function debug(message) {
            var args = Array.prototype.slice.call(arguments);
            console.log("message = " + message + args.join(" ")+'\n');
            if(message instanceof Error) {
                errorHit = true;
                publish({type:'error', message: args.join(" ") + message.output});
            } else {
                //publish({type:"compile", message:args.join(" ")});
                publish("debug  :" + args.join(" ") + "");
            }
        }

//Temp        checkfile(options.platform.getCompilerBinaryPath());
        debug("compiling ",sketchPath,"to dir",outdir);
        debug("root sketch dir = ",sketchDir);

        wrench.rmdirSyncRecursive(outdir, true);
        wrench.mkdirSyncRecursive(outdir);
//    wrench.mkdirSyncRecursive(sketchPath);

        debug("assembling the sketch in the directory\n",outdir);
        checkfile(outdir);


        var tasks = [];

        var cfile = outdir + '/' + options.name + '.cpp';
        var cfiles = [];
        var includepaths = [];
        var libextra = [];
        var plat = options.platform;

        //generate the CPP file and copy all files to the output directory
        tasks.push(function(cb) {
            debug("generating",cfile);

            generateCPPFile(cfile,sketchPath);

            cfiles.push(cfile);
            //compile sketch files
            function copyToDir(file, indir, outdir) {
                console.log("copying ",file);
                var text = fs.readFileSync(indir+'\\'+file);
                fs.writeFileSync(outdir+'\\'+file,text);
            }

            fs.readdirSync(sketchDir).forEach(function(file) {
                if(file.toLowerCase().endsWith('.h')) copyToDir(file,sketchDir,sketchPath);
                if(file.toLowerCase().endsWith('.cpp')) copyToDir(file,sketchDir,sketchPath);
                cfiles.push(sketchPath+'/'+file);
            });

            if(cb) cb();
        });

        // scan for the included libs make sure they are all installed collect their include paths
        tasks.push(function(cb) {

            var includedLibs = detectLibs(fs.readFileSync(cfile).toString());
            debug('========= scanned for included libs',includedLibs);

            //assemble library paths
            var librarypaths = [];
            //global libs

            debug("standard arduino libs = ",options.platform.getStandardLibraryPath());
            fs.readdirSync(options.platform.getStandardLibraryPath()).forEach(function(lib) {
                librarypaths.push(options.platform.getStandardLibraryPath()+'/'+lib);
            });

            //includepaths.push(corePathsAVR);
            includepaths.push(options.platform.getCorePath(options));

            //includepaths.push(variantPathsAVR);
            includepaths.push(options.platform.getVariantPath(options));

            includepaths.push(sketchDir);

            console.log("include path =",includepaths);
            console.log("includedlibs = ", includedLibs);
            calculateLibs(includedLibs,includepaths,libextra, debug, cb, plat);
        });

        //actually compile code
        tasks.push(function(cb) {
            console.log("moving on now");
            debug("include paths = ", JSON.stringify(includepaths,null, '   '));
            debug("using 3rd party libraries",libextra.map(function(lib) { return lib.id }).join(', '));
            compileFiles(options,outdir,includepaths,cfiles,debug, cb);
        });

        //compile the 3rd party libs
        /* DA RIVEDERE GLI IMPORT DELLE LIBRERIE */
        tasks.push(function(cb) {
            debug("compiling 3rd party libs");
            async.map(libextra, function(lib,cb) {
                debug('compiling library: ',lib.id);
                var paths = lib.getIncludePaths(plat);
                var cfiles = [];
                paths.forEach(function(path) {
                    wrench.readdirSyncRecursive(path)
                        .filter(function(filename) {
                            if(filename.startsWith('examples/')) return false;
                            if(filename.toLowerCase().endsWith('.c')) return true;
                            if(filename.toLowerCase().endsWith('.cpp')) return true;
                            return false;
                        })
                        .forEach(function(filename) {
                            cfiles.push(path+'/'+filename);
                        })
                    ;
                });
                debug('cfiles',cfiles);
                compileFiles(options, outdir, includepaths, cfiles, debug,cb);
            },cb);
        });

        //compile core
        tasks.push(function(cb) {
            debug("compiling core files");
            var cfiles = listdir(options.platform.getCorePath(options));
            compileFiles(options,outdir,includepaths,cfiles,debug,cb);
        });

        //link everything into core.a
        tasks.push(function(cb) {
            var dfiles = listdir(outdir)
                .filter(function(file){
                    if(file.endsWith('.d')) return false;
                    return true;
                });
            async.mapSeries(dfiles, function(file, cb) {
                debug("linking",file);
                linkFile(options,file,outdir, cb, debug);
            }, cb);
        });

        //build the elf file
        tasks.push(function(cb) {
            debug("building elf file");
            var libofiles = [];
            libextra.forEach(function(lib) {
                var paths = lib.getIncludePaths(plat);
                paths.forEach(function(path) {
                    listdir(path).filter(function(file) {
                        if(file.endsWith('.cpp')) return true;
                        return false;
                    }).map(function(filename) {
                        libofiles.push(outdir+'/'+filename.substring(filename.lastIndexOf('/')+1) + '.o');
                    });
                });
            });

            linkElfFile(options,libofiles,outdir,cb, debug);
        });

        // 5. extract EEPROM data (from EEMEM directive) to .eep file.
        tasks.push(function(cb) {
            debug("extracting EEPROM data");
            extractEEPROMData(options,outdir,cb,debug);
        });

        // 6. build the .hex file
        tasks.push(function(cb) {
            debug("building .HEX file");
            buildHexFile(options,outdir,cb, debug);
        });

        // 7. on board !!!
        if(up)
            tasks.push(function(cb){
                    debug("uploading sketch on board");
                    var pub = function(){console.log("pub");},
                        cb = function(data){console.log("sketch correctly loaded");
                            dm.emitEvent (domainName, "console-log", "sketch correctly loaded");
                        };
                        //uploader.upload(hexFile,options.port,options,pub,cb);
                        uploader.upload(hexFile,options,pub,cb);
                });

        processList(tasks, finalcb, publish);
    }



    /*[R : ok]*/
    function compileFiles(options, outdir, includepaths, cfiles,debug, cb) {
        function comp(file,cb) {
            var fname = file.substring(file.lastIndexOf('/')+1);
            if(fname.startsWith('.')) return cb(null, null);
            if(file.toLowerCase().endsWith('examples')) return cb(null,null);
            if(file.toLowerCase().endsWith('/avr-libc')) return cb(null,null);
            if(file.toLowerCase().endsWith('.c')) {
                compileC(options,outdir, includepaths, file,debug, cb);
                return;
            }
            if(file.toLowerCase().endsWith('.cpp')) {
                compileCPP(options,outdir, includepaths, file,debug, cb);
                return;
            }
            //debug("still need to compile",file);
            cb(null,null);
        }

        async.mapSeries(cfiles, comp, cb);
    }
    /*[R : ok]*/
    function compileCPP(options, outdir, includepaths, cfile,debug, cb) {
        debug("compiling ",cfile);
        console.log("Compiler Binary Path", options.platform.getCompilerBinaryPath());
        var cmd = [
            options.platform.getCompilerBinaryPath()+"\\avr-g++",
            "-c",
            "-g",
            "-Os",
            "-w",
            "-fno-exceptions",
            "-ffunction-sections",
            "-fdata-sections",
            "-fno-threadsafe-statics",
            "-mmcu="+options.device.build.mcu,
            "-DF_CPU="+options.device.build.f_cpu,
            "-MMD",
            "-DARDUINO=158", //105",
            "-DUSB_VID="+options.device.build.vid,
            "-DUSB_PID="+options.device.build.pid[0],
        ];

        includepaths.forEach(function(path){
            cmd.push('-I'+path);
        })

        cmd.push(cfile); //add the actual c++ file
        cmd.push('-o'); //output object file
        var filename = cfile.substring(cfile.lastIndexOf('\\')+1);
        var filename_cut = filename.substring(filename.lastIndexOf("/")+1);
        cmd.push(outdir+'/'+filename_cut+'.o');

        exec(cmd,cb, debug);

        dm.emitEvent (domainName, "console-log", filename+" compiled");
    }
    /*[R : ok]*/
    function compileC(options, outdir, includepaths, cfile, debug, cb) {
        debug("compiling ",cfile);
        var cmd = [
            options.platform.getCompilerBinaryPath()+"/avr-gcc", //gcc
            "-c", //compile, don't link
            '-g', //include debug info and line numbers
            '-Os', //optimize for size
            '-w', //'-Wall', //turn on verbose warnings
            '-ffunction-sections',// put each function in it's own section
            '-fdata-sections',
            '-mmcu='+options.device.build.mcu,
            '-DF_CPU='+options.device.build.f_cpu,
            '-MMD',//output dependency info
            '-DARDUINO=158',
            '-DUSB_VID='+options.device.build.vid,
            '-DUSB_PID='+options.device.build.pid[0]
        ];
        includepaths.forEach(function(path){
            cmd.push("-I"+path);
        })
        cmd.push(cfile); //add the actual c file
        cmd.push('-o');
        var filename = cfile.substring(cfile.lastIndexOf('/')+1);
        
        cmd.push(outdir+'/'+filename+'.o');

        exec(cmd, cb, debug);
        dm.emitEvent (domainName, "console-log", filename+" compiled");
    }

    function init(domainManager){
        if(!domainManager.hasDomain(domainName)){
            domainManager.registerDomain(domainName, {major: 0, minor: 1});
        }
        dm = domainManager;

        domainManager.registerCommand(
            domainName, //domain
            "compile",  //command
            compile,
            false,
            "Start building phase"
            [{
                name:"ino",
                type:"string",
                description:"Sketch to build"
            }],
            [{  name:"up",
                type:"boolean",
                description:"True if you want upload the sketch on board, false to verify code"
            }]
        );

        /*
        // TEST
        domainManager.registerCommand(
            domainName,
            "setPort",
            setPort,
            false,
            "Set uploading port",
            [{ name:"port",
                type:"string",
                description:"Name of port"
            }]
        );

        // TEST
        domainManager.registerCommand(
            domainName,
            "setBoard",
            setBoard,
            false,
            "Set current board",
            [{ name:"board",
                type:"string",
                description:"Name of board"
            }]
        );

        //PROVA [OK ! ]
        domainManager.registerCommand(
            domainName,
            "pbDetector",
            pbDetector,
            false
        );

        //PROVA
        domainManager.registerCommand(
            domainName,
            "setProgrammer",
            setProgrammer,
            false,
            "Set the programmer",
            [{
                name:"programmer",
                type:"string",
                description:"Name of programmer"
            }]
        );
        //PROVA
        domainManager.registerCommand(
            domainName,
            "getProgrammer",
            getProgrammer,
            false,
            "Get the programmers list",
            [{
                name:"programmer",
                type:"object",
                description:"List of programmer"
            }]
        );

        domainManager.registerCommand(
            domainName,
            "writeBootloader",
            writeBootloader,
            false,
            "Write the bootloader"
        );

        domainManager.registerCommand(
            domainName,
            "getBoards",
            getBoards,
            false,
            "Get the list of all boards availables"
        );
        */

//---------------------------- EVENTI ----------------------------

        domainManager.registerEvent(
            domainName,
            "console-log",
            [{  name:"cdata",
                type:"string",
                description:"building outputs"
            }]
        );

        domainManager.registerEvent(
            domainName,
            "port_data",
            [{  name:"pdata",
                type:"object",
                description:"port"
            }]
        );

        domainManager.registerEvent(
            domainName,
            "portList_data",
            [{  name:"pdata",
                type:"object",
                description:"port list"
            }]
        );

        domainManager.registerEvent(
            domainName,
            "boardList_data",
            [{  name:"bdata",
                type:"object",
                description:"board list"
            }]
        );

        domainManager.registerEvent(
            domainName,
            "pbDetect_data",
            [{  name:"pbdata",
                type:"object",
                description:"port & board detected list"
            }]
        );

        domainManager.registerEvent(
            domainName,
            "boardsList_data",
            [{  name:"bListdata",
                type:"object",
                description:"Boards list"
            }]
        );

        domainManager.registerEvent(
            domainName,
            "programmers_data",
            [{  name:"prgsdata",
                type:"object",
                description:"programmerslist"
            }]
        );
    }

    exports.init = init;
//	pre_compile2();
    /*
    pbDetector();
    */
}());