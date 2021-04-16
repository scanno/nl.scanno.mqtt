"use strict";

const DEBUG = process.env.DEBUG === '1';

const topicMatches = require('./topicmatches');
const TriggerQueue = require('./TriggerQueue');

class handlingMQTT {

   constructor(app) {
      this.logmodule = app.logmodule;
      this.triggers  = app.triggers;
      this.broker    = app.broker;
      this.Homey     = app.homey;

      this.triggerQueue = new TriggerQueue(app);
   }

   /**
    * receiveMessage - Handling of received messages.
    * This gets called as soon as the client receives a message published
    * on a subscribed topic
    *
    * @param  {type} topic   topic where message was published on
    * @param  {type} buffer  payload of the received message
    * @return {type}         no return value
    */
   async receiveMessage(topic, buffer) {
      this.logmodule.writelog('info', "received '" + buffer.toString() + "' on '" + topic + "'");

      const message = buffer.toString();
      this.triggerQueue.add(topic, message);
      this.dispatchToRealtimeApi(topic, message);
   }

   /**
    * removeTopic - Handling of unsubscribed topics
    * Clears any remaining messages for the topic in the trigger queue
    * @param {string} topic unsubscribed topic 
    */
   removeTopic(topic) {
      this.triggerQueue.removeMessagesForTopic(topic);
   }

   dispatchToRealtimeApi(topic, message) {
      var messageToSend;
      try {
         messageToSend = JSON.parse(message);
      } catch (err) {
         messageToSend = message;
      }

      if(this.broker.getTopicsRegistry().hasApiMatch(topic)) {
         if(DEBUG) {
            this.logmodule.writelog('debug', "send message to listeners via realtime api");
            this.logmodule.writelog('debug', topic + ": " + message);
         }
         this.Homey.api.realtime(topic, messageToSend);
      } else {
         if(DEBUG) {
            this.logmodule.writelog('debug', "Skip realtime no match found for api topic.");
         }
      }
   }

   /**
    * updateRef - updates references to other classes
    *
    * @param  {type} app reference to the main app instance
    * @return {type}     no return value
    */
   updateRef(app) {
      this.triggers = app.triggers;
      this.broker = app.broker;

      this.triggerQueue.updateRef(app);
   }
}

module.exports = handlingMQTT;
