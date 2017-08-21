//const Homey     = require('homey');

const mqtt      = require("mqtt/node_modules/mqtt");
var handleMQTT = require("./messagehandling.js");

class brokerMQTT {

   constructor(app) {
      this.logmodule = app.logmodule;
      this.globalVar = app.globalVar;
      this.handleMessage = new handleMQTT(app);
      this.Homey = require('homey');
      this.connectedClient = null;
      this.reconnectClient = false;
   }

   getBrokerURL() {
      var urlBroker = []
    
      if (this.Homey.ManagerSettings.get('otbroker') == true) {
         urlBroker.push("mqtt://");
         urlBroker.push("broker.hivemq.com:1883");
      } else {
         if (this.Homey.ManagerSettings.get('tls') == true) {
           urlBroker.push("mqtts://");
         } else {
            urlBroker.push("mqtt://");
         };
         urlBroker.push(this.Homey.ManagerSettings.get('url'));
         urlBroker.push(":"+this.Homey.ManagerSettings.get('ip_port'));
      }
      this.logmodule.writelog('info', "Broker URL: "+ urlBroker.join(''));
      return urlBroker.join('');
   }

   getConnectOptions() {
      if (this.Homey.ManagerSettings.get('otbroker') == true) {
         return null;
      } else {
         var clientID = 'homey_' + Math.random().toString(16).substr(2, 8);
         var rejectUnauth = "true";
         if ( this.Homey.ManagerSettings.get('selfsigned') == true) {
            rejectUnauth = "false";
         }
         if ( this.Homey.ManagerSettings.get('custom_clientid') == true) {
            clientID = this.Homey.ManagerSettings.get('clientid');
         }
         this.logmodule.writelog('info', "clientID = "+ clientID);
         var connect_options = {
            keepalive: 10,
            username: this.Homey.ManagerSettings.get('user'),
            password: this.Homey.ManagerSettings.get('password'),
            rejectUnauthorized: rejectUnauth,
            clientId: clientID
         };
         this.logmodule.writelog('info', "rejectUnauthorized: " + connect_options.rejectUnauthorized);
         return connect_options
      };
   }

   connectToBroker(args, state) {
      const ref = this;
      if (this.connectedClient == null) {
         this.logmodule.writelog("connectedClient == null");
         this.connectedClient = mqtt.connect(this.getBrokerURL(), this.getConnectOptions());

         // On connection ...
         this.connectedClient.on('connect', function (connack) {
            ref.logmodule.writelog('info', "MQTT client connected");
            ref.logmodule.writelog('info', "Connected Topics: " + ref.globalVar.getTopicArray());
            ref.logmodule.writelog('info', "reconnectedClient " + ref.reconnectClient);
         });

         this.connectedClient.on('reconnect', function() {
            ref.logmodule.writelog('info', "MQTT Reconnect");
            ref.reconnectClient = true;
         });

         this.connectedClient.on('close', function() {
            ref.logmodule.writelog('info', "MQTT Closed");
            ref.reconnectClient = true;
         });

         this.connectedClient.on('offline', function() {
            ref.logmodule.writelog('info', "MQTT Offline");
            ref.reconnectClient = true;
         });

         this.connectedClient.on('error', function(error) {
            ref.logmodule.writelog('error', "MQTT error occured: " + error);
         });

         this.connectedClient.on('message',function(topic, message, packet) {
         // When a message is received, call receiveMessage for further processing
            ref.logmodule.writelog('info', "OnMessage called");
            ref.handleMessage.receiveMessage(topic, message, args, state);
         });
      };
   }

   subscribeToTopic(topicName) {
      if ( this.globalVar.getTopicArray().indexOf(topicName) == -1 ) {

         // Fill the array with known topics so I can check if I need to subscribe
         this.globalVar.getTopicArray().push(topicName);
         if (this.connectedClient == null) {
            this.connectToBroker();
         }
         this.connectedClient.subscribe(topicName);
      }
   }

   sendMessageToTopic(args) {
      const ref = this;
      this.logmodule.writelog('debug', "SendMessageToTopic: " +JSON.stringify(args));
      this.logmodule.writelog('debug',"qos: "+ parseInt(args.qos));

      try {
         if (args.qos == undefined || args.retain == undefined) {
            var publish_options = {
               qos: 0,
               retain: false
            };
         } else {
            var publish_options = {
               qos: parseInt(args.qos),
               retain: args.retain
            };
         }

         this.logmodule.writelog('debug', "publish_options: " +JSON.stringify(publish_options));
         // Check if there is already a connection  to the broker
         this.logmodule.writelog('info', "SendMessageToTopic called");
         if (this.connectedClient == null) {
            // There is no connection, so create a connection and send the message
            var client = mqtt.connect(this.getBrokerURL(), this.getConnectOptions());
            client.on('connect', function () {
               ref.logmodule.writelog('info', "Broker not connected, attemting connection");
               client.publish(args.mqttTopic, args.mqttMessage, publish_options,function() {
                  ref.logmodule.writelog('info', "send " + args.mqttMessage + " on topic " + args.mqttTopic);
                  client.end();
               });
            });
         } else {
            // There is already a connection, so the message can be send
            ref.connectedClient.publish(args.mqttTopic, args.mqttMessage, publish_options, function() {
               ref.logmodule.writelog('info', "send " + args.mqttMessage + " on topic " + args.mqttTopic);
            });
         }
      } catch(err) {
         ref.logmodule.writelog('error', "sendMessageToTopic: " +err);
      }
   }
   
   getConnectedClient() {
      return this.connectedClient;
   }
   
   clearConnectedClient() {
      this.connectedClient = null;
   }
   
   updateRef(app) {
      this.handleMessage.updateRef(app);
   }
}

module.exports = brokerMQTT;
