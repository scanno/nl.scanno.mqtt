"use strict";

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
      const existingTopics = this.broker.getTopicArray().getTriggerTopics() || [];
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

   topicMatches(topic, wildcard) {
      // MQTT subscription topics can contain "wildcards", i.e a + sign. However the topic returned
      // by MQTT brokers contain the topic where the message is posted on. In that topic, the wildcard
      // is replaced by the actual value. So we will have to take into account any wildcards when matching the topics.
      // MQTT subscription topics can contain "wildcards", i.e a + sign. However the topic returned
      // by MQTT brokers contain the topic where the message is posted on. In that topic, the wildcard
      // is replaced by the actual value. So we will have to take into account any wildcards when matching the topics.

      this.logmodule.writelog ('info', "topic: "+topic+" pattern: "+wildcard);
      if (topic === wildcard) {
         return true;
      } else if (wildcard === '#') {
         return true;
      }
      var res = [];
      var t = String(topic).split('/');
      var w = String(wildcard).split('/');

      var i = 0;
      for (var lt = t.length; i < lt; i++) {
         if (w[i] === '+') {
               res.push(t[i]);
         } else if (w[i] === '#') {
               res.push(t.slice(i).join('/'));
               return true;
         } else if (w[i] !== t[i]) {
               return false;
         }
      }

      if (w[i] === '#') {
         i += 1;
      }

      if (i === w.length) {
         return true;
      } else {
         return false;
      }
   }

   processMessage(args, state) {
      var reconnectClient = false;

      // Make a connection to the broker. But only do this once. When the app is started, the connectedClient
      // variable is set to null, so there is no client connection yet to the broker. If so, then connect to the broker.
      // Otherwise, skip the connection.
      this.broker.connectToBroker();

      this.logmodule.writelog ('debug', "checking state.topic = " + state.triggerTopic + " topic = " + args.mqttTopic)

      if (this.topicMatches(state.triggerTopic, args.mqttTopic)) {
        this.logmodule.writelog ('info', "trigger topic = " + state.triggerTopic + " message topic = " + args.mqttTopic)
        return true;
      } else {
        this.logmodule.writelog('debug', "We are not waiting for this topic");
        return false;
      }
   }

   getEventMQTT() {
      return this.eventMQTT;
   }
}

module.exports = triggerMQTT;
