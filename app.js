"use strict";
const Homey = require('homey');

const brokerMQTT  = require("./broker.js");
const actionsMQTT = require("./actions.js");
const triggerMQTT = require("./triggers.js");

class MQTTApp extends Homey.App {

   /*
      Initialize the MQTT Client app. Register all variables,
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

   async changedSettings(body) {
      this.logmodule.writelog("changedSettings called");

      // unsubscribe from all registered topics, but keep the registration.
      const topics = this.broker.getTopicsRegistry().getTopics() || [];
      let visited = new Set();
      for(let topic of topics) {
        if(!visited.has(topic.getTopicName())) {
          visited.add(topic.getTopicName());
          await this.broker.unsubscribeFromTopic(topic, true, true);
        }
      }

      // disconnect
      if (this.broker.getConnectedClient() !== null) {
         this.broker.getConnectedClient().end(true);
         this.broker.clearConnectedClient();
      }
      
      // re-connect with new settings
      // NOTE: When the client is connected, all existing topics will be re-subscribed
      this.broker.connectToBroker();
      
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
        if (body !== undefined) {
            try {
                return this.broker.sendMessageToTopic(body);
            } catch (error) {
                this.logmodule.writelog('error', error);
            }
        }
    }

    async subscribeToTopic(topic, reference) {
        this.logmodule.writelog('info', 'API: subscribe to topic: ' + topic);
        return await this.broker.subscribeToApiTopic(topic, reference);
    }

    async unsubscribeFromTopic(topic, reference) {
      this.logmodule.writelog('info', 'API: unsubscribe from topic: ' + topic);
      if(reference === 'trigger' || reference === 'api') {
        this.logmodule.writelog('info', '[WARNING] Unsubscribe from topic not allowed');
        return;
      }
      return await this.broker.unsubscribeFromTopicName(topic, reference || 'api');
    }
    async unsubscribeFromAllTopicsForReference(reference) {
        this.logmodule.writelog('info', 'API: unsubscribe from topics with reference: ' + reference);
      return await this.broker.unsubscribeFromAllTopicsWithReference(reference);
    }
}
module.exports = MQTTApp;
