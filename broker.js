const mqtt      = require("mqtt/node_modules/mqtt");
var TopicArray = require("./Topics.js")
var handleMQTT = require("./messagehandling.js");

class brokerMQTT {

   constructor(app) {
      this.logmodule = app.logmodule;
      this.handleMessage = new handleMQTT(app);
      this.Homey = require('homey');
      this.connectedClient = null;

      this.topicArray = new TopicArray();

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
       return connect_options;
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
      if (this.connectedClient == null && ref.brokerState !== "CONNECTING") {
         this.logmodule.writelog("connectedClient == null");
         try {
           ref.brokerState = 'CONNECTING';
           this.connectedClient = mqtt.connect(this.getBrokerURL(), this.getConnectOptions());
         } catch(err) {
           ref.brokerState = "DISCONNECTED";
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
            ref.logmodule.writelog('info', "Connected Topics: " + ref.getTopicArray().getTriggerTopics());
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
   subscribeToTopic(topicName, callback, api) {
      if (!this.topicArray.active(topicName)) {
         // Connect if no client available
         if (this.connectedClient == null) {
               this.connectToBroker();
         }

         if (!this.topicArray.exists(topicName)) {
           if (api) {
             this.logmodule.writelog('info', "subscribing to api topic " + topicName);
             this.topicArray.addApiTopic(topicName);
           } else {
             this.logmodule.writelog('info', "subscribing to trigger topic " + topicName);
             this.topicArray.addTriggerTopic(topicName);
           }
         }

         // First topic registration?
         if (!this.topicArray.getTopic(topicName).isRegistered()) {
            // Subscribe to topic
            this.connectedClient.subscribe(topicName, (error) => {
              // success?
              if (error) {
                 this.logmodule.writelog('error', "failed to subscribed to topic " + topicName);
                 this.logmodule.writelog('error', error);
                 if (this.topicArray.getTopic(topicName) !== null) {
                   if (!this.topicArray.getTopic(topicName).getRegistered()) {
                      this.topicArray.remove(topicName);
                      this.logmodule.writelog('debug', "Removed from topiclist: " + topicName);
                   }
                 }
              } else {
                // Fill the array with known topics so I can check if I need to subscribe
                this.topicArray.getTopic(topicName).setRegistered(true);
                this.logmodule.writelog('info', "successfully subscribed to topic " + topicName);
              }
           });
         }
       } else { // already registered
           this.logmodule.writelog('info', "already subscribed to topic " + topicName);
           if (callback && typeof callback === 'function') {
               callback(null, {});
           }
       }
   }

   subscribeToApiTopic(topic, callback) {
        this.subscribeToTopic(topic, callback, true);
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
                // parse objects to string
                if (args.mqttMessage && typeof args.mqttMessage !== 'string') {
                    args.mqttMessage = JSON.stringify(args.mqttMessage);
                }

                // publish messsage to topic
                this.connectedClient.publish(args.mqttTopic, args.mqttMessage, publish_options, () =>
                    this.logmodule.writelog('debug', "send " + args.mqttMessage + " on topic " + args.mqttTopic)
                );
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

   getTopicArray() {
     return this.topicArray;
   }
}

module.exports = brokerMQTT;
