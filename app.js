"use strict";
var mqtt      = require("mqtt");
var connected = [];

function processMessage (callback, args, state) {
   // connect to the MQTT broker
   var connect_options = "[{ username: '" + Homey.manager('settings').get('user') + "', password: '" + Homey.manager('settings').get('password') + "' }]" 
   var client  = mqtt.connect('mqtt://' + Homey.manager('settings').get('url'), connect_options)
   console.log ("state = " + state + " topic = " + args.mqttTopic)

   // If the topic that triggered me the topic I was waiting for?
   if (state == args.mqttTopic) {
      client.end()
      callback( null, true )
   }

   // This is not the topic I was waiting for and it is a known topic
   else if (state !== args.mqttTopic & connected.indexOf(args.mqttTopic) !== -1) {
      client.end()
      callback( null, false )
   }

   // this is (still) an unknown topic. We arrive her only 1 time for every topic. The next time the if and else if will
   // trigger first.
   else {
      // Fill the array with known topics so I can check if I need to subscribe
      connected.push(args.mqttTopic)
      // On connection ...
      client.on('connect', function () {
         // subscribe to the topic
         client.subscribe(args.mqttTopic)
         console.log("waiting "+ args.mqttTopic );
         // Wait for any message
         client.on('message',function(topic, message, packet) {
            var geofence = ""
            var event = ""
            console.log("received '" + message.toString() + "' on '" + topic + "'");
              
            // parse message as json and get 2 values:
            // desc contains the geofence name that was entered of left
            // event contains the action, i.e. : enter or leave
            JSON.parse(message.toString(), function(k, v) {
               if ( k === 'desc') {
                  console.log("geofence: " + v);
                  geofence = v;
               }
               if ( k === 'event') {
                  console.log("event: " + v);
                  event = v;
               }
               return v;        // return everything else unchanged
            });
            // Fill the state and pass it as a parameter to the flow manager
            state = topic
            // trigger the flow, it will end up in the first if above

            if ( args.nameGeofence === geofence ) {
               Homey.manager('flow').trigger('eventOwntracks', {
                  eventType: event.toString()
               }, state);
            } else {
               Homey.manager('flow').trigger('eventOwntracks', {
                  eventType: message.toString()
  	       }, state);
  	    }
         });
      });
   };
}

function listenForMessage () {
     var state = "x"
     Homey.manager('flow').on('trigger.eventOwntracks', processMessage)
}

function getArgs () {
   // Give all the triggers a kick to retrieve the arg(topic) defined on the trigger.
   Homey.manager('flow').trigger('eventOwntracks', { eventType: 'Hallo homey' }, 'x', function(err, result) {
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
  
   listenForMessage()
   listenForAction()
}
