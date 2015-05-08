(function () {
	"use strict";

	var archiver 	= require("archiver"),   //compress
		admZip 		= require("adm-zip"),   //extract
		fsextra 	= require("fs-extra");

	var platform = require("./platform.js").getDefaultPlatform();

	var domainName = "org-arduino-ide-domain-filesystem",
		dManager;

	function readSampleDir(dir)
	{
		//dir = PATH_SAMPLES;
		var fsList = [], group;
		fsextra.readdir(dir, function(err,data){
				for(var i in data)
				{
					var item = dir+"/"+data[i];
					group = fsextra.readdirSync(item);
					fsList.push({"type":item, "files":group});
				}
				dManager.emitEvent (domainName, "sampleList_data", [fsList]);
			}
		);
	}

	function importFile(oldf, newf)
	{
		//fs.createReadStream(oldf).pipe(fs.createWriteStream(newf));
		fsextra.copy(oldf,newf,function(err){
			if(err) return console.error(err);
			console.log("ADD FILE FINE");
		});
	}

	function addDir(folder, dest)
	{
/*
		fsextra.ensureDir(libsFolder, function (err) {
			if(err) return console.error(err);
			fsextra.copy(folder,dest, function(err){
				if(err) return console.error(err);
				console.log("Lib added");
			});
		});

*/
		//TODO check if exist the user lib dir
		//fsextra.exists(dest, function (exist) {
			//if(exist)
				fsextra.copy(folder,dest, function(err){
					if(err) return console.error(err);
					console.log("Lib added");
				});
		//});
	}

	function addDirFromArchive(archive, dest)
	{
		var zip = new admZip(archive);
		zip.extractAllTo(dest, true);
		console.log("LibZip added");
	}

	function getPlatLibs()
	{
		console.log("GET PLATFORM INTERFACE");
		dManager.emitEvent (domainName, "platform_data", [platform.getUserLibraryDir(), platform.getStandardLibraryPath()]);
	}

	function init(domainManager){
		if(!domainManager.hasDomain("fsInterface")){
			domainManager.registerDomain("fsInterface", {major: 0, minor: 1});
		}
		dManager = domainManager;
		
		
		domainManager.registerCommand(
			domainName,
			"readSampleDir",
			readSampleDir,
			false,
			"Read Sample Directory",
			[{	name:"dir",
				type:"string",
				description:"Directory to read"
			}]
		);

		domainManager.registerCommand(
			domainName,
			"importFile",
			importFile,
			true,
			"Import file into project",
			[{	name:"srcFile",
				type:"string",
				description:"Number of port"
			}],
			[{	name:"destFile",
				type:"string",
				description:"destination file"
			}]
		);

		domainManager.registerCommand(
			domainName,
			"addDir",
			addDir,
			false,
			"Import lib into project"
		);

		domainManager.registerCommand(
			domainName,
			"addDirFromArchive",
			addDirFromArchive,
			false,
			"Import lib (zip) into project"
		);

		domainManager.registerCommand(
			domainName,
			"getPlatform",
			getPlatLibs,
			false,
			"Get platform"
		);

		domainManager.registerEvent(
			domainName,
			"sampleList_data",
			[{	name:"sldata",
				type:"object",
				description:"List of all samples"
			}]
		);	

		domainManager.registerEvent(
			domainName,
			"platform_data",
			[{	name:"userLib",
				type:"string",
				description:"user lib path"
			}],
			[{	name:"standardLib",
				type:"string",
				description:"standard lib path"
			}]
		);	
	}

	exports.init = init;

}());