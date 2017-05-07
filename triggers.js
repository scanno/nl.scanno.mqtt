var broker    = require("./broker.js");
var globalVar = require("./global.js");
var logmodule = require("./logmodule.js");

module.exports = {
   getTriggerArgs: function() {
      return getTriggerArgs();
   },
   listenForMessage: function() {
      listenForMessage();
   },
   setArgumentChangeEvent: function() {
      setArgumentChangeEvent();
   }
}


function listenForMessage () {
   // Start listening for the events.
   Homey.manager('flow').on('trigger.eventMQTT', processMessage);
}


function getTriggerArgs() {
   return new Promise(function (fulfill, reject) {
      if (globalVar.getTopicArray().length > 0) {
        globalVar.clearTopicArray();
      };
      logmodule.writelog("Registered topics:" + globalVar.getTopicArray());
      return getEventMQTTArgs().then(function() {
         logmodule.writelog("Registered topics:" + globalVar.getTopicArray());
         fulfill(true);
      });
   });
}

function getEventMQTTArgs() {
   return new Promise(function (fulfill, reject) {
      Homey.manager('flow').getTriggerArgs('eventMQTT', function( err, args ) {
         args.forEach(function(element) {
            logmodule.writelog("Trigger Arguments for eventMQTT: " + element.mqttTopic);
            broker.subscribeToTopic(element.mqttTopic);
         });
         fulfill(true);
      });
   });
}


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
   };
   callback (null, false);
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
            broker.subscribeToTopic(element.mqttTopic);
         });
         logmodule.writelog("topics:" + globalVar.getTopicArray());
      });

      // always fire the callback, it's reserved for future argument validation
      callback( null, true );
   });
}



