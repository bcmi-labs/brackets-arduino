// Italian

/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50 */
/*global define */

define({
    "ARDUINO": {
        "MENU": {
            "SKETCH": {
                "TITLE"             : "Sketch",
                "ITEM_BUILD"        : "Verifica / Compila",
                "ITEM_ADD_FILE"     : "Aggiungi file",
                "ITEM_IMPORT_LIB"   : "Importa libreria",
                "ITEM_SHOW_FOLDER"  : "Mostra cartella sketch"
            },
            "TOOLS": {
                "TITLE"                   : "Strumenti",
                "ITEM_AUTO_FORMATTING"    : "Auto formattazione",
                "ITEM_STORE_SKETCH"       : "Archivia sketch",
                "ITEM_SERIAL_MONITOR"     : "Monitor seriale",
                "ITEM_DEBUGGER"           : "Debugger",
                "ITEM_BOARD"              : "Scheda",
                "ITEM_PORT"               : "Porta",
                "ITEM_PROGRAMMER"         : "Programmatore",
                "ITEM_BURN_BOOTLOADER"    : "Scrivi bootloader"
            },
            "EDIT": {
                "TITLE"                 : "Modifica",
                "ITEM_COPY_FORUM"       : "Copia per forum",
                "ITEM_COPY_HTML"        : "Copia come HTML",
                "ITED_FIND_SELECTED"    : "Trova testo selezionato"
            },
            "FILE": {
                "TITLE"                    : "File",
                "ITEM_OPEN_SAMPLES"        : "Apri esempi",
                "ITEM_UPLOAD"              : "Carica",
                "ITEM_UPLOAD_USE_PROGR"    : "Carica tramite programmatore",
                "ITEM_PRINT_PAGE_SETTING"  : "Impostazioni pagina per la stampa",
                "ITEM_PRINT"               : "Stampa",
                "ITEM_PREFERENCES"         : "Preferenze"
            },
            "HELP": {
                "TITLE"        : "Aiuto",
                "ITEM_DRIVER"  : "Installa driver Arduino",
                "ITEM_ABOUT"   : "Arduino"
            }
        },
        "TOOLBAR": {
            "BTN_TLT_BUILD"         : "Verifica",
            "BTN_TLT_UPLOAD"        : "Carica",
            "BTN_TLT_NEW_FILE"      : "Nuovo",
            "BTN_TLT_SAVE_FILE"     : "Salva",
            "BTN_TLT_OPEN_FILE"     : "Apri",
            "BTN_TLT_CONSOLE"       : "Console",
            "BTN_TLT_SERIAL_MONITOR": "Monitor Seriale",
            "BTN_TLT_SIDEBAR"       : "Mostra/Nascondi Barra laterale"
        },
        "STATUS_BAR": {
            "DEF_LBL_PORT"      : "Seleziona porta",
            "DEF_LBL_BOARD"     : "Seleziona scheda"
        },
        "PANEL": {
            "SERIAL_MONITOR": {
                "TITLE"                 : "Monitor Seriale",
                "LBL_AUTOSCROLL"        : "Autoscroll",
                "LBL_BAUD_RATE"         : "Baud Rate",
                "LBL_EOL"               : "Carattere di fine linea",
                "LBL_MESSAGE"           : "Messaggio",
                "LBL_LOG"               : "Log",
                "BTN_TLT_SEND_MESSAGE"  : "Invia messaggio",
                "BTN_TLT_CLEAR"         : "Pulisci tutto",
                "OPT_DEFAULT_BAUD_RATE"         : "Seleziona Baud Rate",
                "OPT_DEFAULT_EOL"               : "Seleziona carattere di fine linea",
                "OPT_EOL": {
                    "NA"                    : "Nessun carattere di fine linea",
                    "NL"                    : "Nuova linea (NL)",
                    "CR"                    : "Ritorno carrello (CR)",
                    "NLCR"                  : "Entrambe (NL &amp; CR)"
                }
            },
            "CONSOLE": {
                "TITLE"                 : "Console"
            },
            "DOCS": {
                "PARAMETERS"         : "Parametri",
                "EXAMPLES"           : "Esempi",
                "SYNTAX"             : "Sintassi",
                "RETURNS"            : "Ritorno",
                "SEEALSO"            : "Vedi anche"
            }
        },
        "DIALOG": {
            "LATEST" : {
                "TITLE"             : "Ottieni l'ultima versione",
                "LBL_DOWNLOAD_IT"   : "Scarica da",
                "LBL_DOWNLOAD_HERE" : "qui",
                "LBL_CHANGELOG"     : "Changelog",
                "LBL_UPTODATE"      : "Hai già l'ultima versione"
            },
            "PORT": {
                "TITLE"             : "Seleziona porta",
                "LBL_SELECT"        : "Seleziona la tua porta",
                "OPT_DEFAULT"       : "Nessuna porta selezionata...",
                "OPT_SERIAL"        : "Porte seriali",
                "OPT_NETWORK"       : "Porte di rete"
            },
            "BOARD": {
                "TITLE"             : "Seleziona scheda",
                "LBL_SELECT"        : "Seleziona la tua scheda",
                "OPT_DEFAULT"       : "Nessuna scheda selezionata..."
            },
            "PROGRAMMER": {
                "TITLE"             : "Seleziona programmatore",
                "LBL_SELECT"        : "Seleziona il tuo programmatore",
                "OPT_DEFAULT"       : "Nessun programmatore selezionato..."
            },
            "ABOUT":{
                "TITLE"     : "Arduino!"
            },
            "IMPORT_LIBRARIES": {
                "TITLE"         : "Importa librerie",
                "BTN_FOLDER"    : "Importa da cartella",
                "BTN_ARCHIVE"   : "Importa da archivio zip",
                "LBL_IMPORTED"  : "Librerie importate",
                "TH_NAME"       : "Nome",
                "TH_ADD"        : "Aggiungi"
            },
            "PREFERENCE" : {
                "TITLE"                     : "Preferenze",
                "LBL_SKETCHBOOK_PATH"       : "Percorso della cartella degli sketch",
                "LBL_VERBOSE_OUTPUT"        : "Mostra un output dettagliato durante",
                "LBL_BUILD"                 : "Compilazione",
                "LBL_UPLOAD"                : "Caricamento",
                "LBL_FONT_SIZE"             : "Dimensioni font dell'editor (px)",
                "LBL_CHECK_UPDATE"          : "Controlla aggiornamenti all'avvio",
                "BTN_SKETCHBOOK_BROWSE"     : "Sfoglia"
            },
            "GENERIC" :{
                "TITLE_SELECT_FILE":    "Seleziona file",
                "TITLE_SELECT_FOLDER":  "Seleziona cartella"
            }
        },
        "WEB": {
            "SITE": {
                "TITLE"     : "Arduino Web Site",
                "URL"       : "http://arduino.org",
                "NAME"      : "arduino.org"
            },
            "LABS": {
                "TITLE"     : "Arduino Labs",
                "URL"       : "http://labs.arduino.org",
                "NAME"      : "labs.arduino.org"
            },
            "TWITTER": {
                "TITLE"     : "Twitter",
                "NAME"      : "ArduinoOrg",
                "URL"       : "https://twitter.com/ArduinoOrg"
            },
            "FACEBOOK": {
                "TITLE"     : "Facebook",
                "NAME"      : "arduino.org",
                "URL"       : "https://www.facebook.com/arduino.org"
            },
            "GITHUB": {
                "TITLE"     : "GitHub",
                "NAME"      : "arduino-org",
                "URL"       : "http://github.com/arduino-org"
            }
        },
        "MESSAGE": {
            "OK"                : "Ok",
            "CANCEL"            : "Annulla",
            "SUCCESS_LOAD"      : "Caricamento completato",
            "ERROR_LOAD"        : "Errore di caricamento"
        },
        "EXTRAS":{
            "COMING_SOON"         : "Disponibile a breve",
            "WIP"                 : "In lavorazione",
            "SOURCE"              : "Codice sorgente"
        }
    }
});