"use strict";
const Homey = require('homey');

const globalVarMQTT = require("./global.js");
//const logmodule = require("./logmodule.js");
const brokerMQTT    = require("./broker.js");
const actionsMQTT   = require("./actions.js");
const triggerMQTT  = require("./triggers.js");

//var globalVar = null;

class MQTTApp extends Homey.App {
   /*
      Initialize the Owntracks app. Register all variables,
      Connect to the broker when the broker is used.
      Register triggers, actions and conditions
   */
   onInit() {
      this.logmodule = require("./logmodule.js");
      this.globalVar = new globalVarMQTT(this);
      this.broker = new brokerMQTT(this);
      this.triggers = new triggerMQTT(this);
      this.actions = new actionsMQTT(this);
      
      this.broker.updateRef(this);
   }

   changedSettings(args) {
      this.logmodule.writelog("changedSettings called");
      this.logmodule.writelog(args.body);
      this.logmodule.writelog("topics:" + this.globalVar.getTopicArray())

      if (this.globalVar.getTopicArray().length > 0) {
         this.broker.getConnectedClient().unsubscribe(this.globalVar.getTopicArray());
         this.globalVar.clearTopicArray();
      };

      if (this.broker.getConnectedClient() !== null) {
         this.broker.getConnectedClient().end(true);
      }

      this.logmodule.writelog("topics:" + this.globalVar.getTopicArray());
      this.broker.clearConnectedClient();
      this.triggers.getTriggerArgs();
      return true;
   }

   getLogLines() {
      return this.logmodule.getLogLines();
   }

   /*
      getUserArray: Getter for returning the user array to settings.
   */
   getUserArray() {
      return this.globalVar.getUserArray();
    }

    sendMessage(args) {
        if (args !== undefined) {
            try {
                return this.broker.sendMessageToTopic(args.body);
            } catch (error) {
                this.logmodule.writelog('error', error);
            }
        }
    }
}
module.exports = MQTTApp;

