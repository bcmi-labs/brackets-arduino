(function () {
    "use strict";

    var cp = require("copy-paste");
    var domainManager;
    var domainName =  "org-arduino-ide-domain-copypaste";

    function forumCopy(userSelection)
    {
        //console.log("PRE COPY");
        cp.copy("[code]\n"+userSelection+"\n[/code]\n");
        //console.log("POST COPY");
    };

    function init(domainManager)
    {
        if(!domainManager.hasDomain(domainName)){
            domainManager.registerDomain(domainName, {major: 0, minor: 1});
        }
        
        
        domainManager.registerCommand(
            domainName,
            "forumCopy",    
            forumCopy,   
            false,    
            "Copy current selection for forum"
        );  
    }
    
    exports.init = init;
}());


