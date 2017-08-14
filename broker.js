const Homey     = require('homey');

var mqtt      = require("mqtt/node_modules/mqtt");
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
    
   if (Homey.ManagerSettings.get('otbroker') == true) {
      urlBroker.push("mqtt://");
      urlBroker.push("broker.hivemq.com:1883");
   } else {
      if (Homey.ManagerSettings.get('tls') == true) {
        urlBroker.push("mqtts://");
      } else {
         urlBroker.push("mqtt://");
      };
      urlBroker.push(Homey.ManagerSettings.get('url'));
      urlBroker.push(":"+Homey.ManagerSettings.get('ip_port'));
   }
   logmodule.writelog('info', "Broker URL: "+ urlBroker.join(''));
   return urlBroker.join('');
}

function getConnectOptions() {

  if (Homey.ManagerSettings.get('otbroker') == true) {
      return null;
   } else {
      var clientID = 'homey_' + Math.random().toString(16).substr(2, 8);
      var rejectUnauth = "true";
      if ( Homey.ManagerSettings.get('selfsigned') == true) {
         rejectUnauth = "false";
      }
      if ( Homey.ManagerSettings.get('custom_clientid') == true) {
         clientID = Homey.ManagerSettings.get('clientid');
      }
      logmodule.writelog('info', "clientID = "+ clientID);
      var connect_options = {
         keepalive: 10,
         username: Homey.ManagerSettings.get('user'),
         password: Homey.ManagerSettings.get('password'),
         rejectUnauthorized: rejectUnauth,
         clientId: clientID
      };
      logmodule.writelog('info', "rejectUnauthorized: " + connect_options.rejectUnauthorized);
      return connect_options
   };
}

function connectToBroker(args, state) {
   if (connectedClient == null) {
      logmodule.writelog("connectedClient == null");
      connectedClient = mqtt.connect(getBrokerURL(), getConnectOptions());

      // On connection ...
      connectedClient.on('connect', function (connack) {
         logmodule.writelog('info', "MQTT client connected");
         logmodule.writelog('info', "Connected Topics: " + globalVar.getTopicArray());
         logmodule.writelog('info', "reconnectedClient " + reconnectClient);
//         connectedClient.subscribe(topicName)
      });

      connectedClient.on('reconnect', function() {
         logmodule.writelog('info', "MQTT Reconnect");
         reconnectClient = true;
       });

      connectedClient.on('close', function() {
         logmodule.writelog('info', "MQTT Closed");
         reconnectClient = true;
       });

      connectedClient.on('offline', function() {
         logmodule.writelog('info', "MQTT Offline");
         reconnectClient = true;
       });

      connectedClient.on('error', function(error) {
         logmodule.writelog('error', "MQTT error occured: " + error);
      });

      connectedClient.on('message',function(topic, message, packet) {
         // When a message is received, call receiveMessage for further processing
         logmodule.writelog('info', "OnMessage called");
         handleMessage.receiveMessage(topic, message, args, state);
      });
   };
}

function subscribeToTopic(topicName) {
   if ( globalVar.getTopicArray().indexOf(topicName) == -1 ) {

      // Fill the array with known topics so I can check if I need to subscribe
      globalVar.getTopicArray().push(topicName);
      if (connectedClient == null) {
         connectToBroker();
      }
      connectedClient.subscribe(topicName);
   }
}

function sendMessageToTopic(args) {
   // Check if there is already a connection to the broker
   logmodule.writelog('info', "SendMessageToTopic called");
   if (connectedClient == null) {
      // There is no connection, so create a connection and send the message
      var client = mqtt.connect(getBrokerURL(), getConnectOptions());
      client.on('connect', function () {
         logmodule.writelog('info', "Broker not connected, attemting connection");
         client.publish(args.mqttTopic, args.mqttMessage, function() {
            logmodule.writelog('info', "send " + args.mqttMessage + " on topic " + args.mqttTopic);
            client.end();
         });
      });
   } else {
      // There is already a connection, so the message can be send
      connectedClient.publish(args.mqttTopic, args.mqttMessage, function() {
         logmodule.writelog('info', "send " + args.mqttMessage + " on topic " + args.mqttTopic);
      });
   }
}
