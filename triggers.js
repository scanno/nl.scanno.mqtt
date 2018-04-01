"use strict";
//const globalVarMQTT = require("./global.js");

class triggerMQTT {

   constructor (app) {
      this.broker    = app.broker
 //     this.globalVar = new globalVarMQTT;
      this.globalVar = app.globalVar;
//      this.logmodule = require("./logmodule.js");
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
         if (this.globalVar.getTopicArray().length > 0) {
            this.globalVar.clearTopicArray();
         };
         this.logmodule.writelog('info', "Registered topics:" + this.globalVar.getTopicArray());
         await this.getEventMQTTArgs().then((result) => {
            this.logmodule.writelog('info', "Registered topics:" + this.globalVar.getTopicArray());
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
         await this.eventMQTT.getArgumentValues(function( err, values ) {
            values.forEach(function(element) {
               ref.logmodule.writelog('info', "Trigger Arguments for eventMQTT: " + element.mqttTopic);
               ref.broker.subscribeToTopic(element.mqttTopic);
            });
            ref.logmodule.writelog('info', "boe");
            return true;
         });
      } catch(err) {
         this.logmodule.writelog('error', "getEventMQTTArgs: " +err);
         return err;
      }
   }

   processMessage(args, state) {
      var reconnectClient = false;

      // Make a connection to the broker. But only do this once. When the app is started, the connectedClient
      // variable is set to null, so there is no client connection yet to the broker. If so, then connect to the broker.
      // Otherwise, skip the connection.
      this.broker.connectToBroker(args, state);

      this.logmodule.writelog ('info', "state.topic = " + state.triggerTopic + " topic = " + args.mqttTopic)

      // MQTT subscription topics can contain "wildcards", i.e a + sign. However the topic returned
      // by MQTT brokers contain the topic where the message is posted on. In that topic, the wildcard
      // is replaced by the actual value. So we will have to take into account any wildcards when matching the topics.

      var arrTriggerTopic = state.triggerTopic.split('/');
      var arrMQTTTopic = args.mqttTopic.split('/');
      var matchTopic = true;
      var hashWildcard = false;

      for (var value in arrTriggerTopic) {
         this.logmodule.writelog('debug', "arrTriggerTopic["+value+"] = "+arrMQTTTopic[value]);
         if (arrMQTTTopic[value] === '#') {
            this.logmodule.writelog('debug', "hashWildcard set to true because # detected");
            hashWildcard = true;
         }
         if ((arrTriggerTopic[value] !== arrMQTTTopic[value]) && (arrMQTTTopic[value] !== '+')) {
            // This is a bit dirty because it would allow events to be delivered also to topics that do not have
            // the trailing event. In de future, when allowing the other message types, this would cause problems
            if ((arrMQTTTopic[value] !== undefined) && (hashWildcard == false)) {
               matchTopic = false;
            }
         }
      };

      // If the topic that triggered me the topic I was waiting for?
      if (matchTopic == true) {
         console.log ("triggerTopic = equal" )
         return true;
      }
      // This is not the topic I was waiting for and it is a known topic
      else if (state.triggerTopic !== args.mqttTopic & this.globalVar.getTopicArray().indexOf(args.mqttTopic) !== -1) {
         this.logmodule.writelog('info', "We are not waiting for this topic");
         return false;
      };
      return false;
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
            ref.logmodule.writelog('info', "topics:" + ref.globalVar.getTopicArray());

            // Check if there are already subscribed topics. If so, then unsubsribe because we
            // need to loop through all triggers and just unsubscribe and re-subscribe again is faster.
            if (ref.globalVar.getTopicArray().length > 0) {
               ref.broker.getConnectedClient().unsubscribe(ref.globalVar.getTopicArray());
               ref.globalVar.clearTopicArray();
            };
            // `args` is an array of trigger objects, one entry per flow
            values.forEach(function(element) {
               ref.logmodule.writelog('info', "Trigger Arguments: " + element.mqttTopic);
               ref.broker.subscribeToTopic(element.mqttTopic);
            });
            ref.logmodule.writelog('info', "topics:" + ref.globalVar.getTopicArray());
         });

      });
   }

   getEventMQTT() {
      return this.eventMQTT;
   }
}

module.exports = triggerMQTT;
