var globalVar = require("./global.js");
var logmodule = require("./logmodule.js");
var broker    = require("./broker.js");

module.exports = {
   registerActions: function() {
      registerActions();
   }
}

function registerActions() {
   logmodule.writelog("registerActions called");

   // Put all the action trigger here for registering them and executing the action
   
   // Action for sending a message to the broker on the specified topic
   Homey.manager('flow').on('action.publishMQTT', function( callback, args ){
      logmodule.writelog("Send flow triggered");
      broker.sendMessageToTopic(args);
      callback( null, true ); // we've fired successfully
   });
   
}

function homeySayString(args) {
   Homey.manager('speech-output').say( args.voiceString, function (err, result ) {
      logmodule.writelog(err);
      logmodule.writelog(result);
   });
}

