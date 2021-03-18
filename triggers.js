"use strict";

class triggerMQTT {

   constructor (app) {
      this.broker    = app.broker
      this.logmodule = app.logmodule;
      this.Homey     = require('homey');
      this.eventMQTT = null;
      this.OnInit();
   }

   OnInit() {
      this.logmodule.writelog("info", "triggerMQTT.OnInit() called");
      this.listenForMessage();
      this.getTriggerArgs();
      this.setArgumentChangeEvent();
   }

   listenForMessage() {
      // Start listening for the events.
      this.eventMQTT = new this.Homey.FlowCardTrigger('eventMQTT');
      this.eventMQTT.register();

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

   async getTriggerArgs() {
      const ref = this;
      try {
         if (this.broker.getTopicArray().getTriggerTopicArray().length > 0) {
           this.logmodule.writelog('info', "Cleaning topic array");
           this.broker.getTopicArray().clearTopicArray();
         }
         this.logmodule.writelog('info', "Registered topics:" + this.broker.getTopicArray().getTriggerTopics());
         await this.getEventMQTTArgs().then((result) => {
            this.logmodule.writelog('info', "Registered topics:" + this.broker.getTopicArray().getTriggerTopics());
            return true;
         });
      } catch(err) {
         this.logmodule.writelog('error', "getTriggerArgs: "+err);
         return err;
      }
   }

   async getEventMQTTArgs() {
      const ref = this;
      try {
        const values = await this.eventMQTT.getArgumentValues();
        (values || []).forEach(function(element) {
          ref.logmodule.writelog('info', "Trigger Arguments for eventMQTT: " + element.mqttTopic);
          ref.broker.subscribeToTopic(element.mqttTopic);
        });
        return true;
      } catch(err) {
        this.logmodule.writelog('error', "getEventMQTTArgs: " +err);
        throw err;
      }
  }

  topicMatches(topic, pattern) {
    // MQTT subscription topics can contain "wildcards", i.e a + sign. However the topic returned
    // by MQTT brokers contain the topic where the message is posted on. In that topic, the wildcard
    // is replaced by the actual value. So we will have to take into account any wildcards when matching the topics.
    // MQTT subscription topics can contain "wildcards", i.e a + sign. However the topic returned
    // by MQTT brokers contain the topic where the message is posted on. In that topic, the wildcard
    // is replaced by the actual value. So we will have to take into account any wildcards when matching the topics.

    this.logmodule.writelog ('info', "topic: "+topic+" pattern: "+pattern);
    const regex = new RegExp('^' + pattern.replace(/\+/, '[^/]+').replace(/#/, '.+') + '$');
    var result = regex.test(topic);
    this.logmodule.writelog ('info', "regex test result: "+result);
    return result;
  }


   processMessage(args, state) {
      var reconnectClient = false;

      // Make a connection to the broker. But only do this once. When the app is started, the connectedClient
      // variable is set to null, so there is no client connection yet to the broker. If so, then connect to the broker.
      // Otherwise, skip the connection.
      this.broker.connectToBroker(args, state);

      this.logmodule.writelog ('info', "state.topic = " + state.triggerTopic + " topic = " + args.mqttTopic)

      if (this.topicMatches(state.triggerTopic, args.mqttTopic)) {
        console.log ("triggerTopic = equal" )
        return true;
      } else {
        this.logmodule.writelog('info', "We are not waiting for this topic");
        return false;
      }
   }

   setArgumentChangeEvent() {
      const ref = this;
      // We need to know when an argument in a trigger has changed, has been added or removed.
      // If so, we need to change, remove or add topic subscriptions. So register to the
      // trigger update event.
      this.eventMQTT.on('update', () => {
         this.logmodule.writelog('info', "Trigger changed" );

         // get the new arguments
         this.eventMQTT.getArgumentValues(function( err, values ) {
            ref.logmodule.writelog('info', "topics:" + ref.broker.getTopicArray().getTriggerTopics());

            // Check if there are already subscribed topics. If so, then unsubsribe because we
            // need to loop through all triggers and just unsubscribe and re-subscribe again is faster.
            if (ref.broker.getTopicArray().getTriggerTopicArray().length > 0) {
               ref.broker.getConnectedClient().unsubscribe(ref.broker.getTopicArray().getTriggerTopics());
               ref.logmodule.writelog('info', "Unsubscribing topics:" + ref.broker.getTopicArray().getTriggerTopics());
               ref.broker.getTopicArray().clearTopicArray();
            };
            // `args` is an array of trigger objects, one entry per flow
            values.forEach(function(element) {
               ref.logmodule.writelog('info', "Trigger Arguments: " + element.mqttTopic);
               ref.broker.subscribeToTopic(element.mqttTopic);
            });
            ref.logmodule.writelog('info', "topics:" + ref.broker.getTopicArray().getTriggerTopics());
         });
      });
   }

   getEventMQTT() {
      return this.eventMQTT;
   }
}

module.exports = triggerMQTT;
