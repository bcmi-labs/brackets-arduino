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
        path            = require('path'),
        preader         = require('properties-reader');

    var uploader        = require('./compiler/uploader');
    var platform        = require('./compiler/platform');


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

    function calculateLibs(list, paths, libs, debug, cb, plat, sketchbook) {
            list.forEach(function(libname){
                if(libname == 'Arduino') return;
                debug('scanning lib',libname);



                //-tmp-\\paths.push(plat.getStandardLibraryPath() + path.sep + libname + path.sep + "src");

                //TODO user lib import
                //var user1 = plat.getUserLibraryDir()+path.sep+libname,
                //    user2 = sketchbook + path.sep + libname;

                //libs.push({"campo1": "valore1", "campo2": "valore2"});

                // VERSIONE SYNC
                if(fs.existsSync(plat.getStandardLibraryPath() + path.sep + libname))
                {
                    console.log("Standard lib");
                    paths.push(plat.getStandardLibraryPath() + path.sep + libname + path.sep + "src");
                }
                else
                {
                    console.log("Scanning for user lib...")
                    if(fs.existsSync(sketchbook + path.sep + "libraries" + path.sep + libname))
                    {
                        console.log("User lib");
                        paths.push(sketchbook + path.sep + "libraries" + path.sep + libname + path.sep + "src");
                    }
                    else
                        console.log("Problemone")
                }

                // VERSIONE ASYNC
                /*
                fs.exists(plat.getStandardLibraryPath() + path.sep + libname, function (exists){
                    if(exists)
                    {
                        console.log("Standard lib");
                        paths.push(plat.getStandardLibraryPath() + path.sep + libname + path.sep + "src");
                    }
                    else
                    {
                        console.log("Scan for user lib...");
                        fs.exists(sketchbook + path.sep + libname, function (exists2) {
                            if(exists2) {
                                console.log("User lib");
                                paths.push(sketchbook + path.sep + libname + path.sep + "src");
                            }
                            else
                                console.log("Problemone");
                        });
                    }

                });
                */

                /*
                 if(LIBRARIES.isUserLib(libname,plat)) {
                 console.log("it's a user lib");
                 var lib = LIBRARIES.getUserLib(libname,plat);
                 lib.getIncludePaths(plat).forEach(function(path) {
                 paths.push(path);
                 });
                 libs.push(lib);
                 return;
                 }
                */
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
        dm.emitEvent (domainName, "console-success", "Building success!");
    }



    function compile(options, sketchDir, up) {
        console.log("I'm Compiler and I'm wearing my sunglasses");
        dm.emitEvent (domainName, "console-log", "Start Building");
        var BUILD_DIR       = os.tmpdir(),
            userSketchesDir = BUILD_DIR;

        var curlib,
            tolink;

        platform;

        var outdir = BUILD_DIR  + path.sep +  'build' + new Date().getTime();

        options.platform = platform.getDefaultPlatform();

        var sketchPath = sketchDir;
        var finalcb = finalEvent;
        var publish = publishEvent;

        var errorHit = false;


        function debug(message) {
        //  TEMPORARILY DISABLED
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

        checkfile(options.platform.getCompilerBinaryPath());
        debug("compiling ",sketchPath,"to dir",outdir);
        debug("root sketch dir = ",sketchDir);

        wrench.rmdirSyncRecursive(outdir, true);
        wrench.mkdirSyncRecursive(outdir);

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

            debug("standard arduino libs = ",options.platform.getStandardLibraryPath());
            fs.readdirSync(options.platform.getStandardLibraryPath()).forEach(function(lib) {
                librarypaths.push(options.platform.getStandardLibraryPath() + path.sep + lib);
            });

            includepaths.push(options.platform.getCorePath(options));

            includepaths.push(options.platform.getVariantPath(options));

            console.log("include path =",includepaths);
            console.log("includedlibs = ", includedLibs);
            calculateLibs(includedLibs,includepaths,libextra, debug, cb, plat, options.sketchbook);
        });

        //3. actually compile code
        tasks.push(function(cb) {
            console.log("moving on now");
            debug("include paths = ", JSON.stringify(includepaths,null, '   '));
            debug("using 3rd party libraries",libextra.map(function(lib) { return lib.id }).join(', '));
            compileFiles(options,outdir,includepaths,cfiles,debug, cb);
        });


        //4.compile the 3rd party libs
        tasks.push(function(cb) {
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

                        if(fs.existsSync(options.platform.getStandardLibraryPath() + path.sep + item))
                            base = options.platform.getStandardLibraryPath() + path.sep + item;
                        else
                            if(fs.existsSync(options.sketchbook + path.sep + "libraries" + path.sep + item))
                                base = options.sketchbook + path.sep + "libraries" + path.sep + item;
                            else
                                console.log("Problemone2");

                        libsList = wrench.readdirSyncRecursive(base);

                        var prop = preader(base + path.sep + "library.properties");
                        var ark = prop.get("architectures");

                        if(ark == options.device.arch || ark == "*")
                        {
                            if (libsList)
                                libsList.forEach(function (item2, index2, array2) {
                                    if (item2.toLowerCase().endsWith('.c') || item2.toLowerCase().endsWith('.cpp'))
                                            cfiles.push(base + path.sep + item2);
                                })
                        }
                        else if(ark.indexOf(options.device.arch) > -1 && ark.indexOf(",") > -1)
                        {
                            if (libsList)
                                libsList.forEach(function (item2, index2, array2) {
                                    if (item2.toLowerCase().endsWith('.c') || item2.toLowerCase().endsWith('.cpp'))
                                    {
                                        var itm = base + path.sep + item2
                                        if(itm.indexOf(path.sep + options.device.arch +path.sep) > -1 )
                                            cfiles.push(itm);
                                    }
                                })
                        }
                        else
                            console.log("ERRORE : Libreria non supportata dall'architettura " + options.device.arch)
                    }
                })
            debug('cfiles',cfiles);
            tolink = cfiles;
            compileFiles(options, outdir, includepaths,cfiles,debug,cb);
        });


        //5. compile core
        tasks.push(function(cb) {
            debug("compiling core files");
            var cfiles = listdir(options.platform.getCorePath(options));
            compileFiles(options,outdir,includepaths,cfiles,debug,cb);
        });

        //6.link everything into core.a
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

        //7. build the elf file
        tasks.push(function(cb) {
            debug("building elf file");
            var libofiles = [],
                libofiles2 = [];
            var includedLibs = detectLibs(fs.readFileSync(cfile).toString());

            includedLibs.forEach(function(itm){
                if(itm != "Arduino")
                    libofiles2.push(outdir + path.sep + itm + ".cpp.o");
            });

            tolink.forEach(function(itm){
                libofiles.push(outdir + itm.slice(itm.lastIndexOf(path.sep)) + ".o");
            })

            linkElfFile(options,libofiles,outdir,cb, debug);
        });

        // 8. extract EEPROM data (from EEMEM directive) to .eep file.
        tasks.push(function(cb) {
            debug("extracting EEPROM data");
            extractEEPROMData(options,outdir,cb,debug);
        });

        // 9. build the .hex file
        tasks.push(function(cb) {
            debug("building .HEX file");
            buildHexFile(options,outdir,cb, debug);
        });

        // 10. on board !!!
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
            "-fno-exceptions",
            "-ffunction-sections",
            "-fdata-sections",
            "-fno-threadsafe-statics",
            "-mmcu="+options.device.build.mcu,
            "-DF_CPU="+options.device.build.f_cpu,
            "-MMD",
            "-DARDUINO=158",
            "-DARDUINO_"+options.device.build.board,
            "-DARDUINO_ARCH_"+options.device.arch.toUpperCase()
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
            '-ffunction-sections',// put each function in it's own section
            '-fdata-sections',
            '-mmcu='+options.device.build.mcu,
            '-DF_CPU='+options.device.build.f_cpu,
            '-MMD',//output dependency info
            '-DARDUINO=158',
            "-DARDUINO_"+options.device.build.board,
            "-DARDUINO_ARCH_"+options.device.arch.toUpperCase()
            ];

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
            "console-error",
            [{  name:"cdata",
                type:"string",
                description:"building outputs"
            }]
        );

        domainManager.registerEvent(
            domainName,
            "console-success",
            [{  name:"cdata",
                type:"string",
                description:"building succes"
            }]
        );

    }

    exports.init = init;

}());