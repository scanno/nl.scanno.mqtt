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

   /**
    * getConnectOptions - create structure with several options.
    * Options are depending on several settings from the settings page.
    *
    * @return {type}  returns structure with the options to use when connecting.
    */
   getConnectOptions() {
      if (this.Homey.ManagerSettings.get('otbroker') == true) {
         return null;
      } else {
         var clientID = 'homey_' + Math.random().toString(16).substr(2, 8);
         var rejectUnauth = true;
         if ( this.Homey.ManagerSettings.get('selfsigned') == true) {
            rejectUnauth = false;
         }
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
         connect_options.keepalive = 10;
         connect_options.username = this.Homey.ManagerSettings.get('user');
         connect_options.password = this.Homey.ManagerSettings.get('password');
         connect_options.rejectUnauthorized = rejectUnauth;
         connect_options.clientId = clientID;
         connect_options.will = lwt_struct;

         this.logmodule.writelog('info', "rejectUnauthorized: " + connect_options.rejectUnauthorized);
         return connect_options;
      };
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
         this.connectedClient = mqtt.connect(this.getBrokerURL(), this.getConnectOptions());

         // On connection ...
         this.connectedClient.on('connect', function (connack) {
           ref.brokerState = "CONNECTED";
           if (ref.errorOccured) {
             ref.logmodule.writelog('error', ref.Homey.__("notifications.mqtt_online"));
           }
           ref.errorOccured = false;
           ref.logmodule.writelog('info', "MQTT client connected");
           ref.logmodule.writelog('info', "Connected Topics: " + ref.globalVar.getTopicArray());
           ref.logmodule.writelog('info', "Broker State: " + ref.brokerState);
         });

         this.connectedClient.on('reconnect', function() {
           ref.brokerState = "RECONNECTING";
           ref.logmodule.writelog('info', "MQTT Reconnect");
           ref.logmodule.writelog('info', "Broker State: " + ref.brokerState);
         });

         this.connectedClient.on('close', function() {
           ref.logmodule.writelog('info', "MQTT Closed");
           ref.brokerState = "DISCONNECTED";
           ref.logmodule.writelog('info', "Broker State: " + ref.brokerState);
         });

         this.connectedClient.on('offline', function() {
           ref.logmodule.writelog('info', "MQTT Offline");
           if (ref.brokerState == "CONNECTED") {
             ref.logmodule.writelog('error', ref.Homey.__("notifications.mqtt_offline"));
           }
           ref.brokerState = "DISCONNECTED";
           ref.logmodule.writelog('info', "Broker State: " + ref.brokerState);
         });

         this.connectedClient.on('error', function(error) {
           if (!ref.errorOccured) {
              ref.logmodule.writelog('error', "MQTT error occured: " + error);
              ref.brokerState = "ERROR";
              ref.errorOccured = true;
              ref.logmodule.writelog('info', "Broker state: " + ref.brokerState);
           } else {
              ref.logmodule.writelog('info', "MQTT error occured: " + error);
           }
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
   subscribeToTopic(topicName, callback) {
       if (this.globalVar.getTopicArray().indexOf(topicName) == -1) {

           // Connect if no client available
           if (this.connectedClient == null) {
               this.connectToBroker();
           }
           
           this.logmodule.writelog('info', "subscribing to topic " + topicName);
           let loadingTopic = undefined;

           // Keep a register of callbacks to call when successfully subscribed to the topic
           if (callback) {
               this.loadingTopics = this.loadingTopics || new Map();
               loadingTopic = this.loadingTopics.get(topicName);
               if (loadingTopic) {
                   loadingTopic.push(topicName);
               } else {
                   this.loadingTopics.set(topicName, [callback]);
               }
           }

           // First topic registration?
           if (!loadingTopic) {
               // Subscribe to topic
               this.connectedClient.subscribe(topicName, (error) => {
                   // success?
                   if (error) {
                       this.logmodule.writelog('error', "failed to subscribed to topic " + topicName);
                       this.logmodule.writelog('error', error);
                   } else {
                       // Fill the array with known topics so I can check if I need to subscribe
                       this.globalVar.getTopicArray().push(topicName);
                       this.logmodule.writelog('info', "successfully subscribed to topic " + topicName);
                   }

                   // execute callbacks
                   let callbacks = this.loadingTopics.get(topicName);
                   if (callbacks) {
                       this.loadingTopics.delete(topicName);
                       for (let i = 0; i < callbacks.length; i++) {
                           let cb = callbacks[i];
                           if (cb && typeof cb === 'function') {
                                cb(error);
                           }
                       }
                   }
               });
           }
       } else { // already registered
           this.logmodule.writelog('info', "already subscribed to topic " + topicName);
           if (callback && typeof callback === 'function') {
               callback();
           }
       }
   }

   /**
    * sendMessageToTopic - description
    *
    * @param  {type} args description
    * @return {type}      description
    */
    sendMessageToTopic(args) {
        this.logmodule.writelog('info', "SendMessageToTopic called");
        this.logmodule.writelog('debug', "SendMessageToTopic: " + JSON.stringify(args));
        this.logmodule.writelog('debug', "qos: " + parseInt(args.qos));

        // Check max number of retries to prevend endless loops
        if (args.retries > 0) {
            if (args.retries--) {
                this.logmodule.writelog('info', "Retry sending message");
            } else {
                this.logmodule.writelog('info', "Skip sending message: max retries reached");
                return;
            }
        }

        // validate
        if (!args) {
            this.logmodule.writelog('error', "SendMessageToTopic: no arguments provided");
            return;
        }
        if (!args.mqttTopic) {
            this.logmodule.writelog('error', "SendMessageToTopic: no mqttTopic provided in arguments");
            this.logmodule.writelog('debug', "arguments: ");
            this.logmodule.writelog('debug', JSON.stringify(args, null, 2));
            return;
        }

        // send
        try {
            let publish_options;
            if (args.qos == undefined || args.retain == undefined) {
                publish_options = {
                    qos: 0,
                    retain: false
                };
            } else {
                publish_options = {
                    qos: parseInt(args.qos),
                    retain: (args.retain == '1')
                };
            }

            this.logmodule.writelog('debug', "publish_options: " + JSON.stringify(publish_options));

            // Check if there is already a connection  to the broker
            if (!this.connectedClient || this.connecting) {

                // add message to unsend queue
                this.queue = this.queue || [];
                this.queue.push(args);

                this.logmodule.writelog('debug', "connecting: added message to queue");

                // There is no connection, so create a connection and send the message
                if (!this.connecting) {
                    this.connecting = true; // set flag to prevent concurrent connection attempts
                    this.logmodule.writelog('info', "Broker not connected, attempting connection");
                    this.connectToBroker(args);
                    this.connectedClient.on('connect', () => {
                        this.connecting = false; // reset

                        // send queued messages
                        for (let i = 0; i < this.queue.length; i++) {
                            let a = this.queue[i];
                            if (a.retries === undefined) {
                                a.retries = 3; // max retries
                            }
                            this.sendMessageToTopic(a); // NOTE: recursive
                        }
                        // reset queue
                        this.queue = undefined;
                    });
                } else {
                    this.logmodule.writelog('info', "Broker not available, waiting for connection");
                }
            } else {

                // There is already a connection, so the message can be send, subscribe to the topic if needed
                this.subscribeToTopic(args.mqttTopic, (error) => {
                    if (!error) {

                        // parse objects to string
                        if (args.mqttMessage && typeof args.mqttMessage !== 'string') {
                            args.mqttMessage = JSON.stringify(args.mqttMessage);
                        }

                        // publish messsage to topic
                        this.connectedClient.publish(args.mqttTopic, args.mqttMessage, publish_options, () =>
                            this.logmodule.writelog('debug', "send " + args.mqttMessage + " on topic " + args.mqttTopic)
                        );
                    }
                });

            }
        } catch (err) {
            this.logmodule.writelog('error', "sendMessageToTopic: " + err);
        }
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
