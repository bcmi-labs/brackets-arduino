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
    var platform, platform_obj, pattern;
    var domainName = "org-arduino-ide-domain-compiler";
    var dm, prg = "arduino";
    var hexFile, binFile;

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
                    //<editor-fold desc="test new path for lib">
                    else if(fs.existsSync(plat.root + path.sep + "hardware" + path.sep + "arduino" + path.sep + arch + path.sep + "libraries" + path.sep + libname))
                    {
                        console.log("User lib");
                        paths.push(plat.root + path.sep + "hardware" + path.sep + "arduino" + path.sep + arch + path.sep + "libraries" + path.sep + libname);
                        if(fs.existsSync(plat.root + path.sep + "hardware" + path.sep + "arduino" + path.sep + arch + path.sep + "libraries" + path.sep + libname + path.sep + "src"))
                            paths.push((plat.root + path.sep + "hardware" + path.sep + "arduino" + path.sep + arch + path.sep + "libraries" + path.sep + libname + path.sep + "src"))
                        if(fs.existsSync(plat.root + path.sep + "hardware" + path.sep + "arduino" + path.sep + arch + path.sep + "libraries" + path.sep + libname + path.sep + "utility"))
                            paths.push((plat.root + path.sep + "hardware" + path.sep + "arduino" + path.sep + arch + path.sep + "libraries" + path.sep + libname + path.sep + "utility"))
                    }
                    //</editor-fold>
                    else
                        console.log("Library " + libname + " not exist")
                }
            });
            if(cb) cb();
    }

    function listdir2(p_path) {
        return fs.readdirSync(p_path)
            .filter(function(file) {
                if(file.startsWith('.')) return false;
                return true;
            })
            .map(function(file) {
				var entry = p_path + path.sep + file;
				
				if(fs.statSync(entry).isDirectory())			
					return listdir(entry);
				else
					return entry;
					
            });
    }
	
	function listdir(p_path)
	{
		var list1 = fs.readdirSync(p_path)
			.filter(function(file) {
                if(file.startsWith('.')) return false;
                return true;
            }),
			list2 = [],
			resultList =[];
			
		for(var i in list1)
		{
			var entry = p_path + path.sep + list1[i];
				
				if(fs.statSync(entry).isDirectory())	
				{			
					var list = fs.readdirSync(entry);
					for(var i in list)
						resultList.push(entry+path.sep+list[i]);
				}
				else
					resultList.push(entry)
		}
		
		return resultList;
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
                    dm.emitEvent (domainName, "console-error", error.message);
                    return;
                }
                if(cb) cb();
            }
        );
        console.log("COMMAND " + cmd.toString());
    }

    function linkFile(options, file, outdir, cb, debug) {
        exec(platform_obj.getLinkCmd(options,file,outdir), cb, debug);
        var filename = file.split(path.sep);

        dm.emitEvent (domainName, "console-log", filename[filename.length-1]+" linked to core.a");
    }

    function linkElfFile(options, libofiles, outdir, cb, debug) {
        //link everything into the .elf file
        exec(platform_obj.getLinkElfCmd(options,libofiles,outdir),cb, debug);
        dm.emitEvent (domainName, "console-log", options.name+ ".cpp.elf linked to core.a");
    }

    function extractEEPROMData(options, outdir, cb, debug) {
        exec(platform_obj.getEEPROMCmd(options,outdir),cb,debug);
        dm.emitEvent (domainName, "console-log", options.name+ " EEPROM");
    }

    function buildBinFile(options, outdir, cb, debug){
        exec(platform_obj.getBinCmd(options, outdir), cb, debug);
        dm.emitEvent (domainName, "console-log", options.name + ".bin builded");
    }

    function buildHexFile(options, outdir, cb, debug) {
        var hexcmd = platform_obj.getHexCmd(options, outdir);
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
        console.log("Building success!");
        dm.emitEvent (domainName, "console-success", "Building success!");
    }

    function compile(options, sketchDir, up) {
        console.log("I'm Compiler and I'm wearing my sunglasses");
        dm.emitEvent (domainName, "console-log", "Start Building");
        var BUILD_DIR       = os.tmpdir(),
            userSketchesDir = BUILD_DIR,
            curlib,
            tolink;

        if(options.device.arch) {
            switch (options.device.arch) {
                case 'avr':
                    platform = require('./compiler/platformAVR');
                    break;
                /*case 'sam':
                    platform = require('./compiler/platformSAM');
                    break;*/
                case 'samd':
                    platform = require('./compiler/platformSAMD');
                    break;
            }
            platform_obj  = platform.getDefaultPlatform();
            pattern = platform_obj.getPattern();
        }
        else {
            alert("Select a board first!")
            return false;
        }


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

        //2. scan for the included libs and collect their include paths
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

        //3. compile code
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
                                console.log("ERROR : Library " + item + " not exist");

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
                        else {
                            console.log("ERROR : Library " + item + " is not supported in your architecture " + options.device.arch)
                        }
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
			cfiles = cfiles.concat(listdir(options.platform.getVariantPath(options)));
				
            compileFiles(options,outdir,includepaths,cfiles,debug,cb);
        });

        //6.link everything into core.a
        if(pattern.archives)
        tasks.push(function(cb) {
            var dfiles = listdir(outdir)
                .filter(function(file){
                    if(file.endsWith('.d') || file.endsWith('.cpp')) return false;
                    return true;
                });
            async.mapSeries(dfiles, function(file, cb) {
                debug("linking",file);
                linkFile(options,file,outdir, cb, debug);
            }, cb);
        });

        //7. build the elf file
        if(pattern.combine)
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
        if(pattern.eep)
        tasks.push(function(cb) {
            debug("extracting EEPROM data");
            extractEEPROMData(options,outdir,cb,debug);
        });

        // 8,5. create the .bin file
        if(pattern.bin)
        tasks.push(function(cb) {
            debug("building .BIN file");
            buildBinFile(options, outdir, cb, debug);
        });

        // 9. build the .hex file
        if(pattern.hex)
        tasks.push(function(cb) {
            debug("building .HEX file");
            buildHexFile(options,outdir,cb, debug);
        });

        // 10. on board !!!
        if(up)
            tasks.push(function(cb) {
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
                        uploader.upload(platform_obj.getUploadCmd(hexFile,options,outdir), options,pub, cb);

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
                exec(platform_obj.getCompileCCmd(options,outdir,includepaths,file), cb, debug);

                var filename = file.substring(file.lastIndexOf(path.sep)+1);
                dm.emitEvent (domainName, "console-log", filename+" compiled");
                return;
            }
            if(file.toLowerCase().endsWith('.cpp')) {
                exec(platform_obj.getCompileCppCmd(options,outdir,includepaths,file), cb, debug);

                var filename = file.substring(file.lastIndexOf(path.sep)+1);
                dm.emitEvent (domainName, "console-log", filename+" compiled");

                return;
            }
            cb(null,null);
        }
        async.mapSeries(cfiles, comp, cb);
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
