"use strict";
var mqtt      = require("mqtt");
var connectedTopics = [];

function receiveMessage(topic, message, args, state) {
   var geofence = ""
   var event = ""
   console.log("received '" + message.toString() + "' on '" + topic + "'");

   // parse message as json and get 2 values:
   // desc contains the geofence name that was entered of left
   // event contains the action, i.e. : enter or leave
   JSON.parse(message.toString(), function(k, v) {
      switch (k) {
         case "desc":
            console.log("geofence: " + v + " arg: "+ args.nameGeofence);
            geofence = v;
            break;
         case'event':
            console.log("event: " + v);
            event = v;
            break;
      }
      return v;        // return everything else unchanged
   });
   switch (event.toString()) {
      case 'enter':
         Homey.manager('flow').trigger('enterGeofence', null, { triggerTopic: topic, triggerFence: geofence });
         console.log("Trigger enter card for " + geofence);
         break;
      case 'leave':
         Homey.manager('flow').trigger('leaveGeofence', null, { triggerTopic: topic, triggerFence: geofence });
         console.log("Trigger leave card for " + geofence);
         break;
   }
   Homey.manager('flow').trigger('eventOwntracks', { eventType: event.toString() }, { triggerTopic: topic, triggerFence: geofence });
   console.log("Trigger generic card for " + geofence);
}

function processMessage (callback, args, state) {
   // connect to the MQTT broker
   var connect_options = "[{ username: '" + Homey.manager('settings').get('user') + "', password: '" + Homey.manager('settings').get('password') + "' }]" 
   var client  = mqtt.connect('mqtt://' + Homey.manager('settings').get('url'), connect_options)
   console.log ("state.topic = " + state.triggerTopic + " topic = " + args.mqttTopic + " state.fence = " + state.triggerFence + " geofence = " + args.nameGeofence)

   // If the topic that triggered me the topic I was waiting for?
   if (state.triggerTopic == args.mqttTopic ) {
      client.end();
      console.log ("triggerTopic = equal" )
      // The topic is equal, but we also need the geofence to be equal, if not then the 
      // callback should be false
      if ( state.triggerFence == args.nameGeofence) {
         console.log ("triggerFence = equal")
         callback ( null, true);
      } else {
         callback ( null, false);
      }
      callback( null, true )
   }
   // This is not the topic I was waiting for and it is a known topic
   else if (state.triggerTopic !== args.mqttTopic & connectedTopics.indexOf(args.mqttTopic) !== -1) {
      console.log("We are not waiting for this topic");
      client.end()
      callback( null, false )
   }
   // this is (still) an unknown topic. We arrive her only 1 time for every topic. The next time the if and else if will
   // trigger first.
   else {
      // Fill the array with known topics so I can check if I need to subscribe
      connectedTopics.push(args.mqttTopic)
      // On connection ...
      client.on('connect', function () {
         // subscribe to the topic
         client.subscribe(args.mqttTopic)
         console.log("waiting "+ args.mqttTopic );
         // Wait for any message
         client.on('message',function(topic, message, packet) {
            // When a message is received, call receiveMessage for further processing
            receiveMessage(topic, message, args, state);
         });
      });
   };
}

function listenForMessage () {
   // Start listening for the events
   Homey.manager('flow').on('trigger.eventOwntracks', processMessage)
   Homey.manager('flow').on('trigger.enterGeofence', processMessage)
   Homey.manager('flow').on('trigger.leaveGeofence', processMessage)    
}

function getArgs () {
   // Give all the triggers a kick to retrieve the arg(topic) defined on the trigger.
   Homey.manager('flow').trigger('eventOwntracks', { eventType: 'Hallo homey' }, { triggerTopic: 'x', triggerFence: 'x' }, function(err, result) {
      if( err ) {
         return Homey.error(err)
     }
   });
   Homey.manager('flow').trigger('enterGeofence', { eventType: 'Hallo homey' }, { triggerTopic: 'x', triggerFence: 'x' }, function(err, result) {
      if( err ) {
         return Homey.error(err)
     }
   });

   Homey.manager('flow').trigger('leaveGeofence', { eventType: 'Hallo homey' }, { triggerTopic: 'x', triggerFence: 'x' }, function(err, result) {
      if( err ) {
         return Homey.error(err)
     }
   });
}

function listenForAction () {
   Homey.manager('flow').on('action.pub_mqtt_message', function( callback, args ){
      // Read the URL from the settings.
      var connect_options = "[{ username: '" + Homey.manager('settings').get('user') + "', password: '" + Homey.manager('settings').get('password') + "' }]"
      console.log("connect_options = " + connect_options) 
      var client  = mqtt.connect('mqtt://' + Homey.manager('settings').get('url'), connect_options);
      client.on('connect', function () {
         client.publish(args.mqtt_topic, args.geofence_name, args.mqtt_message);
         console.log("send " + args.mqtt_message + " on topic " + args.mqtt_topic);
         client.end();
      });
      callback( null, true ); // we've fired successfully
   });
}

exports.init = function() {
   // get the arguments of any trigger. Once triggered, the interval will stop
   console.log ("MQTT client Ready")
   var myTim = setInterval(timer, 5000)
   function timer() {
      getArgs()
   }
   Homey.manager('flow').on('trigger.eventOwntracks', function( callback, args ){
      clearInterval(myTim)
   });
   Homey.manager('flow').on('trigger.enterGeofence', function( callback, args ){
      clearInterval(myTim)
   });
   Homey.manager('flow').on('trigger.leaveGeofence', function( callback, args ){
      clearInterval(myTim)
   });
    
   listenForMessage()
   listenForAction()
}
