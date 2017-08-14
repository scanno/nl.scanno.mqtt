"use strict";
const Homey = require('homey');

var globalVar = require("./global.js");
var logmodule = require("./logmodule.js");
var broker    = require("./broker.js");
var actions   = require("./actions.js");
var triggers  = require("./triggers.js");


class MQTTApp extends Homey.App {

   /*
      Initialize the Owntracks app. Register all variables,
      Connect to the broker when the broker is used.
      Register triggers, actions and conditions
   */
   onInit() {
      triggers.listenForMessage();
//      triggers.getTriggerArgs().then(function()
triggers.getTriggerArgs();
         try {
            triggers.setArgumentChangeEvent();
            actions.registerActions();
         } catch(err) {
            logmodule.writelog('error', "App: " +err);
         }
  //    });
   }

   changedSettings(args) {
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
      return true;
   }

   getLogLines() {
      return logmodule.getLogLines();
   }

   /*
      getUserArray: Getter for returning the user array to settings.
   */
   getUserArray() {
      return globalVar.getUserArray();
   }

}
module.exports = MQTTApp;

