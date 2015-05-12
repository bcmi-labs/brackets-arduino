/**
 *  BASED ON https://github.com/zanven42/brackets-sqf
 *  BY Anthony "Zanven" Poschen
 *  UNDER MIT LICENSE
 *
 *  MODIFIED BY Arduino.org Team - 05/2015
 */

define(function (require, exports, module) {
    'use strict';
var AppInit          = brackets.getModule("utils/AppInit"),
    LanguageManager  = brackets.getModule("language/LanguageManager"),
    FileSystem       = brackets.getModule("filesystem/FileSystem"),
    FileUtils        = brackets.getModule("file/FileUtils"),
    TokenUtils       = brackets.getModule("utils/TokenUtils"),
    CodeHintManager  = brackets.getModule("editor/CodeHintManager"),
    EditorManager    = brackets.getModule("editor/EditorManager"),
    DocumentManager  = brackets.getModule("document/DocumentManager"),
	InlineDocsViewer = require("./InlineDocsViewer");

var ARDUINO_CMD_ID 	 = "brackets.arduino";

//Load syntax tips from keywords.json
var hintwords = [], arduinoKeys = [], isKeyword = false, libraryKeys = [], libraryPaths = [],
	constants = { "HIGH": true, "LOW": true, "INPUT": true, "OUTPUT": true, "INPUT_PULLUP": true, "LED_BUILTIN": true };
    
    // Get Arduino Words
    var keywords = JSON.parse(require('text!./data/arduinoHints.json'));
    for (var i in keywords) {
        arduinoKeys.push(i.substring(0, i.lastIndexOf("|")-1));
        hintwords.push(i);
    }
    
    var OS = brackets.platform,
        OSpath = FileSystem.getDirectoryForPath( FileUtils.getNativeModuleDirectoryPath(module) + "/libraries").fullPath;//brackets.arduino.options.librariesdir.fullPath || "";

    CodeMirror.defineMode("ino", function(config) {
        var indentUnit = config.indentUnit;
        function getTokenToCursor(token) {
            var tokenStart = token.token.start,
                tokenCursor = token.pos.ch,
                tokenString = token.token.string;
            return tokenString.substr(0, (tokenCursor - tokenStart));
        }
        function ArduinoHints() {
            this.activeToken = "";
            this.lastToken = "";
            this.cachedKeywords = [];
        }
        
        ArduinoHints.prototype.hasHints = function (editor , implicitChar) {
            this.editor = editor;
            var i = 0,
                cursor = editor.getCursorPos(),
                tokenToCursor = "";
			
            if (OSpath) {
                var rawWordList = editor.document.getText().split("\n");
                libraryPaths = [];
                for (i in rawWordList) {
                    var temp = rawWordList[i].substring(rawWordList[i].lastIndexOf("#include"), rawWordList[i].lastIndexOf(">")+1);
                    temp = temp.substring(temp.lastIndexOf("<")+1, temp.lastIndexOf("."));
                    if (temp) libraryPaths.push(temp);
                }
                libraryPaths = $.unique(libraryPaths);

                for (i in libraryPaths) {
                    var libpath = libraryPaths[i];
                    if (libpath == 'LiquidCrystal_I2C') libpath = 'LiquidCrystal';

                    switch (OS) {
                        case "linux" :
                            libpath = OSpath + libpath + '/' + libpath + '.h';
                            break;
                        case "win" :
                            libpath = OSpath + libpath + '\\' + libpath + '.h';
                            break;
                        case "mac" :
                            libpath = OSpath + libpath + '/' + libpath + '.h';
                            break;
                        default :
                            OSpath = null;
                    }

                    var file = FileSystem.getFileForPath(libpath);
                    var promise = FileUtils.readAsText(file);
                    var libget = promise.done(function (text) {						
						// Get int, void, bool methods
                        var textPublic = text.substring(text.lastIndexOf('public'), text.lastIndexOf('};')).trim().split("\n");
                        for (var k=0; k < textPublic.length; k++) {
                            var temp = textPublic[k].substring(textPublic[k].lastIndexOf("void "), textPublic[k].lastIndexOf("(")+1);
                            temp = temp.substring(temp.lastIndexOf(" ")+1, temp.lastIndexOf("(")).trim();
                            if (temp && temp != '(*)' && temp.indexOf("(") < 0/* && hintwords.indexOf(temp) == -1*/) libraryKeys.push(temp);
                        }
                        for (var k=0; k < textPublic.length; k++) {
                            var temp = textPublic[k].substring(textPublic[k].lastIndexOf("int "), textPublic[k].lastIndexOf("(")+1);
                            temp = temp.substring(temp.lastIndexOf(" ")+1, temp.lastIndexOf("(")).trim();
                            if (temp && temp != '(*)' && temp.indexOf("(") < 0/* && hintwords.indexOf(temp) == -1*/) libraryKeys.push(temp)
                        }
                        for (var k=0; k < textPublic.length; k++) {
                            var temp = textPublic[k].substring(textPublic[k].lastIndexOf("bool "), textPublic[k].lastIndexOf("(")+1);
                            temp = temp.substring(temp.lastIndexOf(" ")+1, temp.lastIndexOf("(")).trim();
                            if (temp && temp != '(*)' && temp.indexOf("(") < 0/* && hintwords.indexOf(temp) == -1*/) libraryKeys.push(temp);
                        }
                        
                        // Get int, unsigned, long, private keys 
                        /*var textPrivate = text.substring(text.lastIndexOf('private'), text.lastIndexOf('};')).trim().split("\n");
						for (var k=0; k < textPrivate.length; k++) {
                            var temp = textPrivate[k].substring(textPrivate[k].lastIndexOf("void "), textPrivate[k].lastIndexOf(";")+1);
                            temp = temp.substring(temp.lastIndexOf(" ")+1, temp.lastIndexOf("(")).trim();
                            if (temp && temp != '(*)' && temp.indexOf("(") < 0)
                                libraryKeys.push(temp);
                        }*/
                    });//.fail(function (errorCode) { console.log("Error: " + errorCode + " at File: " + libpath); });
                    libraryKeys = $.unique(libraryKeys);
                }
            }

            this.activeToken = TokenUtils.getInitialContext(editor._codeMirror, cursor);
            tokenToCursor = getTokenToCursor(this.activeToken);
            if(this.activeToken.token.string.length > 1 || implicitChar=== null)
                for(i = 0; i < this.cachedKeywords.length; ++i)
                    if(this.cachedKeywords[i].indexOf(tokenToCursor) === 0)
                        return true;
            return false;
        };

        ArduinoHints.prototype.getHints = function(implicitChar) {			
            var i = 0,
                hintlist = [],
                keywordlist = [],
                $fhint,
                cursor = this.editor.getCursorPos(),
                tokenToCursor = "";
            
            this.activeToken = TokenUtils.getInitialContext(this.editor._codeMirror,cursor);
            tokenToCursor = getTokenToCursor(this.activeToken);
            
            for(i = 0; i < this.cachedKeywords.length; ++i){
                if(this.cachedKeywords[i].toUpperCase().indexOf(tokenToCursor.toUpperCase()) === 0) {
                    $fhint = $("<span>").text(this.cachedKeywords[i]);
                    hintlist.push($fhint);
                    var poo = ($fhint[0]);
                }
            }
			
			libraryKeys = $.unique(libraryKeys);
            for(i = 0; i < libraryKeys.length; ++i){
                if(libraryKeys[i].toLowerCase().indexOf(tokenToCursor.toLowerCase()) === 0) {
                    $fhint = $("<span>").text(libraryKeys[i]);
                    hintlist.push($fhint);
                    var poo = ($fhint[0]);
                }
            }
			
            hintlist.sort(function(a,b){return (($(a[0]))[0].outerText.length - ($(b[0]))[0].outerText.length);});
            return {
                hints: hintlist,
                match: false,
                selectInitial: true,
                handleWideResults: false
            };
        };
        ArduinoHints.prototype.insertHint = function($hint) {
            var cursor = this.editor.getCursorPos(),
				currentToken        = this.editor._codeMirror.getTokenAt(cursor),
				replaceStart        = {line: cursor.line, ch: currentToken.start},
				replaceEnd          = {line: cursor.line, ch: cursor.ch};
            var code = $hint.text();
			if(code in keywords) {
				code = code.substring(0, code.lastIndexOf("|")-1);
				if(!(code in libraryKeys)) libraryKeys.push(code);
				isKeyword = true;
			}
            this.editor.document.replaceRange(code, replaceStart, replaceEnd);
            return false;
        };
        var ardHints = new ArduinoHints();
		
        AppInit.appReady(function () {
            CodeHintManager.registerHintProvider(ardHints,["ino"],10);
            ardHints.cachedKeywords = hintwords;
        });
        var isOperatorChar = /[+\-*&^%:=<>!|\/]/;
        var curPunc;

        function tokenBase(stream, state) {
            var ch = stream.next();
            if (ch == '"' || ch == "'" || ch == "`") {
                state.tokenize = tokenString(ch);
                return state.tokenize(stream, state);
            }
            if (/[\d\.]/.test(ch)) {
                if (ch == ".") {
                    stream.match(/^[0-9]+([eE][\-+]?[0-9]+)?/);
                } else if (ch == "0") {
                    stream.match(/^[xX][0-9a-fA-F]+/) || stream.match(/^0[0-7]+/);
                } else {
                    stream.match(/^[0-9]*\.?[0-9]*([eE][\-+]?[0-9]+)?/);
                }
                return "number";
            }
            if (/[\[\]{}\(\),;\:\.]/.test(ch)) {
                curPunc = ch;
                return null;
            }
			if (ch == "/") {
                if (stream.eat("*")) {
                    state.tokenize = tokenComment;
                    return tokenComment(stream, state);
                }
                if (stream.eat("/")) {
                    stream.skipToEnd();
                    return "comment";
                }
            }
            if (isOperatorChar.test(ch)) {
                stream.eatWhile(isOperatorChar);
                return "operator";
            }
            stream.eatWhile(/[\w\$_]/);
            var cur = stream.current();
            
			// Library parsing
            if (keywords.propertyIsEnumerable(cur) || cur == "Serial" || cur == "setup" || cur == "loop") { // OR is in libraryPaths[]
                return "library";
            }
            if (keywords.propertyIsEnumerable(cur) || (libraryKeys.indexOf(cur) > -1) || (arduinoKeys.indexOf(cur) > -1)) {
                if (cur == "case" || cur == "default") curPunc = "case";
                isKeyword = false;
                return "keyword";
            }

            if (constants.propertyIsEnumerable(cur))
                return "constant";
            }
            function tokenString(quote) {
                return function(stream, state) {
                    var escaped = false,
                    next, end = false;
            while ((next = stream.next()) != null) {
                if (next == quote && !escaped) {
                    end = true;
                    break;
                }
                escaped = !escaped && next == "\\";
            }
            if (end || !(escaped || quote == "`")) state.tokenize = tokenBase;
            return "string";
            };
        }

        function tokenComment(stream, state) {
            var maybeEnd = false, ch;
            while (ch = stream.next()) {
                if (ch == "/" && maybeEnd) {
                    state.tokenize = tokenBase;
                    break;
                }
                maybeEnd = (ch == "*");
            }
            return "comment";
        }

        function Context(indented, column, type, align, prev) {
            this.indented = indented;
            this.column = column;
            this.type = type;
            this.align = align;
            this.prev = prev;
        }

        function pushContext(state, col, type) {
            return state.context = new Context(state.indented, col, type, null, state.context);
        }

        function popContext(state) {
            var t = state.context.type;
            if (t == ")" || t == "]" || t == "}") state.indented = state.context.indented;
            return state.context = state.context.prev;
        }
        return {
            startState: function(basecolumn) {
                return {
                    tokenize: null,
                    context: new Context((basecolumn || 0) - indentUnit, 0, "top", false),
                    indented: 0,
                    startOfLine: true
                };
            },
            token: function(stream, state) {
                var ctx = state.context;
                if (stream.sol()) {
                    if (ctx.align == null) ctx.align = false;
                    state.indented = stream.indentation();
                    state.startOfLine = true;
                    if (ctx.type == "case") ctx.type = "}";
                }
                if (stream.eatSpace()) return null;
                curPunc = null;
                var style = (state.tokenize || tokenBase)(stream, state);
                if (style == "comment") return style;
                if (ctx.align == null) ctx.align = true;

                if (curPunc == "{") pushContext(state, stream.column(), "}");
                else if (curPunc == "[") pushContext(state, stream.column(), "]");
                else if (curPunc == "(") pushContext(state, stream.column(), ")");
                else if (curPunc == "case") ctx.type = "case";
                else if (curPunc == "}" && ctx.type == "}") ctx = popContext(state);
                else if (curPunc == ctx.type) popContext(state);
                state.startOfLine = false;
                return style;
            },

            indent: function(state, textAfter) {
                if (state.tokenize != tokenBase && state.tokenize != null) return 0;
                var ctx = state.context,
                firstChar = textAfter && textAfter.charAt(0);
                if (ctx.type == "case" && /^(?:case|default)\b/.test(textAfter)) {
                    state.context.type = "}";
                    return ctx.indented;
                }
                var closing = firstChar == ctx.type;
                if (ctx.align) return ctx.column + (closing ? 0 : 1);
                else return ctx.indented + (closing ? 0 : indentUnit);
            },

                electricChars: "{}:",
                blockCommentStart: "/*",
                blockCommentEnd: "*/",
                lineComment: "//"
        };
    });

    var docs = JSON.parse(require('text!./data/arduinoDocs.json'));
    function inlineProvider(hosteditor,pos){
        var sel = hosteditor.getSelection();
        
		if (sel.start.line !== sel.end.line) return null;
        
		var currentDoc = DocumentManager.getCurrentDocument().getText();
        var lines = currentDoc.split("\n");
        var line = lines[sel.start.line];
        var text = line.substr(sel.start.ch,sel.end.ch - sel.start.ch);
        var result = new $.Deferred();
        var array;
        for(var i = 0; i < docs.length; ++i) {
            if(docs[i].Name == text){
                array = docs[i];
            }
        }
/*
        for(var i = 0; i < array.Additional.length; ++i){
            if($.inArray(array.Additional[i],hintwords) == -1) {
                array.Additional.splice(i,1);
            }
        }
        */
        if(array){
            var inlineWidget = new InlineDocsViewer(    array.Name,
                                                        "ino",
                                                        {   SUMMARY:array.Desc,
                                                            SYNTAX: array.Syn,
                                                            URL:"http://labs.arduino.org/tiki-index.php?page="+ array.Name,
                                                            BASEURL:"http://labs.arduino.org/tiki-index.php?page=",
                                                            EXAMPLES: array.Examples,
                                                            ADDITIONAL: array.Additional
                                                        }
                                                    );
            inlineWidget.load(hosteditor);
            result.resolve(inlineWidget);
            return result.promise();
        }
    }

	CodeMirror.defineMIME("text/x-ino", "ino");
    LanguageManager.defineLanguage("ino", {
        name: "Arduino",
        mode: "ino",
        fileExtensions: ["ino"],
        blockComment: ["/*","*/"],
        lineComment: ["//","//"]
    });
    
    EditorManager.registerInlineDocsProvider(inlineProvider);
});
