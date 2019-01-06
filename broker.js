const mqtt      = require("mqtt/node_modules/mqtt");
var handleMQTT = require("./messagehandling.js");

class brokerMQTT {

   constructor(app) {
      this.logmodule = app.logmodule;
      this.globalVar = app.globalVar;
      this.handleMessage = new handleMQTT(app);
      this.Homey = require('homey');
      this.connectedClient = null;

      this.brokerState = "DISCONNECTED";
      this.errorOccured = false;
   }

   /**
    * getBrokerURL - create broker URL based on several settings.
    *
    * @return {type}  String with the URL of the broker to connect to.
    */
   getBrokerURL() {
     var urlBroker = []
     if (this.Homey.ManagerSettings.get('tls') == true) {
       urlBroker.push("mqtts://");
     } else {
        urlBroker.push("mqtt://");
     };
     urlBroker.push(this.Homey.ManagerSettings.get('url'));
     urlBroker.push(":"+this.Homey.ManagerSettings.get('ip_port'));
     this.logmodule.writelog('info', "Broker URL: "+ urlBroker.join(''));
     return urlBroker.join('');
   }

   /**
    * getConnectOptions - create structure with several options.
    * Options are depending on several settings from the settings page.
    *
    * @return {type}  returns structure with the options to use when connecting.
    */
    getConnectOptions() {
       var clientID = 'homey_' + Math.random().toString(16).substr(2, 8);
       var rejectUnauth = true;
       if ( this.Homey.ManagerSettings.get('selfsigned') == true) {
          rejectUnauth = false;
       }

       var keepalive = parseInt(this.Homey.ManagerSettings.get('keepalive'));
       if (isNaN(keepalive)) {
         keepalive = 60;
       }
       this.logmodule.writelog('info', "keepalive: " + keepalive);

       if ( this.Homey.ManagerSettings.get('custom_clientid') == true) {
          clientID = this.Homey.ManagerSettings.get('clientid');
       }
       this.logmodule.writelog('info', "clientID = "+ clientID);

       var lwt_struct = {};
       lwt_struct.topic = clientID+"/status";
       lwt_struct.payload = "Offline";
       lwt_struct.qos = 0;
       lwt_struct.retain = true;

       var connect_options = {};
       connect_options.keepalive = keepalive;
       connect_options.username = this.Homey.ManagerSettings.get('user');
       connect_options.password = this.Homey.ManagerSettings.get('password');
       connect_options.rejectUnauthorized = rejectUnauth;
       connect_options.clientId = clientID;
       connect_options.will = lwt_struct;

       this.logmodule.writelog('info', "rejectUnauthorized: " + connect_options.rejectUnauthorized);
       return connect_options
   }

   /**
    * connectToBroker - description
    *
    * @param  {type} args  description
    * @param  {type} state description
    * @return {type}       description
    */
   connectToBroker(args, state) {
      const ref = this;
      if (this.connectedClient == null) {
         this.logmodule.writelog("connectedClient == null");
         try {
           this.connectedClient = mqtt.connect(this.getBrokerURL(), this.getConnectOptions());
         } catch(err) {
           ref.logmodule.writelog('error', "connectToBroker: " +err);
         }

         ref.connectedClient.on('reconnect', function() {
            ref.brokerState = "RECONNECTING";
            ref.logmodule.writelog('info', "MQTT Reconnect");
            ref.logmodule.writelog('info', "Broker State: " + ref.brokerState);
          });

          ref.connectedClient.on('close', function() {
             ref.logmodule.writelog('info', "MQTT Closed");
             ref.brokerState = "DISCONNECTED";
             ref.logmodule.writelog('info', "Broker State: " + ref.brokerState);
           });

           ref.connectedClient.on('offline', function() {
              ref.logmodule.writelog('info', "MQTT Offline");
              if (ref.brokerState == "CONNECTED") {
                ref.logmodule.writelog('error', ref.Homey.__("notifications.mqtt_offline"));
              }
              ref.brokerState = "DISCONNECTED";
              ref.logmodule.writelog('info', "Broker State: " + ref.brokerState);
            });

            ref.connectedClient.on('error', function(error) {
              if (!ref.errorOccured) {
                 ref.logmodule.writelog('error', "MQTT error occured: " + error);
                 ref.brokerState = "ERROR";
                 ref.errorOccured = true;
                 ref.logmodule.writelog('info', "Broker state: " + ref.brokerState);
              } else {
                 ref.logmodule.writelog('info', "MQTT error occured: " + error);
              }
            });

         // On connection ...
         ref.connectedClient.on('connect', function (connack) {
            if (ref.errorOccured || ref.brokerState == "RECONNECTING") {
              ref.logmodule.writelog('error', ref.Homey.__("notifications.mqtt_online"));
            }
            ref.brokerState = "CONNECTED";
            ref.errorOccured = false;
            ref.logmodule.writelog('info', "MQTT client connected");
            ref.logmodule.writelog('info', "Connected Topics: " + ref.globalVar.getTopicArray());
            ref.logmodule.writelog('info', "Broker State: " + ref.brokerState);
         });

         this.connectedClient.on('message',function(topic, message, packet) {
         // When a message is received, call receiveMessage for further processing
            ref.logmodule.writelog('info', "OnMessage called");
            ref.handleMessage.receiveMessage(topic, message, args, state);
         });
      };
   }

   /**
    * subscribeToTopic - description
    *
    * @param  {type} topicName description
    * @return {type}           description
    */
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

   /**
    * sendMessageToTopic - description
    *
    * @param  {type} args description
    * @return {type}      description
    */
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
               retain: (args.retain == '1')
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
         return err;
      }
      return true;
   }

   /**
    * getConnectedClient - description
    *
    * @return {type}  description
    */
   getConnectedClient() {
      return this.connectedClient;
   }


   /**
    * clearConnectedClient - description
    *
    * @return {type}  description
    */
   clearConnectedClient() {
      this.connectedClient = null;
   }

   /**
    * updateRef - description
    *
    * @param  {type} app description
    * @return {type}     description
    */
   updateRef(app) {
      this.handleMessage.updateRef(app);
   }
}

module.exports = brokerMQTT;
