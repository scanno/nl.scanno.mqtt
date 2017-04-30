"use strict";
var globalVar = require("./global.js");
var logmodule = require("./logmodule.js");
var broker    = require("./broker.js");
var actions   = require("./actions.js");


function processMessage (callback, args, state) {
   var reconnectClient = false;

   // Make a connection to the broker. But only do this once. When the app is started, the connectedClient
   // variable is set to null, so there is no client connection yet to the broker. If so, then connect to the broker.
   // Otherwise, skip the connection.
   broker.connectToBroker(args, state);

   logmodule.writelog ("state.topic = " + state.triggerTopic + " topic = " + args.mqttTopic)

   // MQTT subscription topics can contain "wildcards", i.e a + sign. However the topic returned
   // by MQTT brokers contain the topic where the message is posted on. In that topic, the wildcard
   // is replaced by the actual value. So we will have to take into account any wildcards when matching the topics.

   var arrTriggerTopic = state.triggerTopic.split('/');
   var arrMQTTTopic = args.mqttTopic.split('/');
   var matchTopic = true;

   for (var value in arrTriggerTopic) {
      if ((arrTriggerTopic[value] !== arrMQTTTopic[value]) && (arrMQTTTopic[value] !== '+')) {
         // This is a bit dirty because it would allow events to be delivered also to topics that do not have
         // the trailing event. In de future, when allowing the other message types, this would cause problems
         if (arrMQTTTopic[value] !== undefined) {
            matchTopic = false;
         }
      }
   };

   // If the topic that triggered me the topic I was waiting for?
   if (matchTopic == true) {
      console.log ("triggerTopic = equal" )
      callback( null, true )
   }
   // This is not the topic I was waiting for and it is a known topic
   else if (state.triggerTopic !== args.mqttTopic & globalVar.getTopicArray().indexOf(args.mqttTopic) !== -1) {
      logmodule.writelog("We are not waiting for this topic");
      callback( null, false )
   }
   // this is (still) an unknown topic. We arrive her only 1 time for every topic. The next time the if and else if will
   // trigger first.
   else {
      // Add another check for the existence of the topic, just in case there is somehting falling through the 
      // previous checks...

      broker.subscribeToTopic(args.mqttTopic);
   };
   callback (null, false);
}


function listenForMessage () {
   // Start listening for the events.
   Homey.manager('flow').on('trigger.eventMQTT', processMessage)
}

function getArgs () {
   // Give all the triggers a kick to retrieve the arg(topic) defined on the trigger.
   Homey.manager('flow').trigger('eventMQTT', { message: 'Hallo homey' }, { triggerTopic: 'x' }, function(err, result) {
      if( err ) {
         return Homey.error(err)
     }
   });
}

function setArgumentChangeEvent() {
   // We need to know when an argument in a trigger has changed, has been added or removed.
   // If so, we need to change, remove or add topic subscriptions. So register to the 
   // trigger update event.
   Homey.manager('flow').on('trigger.eventMQTT.update', function( callback ) {
      logmodule.writelog("Trigger changed" );

      // get the new arguments
      Homey.manager('flow').getTriggerArgs('eventMQTT', function( err, args ) {
         logmodule.writelog("topics:" + globalVar.getTopicArray());

         // Check if there are already subscribed topics. If so, then unsubsribe because we 
         // need to loop through all triggers and just unsubscribe and re-subscribe again is faster.
         if (globalVar.getTopicArray().length > 0) {
            broker.getConnectedClient().unsubscribe(globalVar.getTopicArray());
            globalVar.clearTopicArray();
         };
         // `args` is an array of trigger objects, one entry per flow
         args.forEach(function(element) {
            logmodule.writelog("Trigger Arguments: " + element.mqttTopic);
            if (broker.getConnectedClient() == null) {
               broker.connectToBroker();
            }
            broker.subscribeToTopic(element.mqttTopic);
         });
         getArgs();
         logmodule.writelog("topics:" + globalVar.getTopicArray());
      });

      // always fire the callback, it's reserved for future argument validation
      callback( null, true );
   });
}

exports.init = function() {
   // get the arguments of any trigger. Once triggered, the interval will stop
   Homey.log("MQTT client ready")

/*   var myTim = setInterval(timer, 5000)
   function timer() {
      getArgs()
   }
   Homey.manager('flow').on('trigger.eventMQTT', function( callback, args ){
      clearInterval(myTim)
   });
*/   
   getArgs();
   listenForMessage();
   setArgumentChangeEvent();
   actions.registerActions();
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
   getArgs();
   callback(false, null);
}

module.exports.changedSettings = changedSettings;
module.exports.getLogLines = logmodule.getLogLines;
module.exports.getUserArray = globalVar.getUserArray;

