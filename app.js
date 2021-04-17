"use strict";
const Homey = require('homey');

const brokerMQTT    = require("./broker.js");
const actionsMQTT   = require("./actions.js");
const triggerMQTT  = require("./triggers.js");

class MQTTApp extends Homey.App {

   /*
      Initialize the Owntracks app. Register all variables,
      Connect to the broker when the broker is used.
      Register triggers, actions and conditions
   */
   async onInit() {
      this.logmodule = require("./logmodule.js");
      this.broker = new brokerMQTT(this);
      this.triggers = new triggerMQTT(this);
      this.actions = new actionsMQTT(this);

      this.broker.updateRef(this);
    }

   changedSettings(body) {
      this.logmodule.writelog("changedSettings called");
      this.logmodule.writelog("topics:" + this.broker.getTopicArray().getTopics())

      if (this.broker.getTopicArray().getTopics().length > 0) {
         this.broker.getConnectedClient().unsubscribe(this.broker.getTopicArray().getTopics());
         this.broker.getTopicArray().clearTopicArray();
      };

      if (this.broker.getConnectedClient() !== null) {
         this.broker.getConnectedClient().end(true);
      }

      this.logmodule.writelog("topics:" + this.broker.getTopicArray().getTopics());
      this.broker.clearConnectedClient();
      this.triggers.getTriggerArgs();
      return true;
   }

   getLogLines() {
      return this.logmodule.getLogLines();
   }

   /**
    * sendMessage - Publish a message on a given topic.
    *                  The MQTT broker used is configured in the MQTT client settings.
    *                  If there is no connection, one is setup to the broker.
    *
    * @param  {type} body JSON object containing:
    *                     mqttTopic: Topic the message should be published on
    *                     mqttMessage: Message payload that is posted on the topic.
    *                     qos: 0, 1 or 2 representing the quality of service to be used.
    *                     retain: true when sending as retained message or false.
    * @return {type}      returns an error object on failure or true when succesfull
    */
    sendMessage(body) {
        let response = {
          result: -1,
          error: ""
        }
        if (body !== undefined) {
            try {
              this.broker.sendMessageToTopic(body);
              response.result = 0;
              return response;
            } catch (error) {
                this.logmodule.writelog('error', error);
                response.error=error;
            }
        }
        return response;
    }

    subscribeToTopic(topic, callback) {
        let response = {
          result: -1,
          error: ""
        }
        this.logmodule.writelog('info', 'API: subscribe to topic: ' + topic);
        try {
          this.broker.subscribeToApiTopic(topic, callback);
          response.result=0;
        } catch (error) {
          response.error = error;
        }
        return response;
    }
}
module.exports = MQTTApp;
