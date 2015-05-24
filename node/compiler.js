/**
 *  BASED ON
 *  https://github.com/joshmarinacci/ElectronIDE
 *  BY Josh Marinacci
 *
 *  MODIFIED BY Arduino.org Team
 */

(function () {
    "use strict";

    var fs              = require('fs'),
        async           = require('async'),
        wrench          = require('wrench'),
        os              = require('os'),
        child_process   = require('child_process'),
        path            = require('path');

    var uploader        = require('./compiler/uploader');
    var platform        = require('./compiler/platform');
    //var LIBRARIES       = require('./compiler/libraries');

    var domainName = "org-arduino-ide-domain-compiler";

    var dm, prg = "arduino";

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
                var code = fs.readFileSync(sketchPath+ path.sep + file).toString();
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
            //install libs if needed, and add to the include paths
            list.forEach(function(libname){
                if(libname == 'Arduino') return;
                debug('scanning lib',libname);

                //TODO user lib import
                /*if(LIBRARIES.isUserLib(libname,plat)) {
                    console.log("it's a user lib");
                    var lib = LIBRARIES.getUserLib(libname,plat);
                    lib.getIncludePaths(plat).forEach(function(ppath) {
                        paths.push(ppath);
                    });
                    libs.push(lib);
                    return;
                }*/
                paths.push(plat.getStandardLibraryPath() + path.sep + libname + path.sep + "src");

                //lib.getIncludePaths(plat).forEach(function(ppath) { paths.push(ppath); });
                plat.getUserLibraryDir()+path.sep+libname;
                libs.push({"campo1": "valore1", "campo2": "valore2"});
            });
            if(cb) cb();
    }

    function listdir(p_path) {
        return fs.readdirSync(p_path)
            .filter(function(file) {
                if(file.startsWith('.')) return false;
                return true;
            })
            .map(function(file) {
                return p_path + path.sep + file;
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
                    dm.emitEvent (domainName, "console-error", error);
                    return;
                }
                if(cb) cb();
            }
        );
    }

    function linkFile(options, file, outdir, cb, debug) {
        var cmd = [
            options.platform.getCompilerBinaryPath() + path.sep + 'avr-ar',
            'rcs',
            outdir + path.sep + 'core.a',
            file,
        ];
        exec(cmd, cb, debug);
        var filename = file.split(path.sep);

        dm.emitEvent (domainName, "console-log", filename[filename.length-1]+" linked to core.a");
    }

    function linkElfFile(options, libofiles, outdir, cb, debug) {
        //link everything into the .elf file
        var elfcmd = [
            options.platform.getCompilerBinaryPath() + path.sep + 'avr-gcc', //gcc
            '-Os', //??
            '-Wl,--gc-sections', //not using relax yet
            '-mmcu='+options.device.build.mcu, //the mcu, ex: atmega168
            '-o', //??
            outdir + path.sep + options.name+'.cpp.elf',
            outdir + path.sep + options.name+'.cpp.o',
        ];

        elfcmd = elfcmd.concat(libofiles);
        elfcmd = elfcmd.concat([
            outdir + path.sep + 'core.a',
            '-L'+outdir,
            '-lm',
        ]);


        exec(elfcmd, cb, debug);

        dm.emitEvent (domainName, "console-log", options.name+ ".cpp.elf linked to core.a");
    }

    function extractEEPROMData(options, outdir, cb, debug) {
        var eepcmd = [
            options.platform.getCompilerBinaryPath() + path.sep + 'avr-objcopy',
            '-O',
            'ihex',
            '-j',
            '.eeprom',
            '--set-section-flags=.eeprom=alloc,load',
            '--no-change-warnings',
            '--change-section-lma',
            '.eeprom=0',
            outdir + path.sep + options.name+'.cpp.elf',
            outdir + path.sep + options.name+'.eep',
        ];

        exec(eepcmd, cb, debug);
    }

    function buildHexFile(options, outdir, cb, debug) {
        var hexcmd = [
            options.platform.getCompilerBinaryPath() + path.sep + 'avr-objcopy',
            '-O',
            'ihex',
            '-R',
            '.eeprom',
            outdir + path.sep + options.name+'.cpp.elf',
            outdir + path.sep + options.name+'.cpp.hex',
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
                if(err) {
                    dm.emitEvent (domainName, "console-error", err);
                    return cb(err);
                }
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
        console.log("EVENT : " + JSON.stringify(mex));
        //TODO mex.message is a development string, not for user purposes
        dm.emitEvent (domainName, "console-error", mex.message);
    }

    function finalEvent(){
        console.log("---> final cb <---");
    }



    function compile(options, sketchDir, up) {
        console.log("I'm Compiler and I'm wearing my sunglasses");
        dm.emitEvent (domainName, "console-log", "Start Building");
        var BUILD_DIR       = os.tmpdir(),   // Right ???
            userSketchesDir = BUILD_DIR;

        var curlib;

        platform;

        //TEMPORANEAMENTE DISATTIVATO
        //t_options.device.upload.protocol = prg;

        var outdir = BUILD_DIR  + path.sep +  'build' + new Date().getTime();

        options.platform = platform.getDefaultPlatform();

        var sketchPath = sketchDir;
        var finalcb = finalEvent;
        var publish = publishEvent;

        /*console.log("compiling to");
        console.log("sketchpath ", sketchPath);
        console.log("outdir = ", outdir);
        console.log("options = ", options);
        console.log("sketchdir = ", sketchDir);*/

        var errorHit = false;


        function debug(message) {
        //  TEMPORARILY DIABLED
            var args = Array.prototype.slice.call(arguments);
            console.log("message = " + message + args.join(" ")+'\n');
            if(message instanceof Error) {
                errorHit = true;
                //publish({type:'error', message: args.join(" ") + message.output});
            } else {
                //publish({type:"compile", message:args.join(" ")});
               // publish("debug  :" + args.join(" ") + "");
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

        var cfile = outdir  + path.sep +  options.name + '.cpp';
        var cfiles = [];
        var includepaths = [];
        var includedLibs = [];
        var libextra = [];
        var plat = options.platform;

        //1. generate the CPP file and copy all files to the output directory
        tasks.push(function(cb) {
            debug("generating",cfile);

            generateCPPFile(cfile,sketchPath);

            cfiles.push(cfile);
            //compile sketch files
            function copyToDir(file, indir, outdir) {
                console.log("copying ",file);
                var text = fs.readFileSync(indir + path.sep + file);
                fs.writeFileSync(outdir + path.sep + file,text);
            }

            fs.readdirSync(sketchDir).forEach(function(file) {
                if(file.toLowerCase().endsWith('.h')) copyToDir(file,sketchDir,sketchPath);
                if(file.toLowerCase().endsWith('.cpp')) copyToDir(file,sketchDir,sketchPath);
                cfiles.push(sketchPath + path.sep + file);
            });

            if(cb) cb();
        });

        //2. scan for the included libs make sure they are all installed collect their include paths
        tasks.push(function(cb) {

            includedLibs = detectLibs(fs.readFileSync(cfile).toString());

            debug('========= scanned for included libs',includedLibs);

            //assemble library paths
            var librarypaths = [];
            //global libs

            debug("standard arduino libs = ",options.platform.getStandardLibraryPath());
            fs.readdirSync(options.platform.getStandardLibraryPath()).forEach(function(lib) {
                librarypaths.push(options.platform.getStandardLibraryPath() + path.sep + lib);
            });

            includepaths.push(options.platform.getCorePath(options));

            includepaths.push(options.platform.getVariantPath(options));

//            includepaths.push(sketchDir);

            console.log("include path =",includepaths);
            console.log("includedlibs = ", includedLibs);
            calculateLibs(includedLibs,includepaths,libextra, debug, cb, plat);
            //if(cb) cb();
        });

        //4. actually compile code
        tasks.push(function(cb) {
            console.log("moving on now");
            debug("include paths = ", JSON.stringify(includepaths,null, '   '));
            debug("using 3rd party libraries",libextra.map(function(lib) { return lib.id }).join(', '));
            compileFiles(options,outdir,includepaths,cfiles,debug, cb);
        });


        //3.compile the 3rd party libs
        tasks.push(function(cb) {
            /*
            debug("compiling libs");
            async.map(libextra, function(lib,cb) {
                debug('compiling library: ',lib.id);
                var paths = lib.getIncludePaths(plat);
                var cfiles = [],
                    output_dir,
                    curlib;

                 paths.forEach(function(ppath) {
                 wrench.readdirSyncRecursive(ppath)
                 .filter(function(filename) {
                 if(filename.startsWith('examples' + path.sep )) return false;
                 if(filename.toLowerCase().endsWith('.c')) return true;
                 if(filename.toLowerCase().endsWith('.cpp')) return true;
                 return false;
                 })
                 .forEach(function(filename) {
                 cfiles.push(ppath + path.sep + filename);
                 })
                 ;
                 });

                /*
                var includedLibs = detectLibs(fs.readFileSync(cfile).toString());
                debug('========= scanned for included libs',includedLibs);
                var libsList = [],
                    base ;
                includedLibs.forEach(
                    function(item, index, array)
                    {
                        curlib = item;
                        if(item != 'Arduino') {
                            base = options.platform.getStandardLibraryPath() + path.sep + item;
                            libsList = wrench.readdirSyncRecursive(base);

                            if (libsList)
                                libsList.forEach(function (item2, index2, array2) {
                                    if (item2.toLowerCase().endsWith('.c') || item2.toLowerCase().endsWith('.cpp'))
                                        cfiles.push(base + path.sep + item2);
                                    output_dir = outdir + path.sep + curlib + path.sep + item2;
                                    console.log("check " + item2);
                                })
                            //compileFiles(options, output_dir, includepaths,cfiles,debug,cb);
                        }
                    })

                debug('cfiles',cfiles);
                var outdir2 = outdir+path.sep+curlib;    //da libraries in poi ??? invece di curlib
                */
                /*compileFiles(options, outdir , includepaths, cfiles, debug, cb);
            },cb);
            */
//------------------------------------------------------------
            /*
            debug("compiling 3rd party libs");
            async.map(libextra, function(lib,cb) {
                debug('compiling library: ',lib.id);
                var paths = lib.getIncludePaths(plat);
                var cfiles = [];
                paths.forEach(function(ppath) {
                    wrench.readdirSyncRecursive(ppath)
                        .filter(function(filename) {
                            if(filename.startsWith('examples' + path.sep )) return false;
                            if(filename.toLowerCase().endsWith('.c')) return true;
                            if(filename.toLowerCase().endsWith('.cpp')) return true;
                            return false;
                        })
                        .forEach(function(filename) {
                            var item = ppath + path.sep + filename;
                            if(item.indexOf(path.sep + options.device.arch +path.sep) > -1 )
                                cfiles.push(item);
                        })
                    ;
                });
                debug('cfiles',cfiles);
                compileFiles(options, outdir, includepaths, cfiles, debug,cb);
            },cb);
            */
//------------------------------------------------------------

            var output_dir;
            var includedLibs = detectLibs(fs.readFileSync(cfile).toString());
            debug('========= scanned for included libs',includedLibs);
            var libsList = [],
                base,
                cfiles = [];
            includedLibs.forEach(
                function(item, index, array)
                {
                    curlib = item;
                    if(item != 'Arduino') {
                        base = options.platform.getStandardLibraryPath() + path.sep + item;
                        libsList = wrench.readdirSyncRecursive(base);

                        if (libsList)
                            libsList.forEach(function (item2, index2, array2) {
                                if (item2.toLowerCase().endsWith('.c') || item2.toLowerCase().endsWith('.cpp'))
                                {
                                    var itm = base + path.sep + item2
                                    if(itm.indexOf(path.sep + options.device.arch +path.sep) > -1 )
                                        cfiles.push(itm);
                                }
                                    //cfiles.push(base + path.sep + item2);
                                output_dir = outdir + path.sep + curlib + path.sep + item2;
                                console.log("check " + item2);
                            })
                        compileFiles(options, outdir, includepaths,cfiles,debug,cb);
                    }
                })

            debug('cfiles',cfiles);
            var outdir2 = outdir+path.sep+curlib;    //da libraries in poi ??? invece di curlib
        });


        //5. compile core
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

        //6. build the elf file
        tasks.push(function(cb) {
            debug("building elf file");
            var libofiles = [],
                libofiles2 = [];
            var includedLibs = detectLibs(fs.readFileSync(cfile).toString());
            //libextra.forEach(function(lib) {
            /*includedLibs.forEach(function(lib) {
                //var paths = lib.getIncludePaths(plat);
                var paths =   options.platform.getUserLibraryDir()+'/'+lib;
                paths.forEach(function(path) {
                    listdir(path).filter(function(file) {
                        if(file.endsWith('.cpp')) return true;
                        return false;
                    }).map(function(filename) {
                        libofiles.push(outdir + path.sep + filename.substring(filename.lastIndexOf( path.sep )+1) + '.o');
                    });
                });
            });*/

            //linkElfFile(options,libofiles,outdir,cb, debug);
            /*for (var item in includedLibs){
                if(includedLibs[item] == "Arduino")
                    includedLibs.splice(item,1)
                else
                    includedLibs[item] = outdir + path.sep + includedLibs[item] + ".cpp.o";
            };*/

            includedLibs.forEach(function(itm){
                if(itm != "Arduino")
                    libofiles2.push(outdir + path.sep + itm + ".cpp.o");
            });

            linkElfFile(options,libofiles2,outdir,cb, debug);
        });

        // 7. extract EEPROM data (from EEMEM directive) to .eep file.
        tasks.push(function(cb) {
            debug("extracting EEPROM data");
            extractEEPROMData(options,outdir,cb,debug);
        });

        // 8. build the .hex file
        tasks.push(function(cb) {
            debug("building .HEX file");
            buildHexFile(options,outdir,cb, debug);
        });

        // 9. on board !!!
        if(up)
            tasks.push(function(cb){
                    debug("uploading sketch on board");
                    var pub = function(data){
                            if(data)
                                if(data.type == 'upload')
                                    dm.emitEvent(domainName, "console-log", data.message);
                                else
                                    dm.emitEvent(domainName, "console-error", data.message);

                        },
                        cb = function(data){
                            if(data)
                                dm.emitEvent(domainName, "console-log", data.output);
                        };
                        uploader.upload(hexFile,options,pub,cb);
                });

        processList(tasks, finalcb, publish);
    }


    function compileFiles(options, outdir, includepaths, cfiles,debug, cb) {
        function comp(file,cb) {
            var fname = file.substring(file.lastIndexOf( path.sep )+1);
            if(fname.startsWith('.')) return cb(null, null);
            if(file.toLowerCase().endsWith('examples')) return cb(null,null);
            if(file.toLowerCase().endsWith( path.sep + 'avr-libc')) return cb(null,null);
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

    function compileCPP(options, outdir, includepaths, cfile,debug, cb) {
        debug("compiling ",cfile);
        var cmd = [
            options.platform.getCompilerBinaryPath() + path.sep + "avr-g++",
            "-c",
            "-g",
            "-Os",
            //"-w",
            "-fno-exceptions",
            "-ffunction-sections",
            "-fdata-sections",
            "-fno-threadsafe-statics",
            "-mmcu="+options.device.build.mcu,
            "-DF_CPU="+options.device.build.f_cpu,
            "-MMD",
            "-DARDUINO=158",
            "-DARDUINO_"+options.device.build.board,                //"-DARDUINO_AVR_UNO",
            "-DARDUINO_ARCH_"+options.device.arch.toUpperCase()     //"-DARDUINO_ARCH_AVR"
        ];

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

        exec(cmd,cb, debug);

        dm.emitEvent (domainName, "console-log", filename+" compiled");
    }

    function compileC(options, outdir, includepaths, cfile, debug, cb) {
        debug("compiling ",cfile);
        var cmd = [
            options.platform.getCompilerBinaryPath() + path.sep + "avr-gcc", //gcc
            "-c", //compile, don't link
            '-g', //include debug info and line numbers
            '-Os', //optimize for size
            //'-w', //'-Wall', //turn on verbose warnings
            '-ffunction-sections',// put each function in it's own section
            '-fdata-sections',
            '-mmcu='+options.device.build.mcu,
            '-DF_CPU='+options.device.build.f_cpu,
            '-MMD',//output dependency info
            '-DARDUINO=158',
            "-DARDUINO_"+options.device.build.board,                //"-DARDUINO_AVR_UNO",
            "-DARDUINO_ARCH_"+options.device.arch.toUpperCase()      //"-DARDUINO_ARCH_AVR"
            ];

        if(options.verbosebuild)
            cmd.push('-w');

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

//---------------------------- EVENTI ----------------------------

        domainManager.registerEvent(
            domainName,
            "console-log",
            [{  name:"cdata",
                type:"string",
                description:"building outputs"
            }]
        );
//TODO gestione errori
        domainManager.registerEvent(
            domainName,
            "console-error",
            [{  name:"cdata",
                type:"string",
                description:"building outputs"
            }]
        );

    }

    exports.init = init;

}());