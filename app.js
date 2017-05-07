"use strict";
var globalVar = require("./global.js");
var logmodule = require("./logmodule.js");
var broker    = require("./broker.js");
var actions   = require("./actions.js");
var triggers  = require("./triggers.js");


exports.init = function() {
   // get the arguments of any trigger. Once triggered, the interval will stop
   Homey.log("MQTT client ready")

   triggers.getTriggerArgs().then(function() {
      triggers.listenForMessage();
      triggers.setArgumentChangeEvent();
      actions.registerActions();
   });
}

function changedSettings(callback, args) {
   logmodule.writelog("changedSettings called");
   logmodule.writelog(args.body);
   logmodule.writelog("topics:" + globalVar.getTopicArray())

   if (globalVar.getTopicArray().length > 0) {
      broker.getConnectedClient().unsubscribe(globalVar.getTopicArray());
      globalVar.clearTopicArray();
   };

   if (broker.getConnectedClient() !== null) {
      broker.getConnectedClient().end(true);
   }

   logmodule.writelog("topics:" + globalVar.getTopicArray());
   broker.clearConnectedClient();
   triggers.getTriggerArgs();
   callback(false, null);
}

module.exports.changedSettings = changedSettings;
module.exports.getLogLines = logmodule.getLogLines;
module.exports.getUserArray = globalVar.getUserArray;

