"use strict";

const DEBUG = process.env.DEBUG === '1';

const topicMatches = require('./topicmatches');

class triggerMQTT {

   constructor (app) {
      this.broker    = app.broker
      this.logmodule = app.logmodule;
      this.Homey = app.homey;
      this.eventMQTT = null;
      this.OnInit();
   }

   async OnInit() {
      this.logmodule.writelog("info", "triggerMQTT.OnInit() called");
      this.eventMQTT = this.Homey.flow.getTriggerCard('eventMQTT');

      await this.registerTopics();
      this.setArgumentChangeEvent();
      this.listenForMessages();
   }

   setArgumentChangeEvent() {
      // We need to know when an argument in a trigger has changed, has been added or removed.
      // If so, we need to change, remove or add topic subscriptions. So register to the
      // trigger update event.
      this.eventMQTT.on('update', async () => {
         this.logmodule.writelog('info', "Trigger changed" );
         await this.registerTopics();
      });
   }

   async registerTopics() {
      // process all trigger argument values (all topics from the flow cards)
      this.logmodule.writelog('info', "Updating trigger topic subscriptions");

      const values = await this.eventMQTT.getArgumentValues();
      const topics = values.map(v => v.mqttTopic);
      const existingTopics = Array.from(this.broker.getTopicsRegistry().getTriggerTopicNames() || []);
      const newTopics = new Set(topics.filter(t => !existingTopics.includes(t)));      // unique values
      const removedTopics = new Set(existingTopics.filter(t => !topics.includes(t)));  // unique values

      // unsubscribe from removed topics
      for(let removeTopic of removedTopics) {
         try {
            await this.broker.unsubscribeFromTopicName(removeTopic, 'trigger');
         } catch(error) {
            this.logmodule.writelog('info', "Failed to unsubscribe from trigger topic: " + removeTopic);
            this.logmodule.writelog('error', error);
         }
      }

      // subscribe to the new topics
      for(let newTopic of newTopics) {
         try {
            await this.broker.subscribeToTopic(newTopic);
         } catch(error) {
            this.logmodule.writelog('info', "Failed to subscribe to trigger topic: " + newTopic);
            this.logmodule.writelog('error', error);
         }
      }
      this.logmodule.writelog('debug', "Finished updating trigger topic subscriptions");
   }

   listenForMessages() {
      // Start listening for the events.
      this.eventMQTT.registerRunListener((args, state ) => {
         this.logmodule.writelog('info', "Listener eventMQTT called");
         try {
            if ( this.processMessage(args, state)) {
               return Promise.resolve( true );
            } else {
               return Promise.resolve( false );
            }
          } catch(err) {
            this.logmodule.writelog('error', "Error in Listener eventMQTT: " +err);
            return Promise.reject(err);
          }
      })
   }

   processMessage(args, state) {
      // Make a connection to the broker. But only do this once. When the app is started, the connectedClient
      // variable is set to null, so there is no client connection yet to the broker. If so, then connect to the broker.
      // Otherwise, skip the connection.
      this.broker.connectToBroker();

      this.logmodule.writelog ('debug', "checking state.topic = " + state.triggerTopic + " topic = " + args.mqttTopic)

      if (topicMatches(state.triggerTopic, args.mqttTopic)) {
        this.logmodule.writelog ('info', "trigger topic = " + state.triggerTopic + " message topic = " + args.mqttTopic)
        return true;
      } else {
         if(DEBUG) {
            this.logmodule.writelog('debug', "We are not waiting for this topic");
         }
        return false;
      }
   }

   getEventMQTT() {
      return this.eventMQTT;
   }
}

module.exports = triggerMQTT;
