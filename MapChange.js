// Github:   https://github.com/TheWhiteWolves/MapChange.git
// By:       TheWhiteWolves
// Contact:  https://app.roll20.net/users/1043/thewhitewolves

// TODO List:
// * Add more options to commands
// Done * !mc refresh                           - Refreshes the public and private maps.
// Done * !mc rejoin                            - Removes the senders's playerspecificpages entry and moves 
//                                                them back to the global players tab.
// Done * !mc rejoin [player name]              - Removes the provided player's playerspecificpages entry and  
//                                                moves them back to the global players tab.
// Done * !mc move [map name]                   - Moves te sender to the map with the provided name.
//                                                (GM required for private maps)
// Done * !mc move [player name] [map name]     - Moves the sender with the provided name to the map with the 
//                                                provided name. (GM required for private maps)
// Done * !mc moveall [map name]                - Empties playerspecificpages and moves all players to the
//                                                map with the provided name. (GM Only)
// Done * !mc menu [show]                       - Provides a chat based menu for players to use to teleport.
//                                                See https://github.com/TheWhiteWolves/MapChange/issues/4
//      * !mc help                              - Display help on how to use the script.
//                                                See https://github.com/TheWhiteWolves/MapChange/issues/3

// Note for Users: When usng a command from the list above that wants you to specify a parameter you need to use
// --player [player name] for the name of the player and --target [map name] for the name of the map.

// e.g. !mc move --player TheWhiteWolves --target Forest of Boland

// The name and the parameter marker must be seperated by a space and each parameter set must be seperated by a space,
// it is ok to have spaces the the map or player names, see the map name in the example.

// Also note that when you are in the GM view (i.e. logged in as GM) the move commands will not change your view,
// it is only able to change the view from the players perspective, so if you goto My Settings > Join as Player when in
// your campaign you will see it has changed your view as a player but not as a GM.
// See https://github.com/TheWhiteWolves/MapChange/issues/5

var MapChange = MapChange || (function() {
    'use strict';
    // Config
    // Set to true to use built in debug statements
    var debug = true,
    // Set to false to turn off notifing the GM when a player moves.
    gmNotify = true,
    // When true places the pages with name containing the marker into the public list.
    // Use this if you want maps to be private by default instead of public by default.
    invertedMarker = false,
    // The marker used to decide what is placed in the private map.
    marker = "[GM]",
    // These are maps that players are able to move to using the commands.
    publicMaps = {},
    // These are maps that only the GM can move people to.
    privateMaps = {},
    
    // Constructs the private and public maps for use in the api script.
    constructMaps = function() {
        // Get an object containing all the pages in the campaign.
        var pages = findObjs({_type: 'page'});
        
        // Loop through the pages adding them to their relevent maps.
        for (var key in pages) {
            // Get the name of the page that is current being processed.
            var name = pages[key].get("name");
            // Get the id of the page that is current being processed.
            var id = pages[key].get("_id");
            
            // Check if the name of the page contains the marker.
            if (name.indexOf(marker) > -1) {
                // If the name does then remove the marker from the name and trim off any whitespace.
                name = name.replace(marker, "").trim();
                // If invertedMarker is being used then place the name and id of the page in the 
                // public map else place it in the private map.
                invertedMarker ? publicMaps[name] = id : privateMaps[name] = id;
            }
            else {
                // If the name does not contain the marker then place the name and id in the public map
                // if invertedMarker is being used else place it in the private map.
                invertedMarker ? privateMaps[name] = id : publicMaps[name] = id;
            }
        }
        
        // Debug
        if (debug) {
            log("Public:");
            log(publicMaps);
            log("Private:");
            log(privateMaps);
        }
    },
    
    // Handle the input message call for the api from the chat event.
    handleInput = function(msg) {
        // Check that the message sent is for the api, if not return as we don't need to do anything.
        if (msg.type !== "api") {
            return;
        }
        
        // Grab the contents of the msg sent and split it into the individual arguments.
        var args = msg.content.split(/\s+--/);
        // Parse the first section of the arguments to get an array containing the commands.
        var commands = parseCommands(args.shift());
        // Parse the remaining aruments to get any parameters passed in.
        var params = parseParameters(args);
        
        // Check the lower cased version of the message to see if it contains the call for
        // this script to run, if it doesn't then return.
        switch (commands.shift().toLowerCase()) {
            case "!mapchange":
            case "!mc":
                // Check to see if any further commands were passed in and process them, else
                // show the help test on how to use the script.
                if (commands.length > 0) {
                    // Process the remaining commands with the passed in paramters.
                    processCommands(msg, commands, params);
                }
                else {
                    // Show the sender the script help message.
                    showHelp(msg);
                }
                break;
            default:
                // If we reached here it means that the call to the api was not meant for us.
                return;
        }
    },
    
    // Parses the commands of the call to the api script.
    parseCommands = function(args) {
        // Split the arguments by spaces and return the array containing them all.
        return args.split(/\s+/);
    },
    
    // Parses the parameters of the call to the api script.
    parseParameters = function(args) {
        // Declare a new object to hold the parameters.
        var params = {};
        // Loop through all the passed in arguments and construct them in into the parameters.
        for (var param in args) {
            // Split the parameter down by spaces and temporarily store it.
            var tmp = args[param].split(/\s+/);
            // Take the first element in tmp and use it as the parameter name and reassemble the
            // remaining elements and replace the commas with spaces for the parameter value.
            params[tmp.shift()] = tmp.join().replace(/,/g, " ");
        }
        // Return the constructed object of parameters.
        return params;
    },
    
    // Processes the commands provided in the call to the api script.
    processCommands = function(msg, commands, params) {
        // Take the command and decide what function to run.
        switch (commands.shift().toLowerCase()) {
            case "help":
                // Send the help text to the player who sent the message.
                showHelp(msg);
                break;
            case "menu":
                // Specify the default show behaviour to be "all".
                var show = "all";
                // Check to see if the show parameter was provided in the api call.
                if (params.hasOwnProperty("show")) {
                    // If it was then check that it is not empty and if it isn't then change show to 
                    // the value of the parameter.
                    show = (params.show !== "") ? params.show.toLowerCase() : "all";
                }
                // Show the menu to the sender of the api call with the applicable filters.
                showMenu(msg, show);
                break;
            case "refresh":
                // Refresh the public and private maps to pull in any changes made since the script
                // was last started.
                refresh(msg);
                break;
            case "move":
                // Check to see if the sender has provided and target map for the move, if they
                // haven't then send them a chat message to tell them it is missing.
                if (params.hasOwnProperty("target")) {
                    // Check to see if the sender has provided a player to be moved, if they 
                    // haven't then user the id of the sender.
                    if (params.hasOwnProperty("player")) {
                        // Move the provided player to the map with the provided name.
                        move(msg, getPlayerIdFromDisplayName(params.player), params.target);
                    }
                    else {
                        // Move the sender to the map with the provided name.
                        move(msg, msg.playerid, params.target);
                    }
                }
                else {
                    // Send a chat message to tell teh sender that they missed the target map parameter.
                    chat("/w", msg.who, "Target map parameter missing, use !mc help to see how to use this script.");
                }
                break;
            case "rejoin":
                // Check to see if a player name was provided, if so then run rejoin on that player only if
                // the sender is either a GM or the provided player is the sender.
                if (params.hasOwnProperty("player")) {
                    // Check the sender is either a GM or the provided player.
                    if (playerIsGM(msg.playerid) || params.player === msg.who) {
                        // Run the rejoin on the provided player.
                        rejoin(msg, getPlayerIdFromDisplayName(params.player));
                    }
                    else {
                        // Send a warning to the sender to tell tehm that they cannot perform the action.
                        chat("/w", msg.who, "You do not have the permission required to perform that action.");
                    }
                }
                else {
                    // Run rejoin on the sender of the api call.
                    rejoin(msg, msg.playerid);
                }
                break;
            case "moveall":
                // Move all the players back to the bookmark and then move the bookmark to the map with
                // the provided name.
                moveall(msg, params.target);
                break;
            default:
                // Show the scripts help text is no further command was provided.
                showHelp(msg);
                break;
        }
    },

    // Convert the provided display name into the player id for that player.
    getPlayerIdFromDisplayName = function(name) {
        // Find all the player objects in the campaign.
        var players = findObjs({_type: 'player'});
        // Loop through them and try to convert the display name into the player's id.
        for (var key in players) {
            // Check if the current players display name is equal to the provided one.
            if (players[key].get("_displayname") === name) {
                // If it is then return that players id.
                return players[key].get("_id");
            }
        }
        // If no match was found then return undefined.
        return undefined;
    },
    
    // Convert the provided player id into the display name for that player.
    getDisplayNameFromPlayerId = function(id) {
        // Find all the player objects in the campaign.
        var players = findObjs({_type: 'player'})
        // Loop through them and try to convert the id into the player's display name.
        for (var key in players) {
            // Check if the current players id is equal to the provided one.
            if (players[key].get("_id") == id) {
                // If it is then return that players display name.
                return players[key].get("_displayname");
            }
        }
        // If no match was found then return undefined.
        return undefined;
    },

    // TODO
    showHelp = function(msg) {
        chat("/w", msg.who, "TODO: Add Help");
        log("TODO: Add Help");
    },
    
    // Displays a chat based menu for the teleportation, this provides users with  a set of
    // easy to use api buttons in the chat that will launch the commands for them.
    showMenu = function(msg, show) {
        // Specify what the max display length of the map names will be on the api buttons.
        var displayLength = 20;
        // Find all the player objects in the campaign.
        var players = findObjs({_type: 'player'});
        // Create the variable to hold the assembled menu text.
        var text = "";
        // Check if the show parameter is set to show any of the maps.
        if (show === "all" || show === "public" || show === "private") {
            // Start off the chat message with the Available Maps title.
            text += "Available Maps: ";
        }
        // Check if the "show" parameter is set to either "all" or "public".
        if (show === "all" || show === "public") {
            // If it is then loop through the map displaying an api button for each one.
            for(var key in publicMaps) {
                // Generate an api button with the map name that will teleport the user to that map.
                // If the map name is longer than 20 characters then trim it and add an elipse.
                text += "[" + ((key.length > displayLength) ? key.substr(0, displayLength) + "..." : key) + "](!mc move --target " + key + ")";
                // Check if the calling player is a GM or not.
                if(playerIsGM(msg.playerid)) {
                    // If they are then add extra GM only buttons.
                    // Add a button to teleport all players to the chosen map.
                    text += "[All](!mc moveall --target " + key + ")";
                    // Add a button to teleport a differnet player to the chosen map.
                    text += "[Other](!mc move --target " + key + " --player ?{Player";
                    // Loop through the players in the campaign adding them to the dropdown for the Other command.
                    for (var key in players) {
                        // Add the current players name with any brackets replaced for their ASCII equivalents.
                        text += "|" + players[key].get("_displayname").replace("(", ch("(")).replace(")", ch(")"));
                    }
                    // Complete the Other api button.
                    text += "})";
                }
            }
        }
        // Check if the "show" parameter is set to either "all" or "private".
        if (show === "all" || show === "private") {
            // If it is then check if the calling player is a GM or not.
            if (playerIsGM(msg.playerid)) {
                // If they are then loop through the map displaying an api button for each one.
                for(var key in privateMaps) {
                    // Generate an api button with the map name that will teleport the user to that map.
                    // If the map name is longer than 20 characters then trim it and add an elipse.
                    text += "[" + ((key.length > displayLength) ? key.substr(0, displayLength) + "..." : key) + "](!mc move --target " + key + ")";
                    // Add a button to teleport all players to the chosen map.
                    text += "[All](!mc moveall --target " + key + ")";
                    // Add a button to teleport a differnet player to the chosen map.
                    text += "[Other](!mc move --target " + key + " --player ?{Player";
                    // Loop through the players in the campaign adding them to the dropdown for the Other command.
                    for (var key in players) {
                        // Add the current players name with any brackets replaced for their ASCII equivalents.
                        text += "|" + players[key].get("_displayname").replace("(", ch("(")).replace(")", ch(")"));
                    }
                    // Complete the Other api button.
                    text += "})";
                }
            }
        }
        // Check if the "show" paramter is set to either "all" or "utilities"/"utils".
        if (show === "all" || show === "utilities" || show === "utils") {
            // Add in the title for the utilities section.
            text += "Utilities: ";
            // Add an api button for the rejoin command.
            text += "[Rejoin](!mc rejoin)";
            // Check if the caller is a GM or not.
            if (playerIsGM(msg.playerid)) {
                // If they are then add an api button for the map refresh command.
                text += "[Refresh](!mc refresh)";
            }
            // Add an api button for the help command.
            text += "[Help](!mc help)";
        }
        
        // Debug
        if(debug) {
            log(show);
            log(text);
        }
        
        // Send the assembled menu text to the chat to be displayed.
        chat("/w", msg.who, text);
    },

    refresh = function(msg) {
        log("Refreshing Maps...");
        publicMaps = {};
        privateMaps = {};
        constructMaps();
        log("Refresh Complete");
        
        if (gmNotify) {
            chat("/w", msg.who, "Map Refresh Complete");
        }
    },
    
    move = function(msg, sender, target) {
        var pages = findObjs({_type: 'page'});
        var playerPages = Campaign().get("playerspecificpages");
        var differentSender = false;
        
        if (msg.playerid != sender) {
            differentSender = true;
        }
        
        if (playerPages === false) {
            playerPages = {};
        }
        
        if (target in publicMaps) {
            // Move player.
            if(sender in playerPages) {
                delete playerPages[sender];
            }
            playerPages[sender] = publicMaps[target];
            
            if (gmNotify) {
                var playerAddition = ((differentSender) ? getDisplayNameFromPlayerId(sender) + " " : "");
                chat("/w", "gm", msg.who.replace("(GM)", "") + " has moved " + playerAddition + "to " + target);
            }
        }
        else if (target in privateMaps) {
            if (playerIsGM(msg.playerid)) {
                // Move player.
                if (sender in playerPages) {
                    delete playerPages[sender];
                }
                playerPages[sender] = privateMaps[target];
                
                if (gmNotify) {
                    var playerAddition = ((differentSender) ? getDisplayNameFromPlayerId(sender) + " " : "");
                    chat("/w", "gm", msg.who.replace("(GM)", "") + " has moved " + playerAddition + "to " + target);
                }
            }
        }
        else {
            // Report Map not found.
            chat("/w", msg.who, "Map " + target + "not found");
        }
        
        Campaign().set("playerspecificpages", false);
        Campaign().set("playerspecificpages", playerPages);
    },

    rejoin = function(msg, sender) {
        var playerPages = Campaign().get("playerspecificpages");
        if (playerPages !== false) {
            if (sender in playerPages) {
                delete playerPages[sender];
                Campaign().set("playerspecificpages", false);
            }
        }
        if (_.isEmpty(playerPages)) {
            playerPages = false;
        }
        Campaign().set("playerspecificpages", playerPages);
        
        if (gmNotify) {
            chat("/w", "gm", msg.who.replace("(GM)", "") + " has rejoined the bookmark");
        }
    },

    moveall = function(msg, target) {
        if (playerIsGM(msg.playerid)) {
            var bookmarkPage = Campaign().get("playerpageid");
            if (target in publicMaps) {
                Campaign().set("playerspecificpages", false);
                bookmarkPage = publicMaps[target];
                
                if (gmNotify) {
                    chat("/w", "gm", "All players have moved to " + target);
                }
            }
            else if (target in privateMaps) {
                Campaign().set("playerspecificpages", false);
                bookmarkPage = privateMaps[target];
                
                if (gmNotify) {
                    chat("/w", "gm", "All players have moved to " + target);
                }
            }
            else {
                chat("/w", msg.who, "Map " + target + " not found");
            }
            
            Campaign().set("playerpageid", bookmarkPage);
        }
    },
    
    chat = function(type, who, message) {
        who = who.split(" ")[0].replace("(GM)", "");
        sendChat("MapChange", type + " " + who + " " + message, {noarchive:true});
    },

    // Converts the special character provided into its ASCII html code.
    // Credit to The Aaron, Arcane Scriptomancer - https://app.roll20.net/users/104025/the-aaron
    ch = function (c) {
    	var entities = {
			'<' : 'lt',
			'>' : 'gt',
			"'" : '#39',
			'@' : '#64',
			'{' : '#123',
			'|' : '#124',
			'}' : '#125',
			'[' : '#91',
			']' : '#93',
			'"' : 'quot',
			'-' : 'mdash',
			' ' : 'nbsp'
		};

		if(_.has(entities,c) ){
			return ('&'+entities[c]+';');
		}
		return '';
	},

    registerEventHandlers = function() {
        on('chat:message', handleInput);
    };

    return {
        ConstructMaps: constructMaps,
        RegisterEventHandlers: registerEventHandlers
    };
}());

on("ready", function() {
    'use strict';
    
    log("Map Change Started");
    MapChange.ConstructMaps();
    log("Maps Constructed");
    MapChange.RegisterEventHandlers();
    log("Map Change Ready");
});
