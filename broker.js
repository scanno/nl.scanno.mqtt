var mqtt      = require("mqtt");
var globalVar = require("./global.js");
var logmodule = require("./logmodule.js");
var handleMessage = require("./messagehandling.js");

var connectedClient = null;
var reconnectClient = false;

module.exports = {
   connectToBroker: function(args, state) {
      connectToBroker(args, state);
   },
   subscribeToTopic: function(topicName) {
      subscribeToTopic(topicName);
   },
   sendMessageToTopic: function(args) {
      sendMessageToTopic(args);
   },
   getConnectedClient: function() {
      return connectedClient;
   },
   clearConnectedClient: function() {
      connectedClient = null;
   }
}


function getBrokerURL() {
   var urlBroker = []
    
   if (Homey.manager('settings').get('otbroker') == true) {
      urlBroker.push("mqtt://");
      urlBroker.push("broker.hivemq.com:1883");
   } else {
      if (Homey.manager('settings').get('tls') == true) {
        urlBroker.push("mqtts://");
      } else {
         urlBroker.push("mqtt://");
      };
      urlBroker.push(Homey.manager('settings').get('url'));
      urlBroker.push(":"+Homey.manager('settings').get('ip_port'));
   }
   logmodule.writelog("Broker URL: "+ urlBroker.join(''));
   return urlBroker.join('');
}

function getConnectOptions() {

  if (Homey.manager('settings').get('otbroker') == true) {
      return null;
   } else {
      var rejectUnauth = "true";
      if ( Homey.manager('settings').get('selfsigned') == true) {
         rejectUnauth = "false";
      }
      var connect_options = {
         keepalive: 10,
         username: Homey.manager('settings').get('user'),
         password: Homey.manager('settings').get('password'),
         rejectUnauthorized: rejectUnauth
      };
      logmodule.writelog("rejectUnauthorized: " + connect_options.rejectUnauthorized);
      return connect_options
   };
}

function connectToBroker(args, state) {
   if (connectedClient == null) {
      logmodule.writelog("connectedClient == null");
      connectedClient = mqtt.connect(getBrokerURL(), getConnectOptions());

      connectedClient.on('reconnect', function() {
         logmodule.writelog("MQTT Reconnect");
         reconnectClient = true;
       });

      connectedClient.on('close', function() {
         logmodule.writelog("MQTT Closed");
         reconnectClient = true;
       });

      connectedClient.on('offline', function() {
         logmodule.writelog("MQTT Offline");
         reconnectClient = true;
       });

      connectedClient.on('error', function(error) {
         logmodule.writelog("MQTT error occured: " + error);
      });

      connectedClient.on('message',function(topic, message, packet) {
         // When a message is received, call receiveMessage for further processing
         logmodule.writelog("OnMessage called");
         handleMessage.receiveMessage(topic, message, args, state);
      });
   };
}

function subscribeToTopic(topicName) {
   if ( globalVar.getTopicArray().indexOf(topicName) == -1 ) {

      // Fill the array with known topics so I can check if I need to subscribe
      globalVar.getTopicArray().push(topicName);

      // On connection ...
      connectedClient.on('connect', function (connack) {
         logmodule.writelog("MQTT client connected");
         logmodule.writelog("Connected Topics: " + globalVar.getTopicArray());
         logmodule.writelog("reconnectedClient " + reconnectClient);

         connectedClient.subscribe(topicName)
         logmodule.writelog("waiting "+ topicName );
      });
   }
}

function sendMessageToTopic(args) {
   // Check if there is already a connection to the broker
   logmodule.writelog("SendMessageToTopic called");
   if (connectedClient == null) {
      // There is no connection, so create a connection and send the message
      var client = mqtt.connect(getBrokerURL(), getConnectOptions());
      client.on('connect', function () {
         client.publish(args.mqttTopic, args.mqttMessage, function() {
            logmodule.writelog("send " + args.mqttMessage + " on topic " + args.mqttTopic);
            client.end();
         });
      });
   } else {
      // There is already a connection, so the message can be send
      connectedClient.publish(args.mqttTopic, args.mqttMessage, function() {
         logmodule.writelog("send " + args.mqttMessage + " on topic " + args.mqttTopic);
      });
   }
}
