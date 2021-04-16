const mqtt      = require("mqtt");
const { promisify } = require("util");
var TopicsRegistry = require("./TopicsRegistry.js");
var SendQueue = require("./SendQueue.js");
var handleMQTT = require("./messagehandling.js");

const DEBUG = process.env.DEBUG === '1';

const TRIGGER_REF = 'trigger';
const API_REF     = 'api';

class brokerMQTT {

   constructor(app) {
      this.logmodule = app.logmodule;
      this.Homey = app.homey;
      this.connectedClient = null;

      this.handleMessage = new handleMQTT(app);
      this.topicsRegistry = new TopicsRegistry();
      this.sendqueue = new SendQueue();

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
     if (this.Homey.settings.get('tls') == true) {
       urlBroker.push("mqtts://");
     } else {
        urlBroker.push("mqtt://");
     };
     urlBroker.push(this.Homey.settings.get('url'));
     urlBroker.push(":"+this.Homey.settings.get('ip_port'));
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
       if ( this.Homey.settings.get('selfsigned') == true) {
          rejectUnauth = false;
       }

       var keepalive = parseInt(this.Homey.settings.get('keepalive'));
       if (isNaN(keepalive)) {
         keepalive = 60;
       }
       this.logmodule.writelog('info', "keepalive: " + keepalive);

       if ( this.Homey.settings.get('custom_clientid') == true) {
          clientID = this.Homey.settings.get('clientid');
       }
       this.logmodule.writelog('info', "clientID = "+ clientID);

       var lwt_struct = {};
       var lwt_topic = this.Homey.settings.get('lwt_topic');
       var lwt_message = this.Homey.settings.get('lwt_message');

       if (lwt_topic) {
         this.logmodule.writelog('debug', "lwt_topic = "+ lwt_topic);
         lwt_struct.topic = lwt_topic;
       } else {
          lwt_struct.topic = clientID+"/status";
          this.logmodule.writelog('debug', "lwt_topic = "+ lwt_struct.topic);
       }
       if (lwt_message) {
         this.logmodule.writelog('debug', "lwt_message = "+ lwt_message);
         lwt_struct.payload = lwt_message;
       } else {
         lwt_struct.payload = "MQTT client Offline";
         this.logmodule.writelog('debug', "lwt_message = "+ lwt_struct.payload);
       }
       lwt_struct.qos = 0;
       lwt_struct.retain = true;

       var connect_options = {};
       connect_options.keepalive = keepalive;
       connect_options.username = this.Homey.settings.get('user');
       connect_options.password = this.Homey.settings.get('password');
       connect_options.rejectUnauthorized = rejectUnauth;
       connect_options.clientId = clientID;
       // If LWT is enabled, add lwt struct
       if ( this.Homey.settings.get('use_lwt') == true) {
         this.logmodule.writelog('debug', "lwt_truct = "+ JSON.stringify(lwt_struct));
         connect_options.will = lwt_struct;
       }
//       connect_options.protocolVersion = 3;

       this.logmodule.writelog('info', "rejectUnauthorized: " + connect_options.rejectUnauthorized);
       return connect_options;
   }

   /**
    * connectToBroker - description
    *
    * @return {type}       description
    */
   connectToBroker() {
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

          ref.connectedClient.on('close', () => {
              ref.logmodule.writelog('info', "MQTT Closed");
              ref.brokerState = "DISCONNECTED";
              ref.logmodule.writelog('info', "Broker State: " + ref.brokerState);
           });

           ref.connectedClient.on('offline', async () => {
              ref.logmodule.writelog('info', "MQTT Offline");
              if (ref.brokerState == "CONNECTED") {
                ref.logmodule.writelog('error', ref.Homey.__("notifications.mqtt_offline"));
              }
              ref.brokerState = "DISCONNECTED";
              ref.logmodule.writelog('info', "Broker State: " + ref.brokerState);

              // call broker online trigger flow card(s)
              await this._triggerOffline();
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
         ref.connectedClient.on('connect',  async (connack) => {
           
            if (ref.errorOccured || ref.brokerState == "RECONNECTING") {
              ref.logmodule.writelog('error', ref.Homey.__("notifications.mqtt_online"));
            }
            ref.brokerState = "CONNECTED";
            ref.errorOccured = false;
            ref.logmodule.writelog('info', "MQTT client connected");
            ref.logmodule.writelog('info', "Broker State: " + ref.brokerState);

            // call broker online trigger flow card(s)
            await this._triggerOnline();

            // retry failed subsciptions and remove topic if subscription is unsuccessfull
            await ref.subscribeToUnsubscribedTopics(false, false);

            // try to empty SendQueue
            while (!ref.sendqueue.isEmpty()) {
              if(DEBUG) {
                ref.logmodule.writelog('debug', "sending queued messages");
              }
              ref.sendMessageToTopic(ref.sendqueue.removeMessage());
            }
         });

         this.connectedClient.on('message', function(topic, message, packet) {
            // When a message is received, call receiveMessage for further processing
            ref.logmodule.writelog('info', "OnMessage called");
            ref.handleMessage.receiveMessage(topic, message);
         });
      };
   }

   async _triggerOnline() {
    const trigger = this.Homey.flow.getTriggerCard('brokerOnline');
    await trigger.trigger(null, null);
  }

  async _triggerOffline(){
    const trigger = this.Homey.flow.getTriggerCard('brokerOffline');
    await trigger.trigger(null, null);
  }

    /**
    * Subscribe to the topics in the topics registry
    */
    async subscribeToUnsubscribedTopics(keepFailed, forced) {
      const topics = this.getTopicsRegistry().getTopics();
      let visited = new Set();
      for(let topic of topics) {
         if(forced || !topic.isSubscribed()) {
  
           const topicName = topic.getTopicName();
           const api = topic.isApiTopic();
           const reference = topic.getReference();

           // skip duplicates
           if(visited.has(topicName)) continue;
           visited.add(topicName);
  
           // subscribe
           try {
              await this.subscribeToTopic(topicName, api, reference);
           } catch(error) {
              ref.logmodule.writelog('info', "Failed to re-subscribe to topic " + topicName);
    
              // remove topic on failure? prevents endless retry loops for the same topic
              if(!keepFailed) {
                ref.logmodule.writelog('info', "Removing topic " + topicName);
                this.topicsRegistry.removeByName(topicName);
              }
           }
         }
      }
    }

   /**
    * subscribeToTopic - description
    *
    * @param  {type} topicName description
    * @return {type}           description
    */
   async subscribeToTopic(topicName, api, reference) {

      // Connect if no client available
      if (this.connectedClient == null) {
        this.connectToBroker();
      }

      // custom reference provided OR use the default 'trigger' or 'api' reference for this topic?
      reference = reference || (api ? API_REF : TRIGGER_REF);

      // Fetch existing topic registration
      let topic = this.topicsRegistry.getTopic(topicName, reference);

      // First topic registration?
      if(!topic) { 
        if (api) {
          this.logmodule.writelog('info', "subscribing to api topic " + topicName + " with reference " + reference);
          topic = this.topicsRegistry.addApiTopic(topicName, reference);
        } else {
          this.logmodule.writelog('info', "subscribing to trigger topic " + topicName);
          topic = this.topicsRegistry.addTriggerTopic(topicName);
        }
      } else {
        if(topic.isApiTopic()) {
          this.logmodule.writelog('info', "re-subscribing to api topic " + topicName + " with reference " + reference);
        } else {
          this.logmodule.writelog('info', "re-subscribing to trigger topic " + topicName);
        }
      }

      // NOTE: Always unsubscribe to prevent duplicate topic subscriptions.
      // Thereby preventing multiple retained message streams for the same topic.
      await this.unsubscribeFromTopic(topic, true, true);

      // (Re-)Subscribe to topic.
      this.logmodule.writelog('debug', "Start topic subscription " + topicName);
      
      try {
        const subscribeAsync = promisify(this.connectedClient.subscribe).bind(this.connectedClient);
        const result = await subscribeAsync(topicName); 

        this.logmodule.writelog('info', "successfully subscribed to topic " + topicName);
        
        // mark all registered Topics for this topic name as subscribed
        this.topicsRegistry.setSubscribed(topicName, true);
        
        return topic;
      } catch(error) {
        this.logmodule.writelog('error', "failed to subscribe to topic " + topicName);
        this.logmodule.writelog('error', error);

        // mark all registered Topics for this topic name as unsubscribed
        this.topicsRegistry.setSubscribed(topicName, false);

        return null;
      }
   }
   
  async subscribeToApiTopic(topic, reference) {
    return await this.subscribeToTopic(topic, true, reference);
  }

  async unsubscribeFromTopicName(topicName, reference, keepRegistration) {
    const topic = this.topicsRegistry.getTopic(topicName, reference);
    return await this.unsubscribeFromTopic(topic, keepRegistration);
  }

  async unsubscribeFromAllTopicsWithReference(reference, keepRegistration) {
    const topics = this.topicsRegistry.getTopics(reference);
    for(let topic of topics) {
      await this.unsubscribeFromTopic(topic, keepRegistration);
    }
  }

  async unsubscribeFromTopic(topic, keepRegistration, forced) {
    if(!topic) {
      this.logmodule.writelog('debug', "SKIP: Already unsubscribed");
      return;
    }

    const topicName = topic.getTopicName();
    const isSubscribed = topic.isSubscribed();
    this.logmodule.writelog('info', "Unsubscribe from topic " + topicName);

    // remove topic OR mark topic unsubscribed
    // NOTE: Independent of the actual unsubscribe result
    if(keepRegistration) {
      topic.setSubscribed(false);
    } else {
      this.topicsRegistry.removeTopic(topic);
    }

    // was subscribed before removal?
    if (!isSubscribed) {
      this.logmodule.writelog('debug', "SKIP: Already unsubscribed");
      return;
    }

    if(!forced) {
      // Check if the topic is still used by other references (api VS trigger)
      const activeTopics = this.topicsRegistry.getTopicsByName(topicName).filter(t => t === topic);
      if(activeTopics.length > 0) {
        this.logmodule.writelog('debug', "SKIP: Topic is still in use by: " + activeTopics.map(t => t.getReference()).join());
        return; // prevent unsubscription
      }
    }

    try {
      // unsubscribe from broker
      const unsubscribeAsync = promisify(this.connectedClient.unsubscribe).bind(this.connectedClient);
      await unsubscribeAsync(topicName);

      // successfully unsubscribed
      this.logmodule.writelog('info', "Successfully unsubscribed from topic " + topicName);

      // mark all registered Topics for this topic name as unsubscribed
      this.topicsRegistry.setSubscribed(topicName, false);

      // remove any remaining queued trigger from the trigger queue
      this.handleMessage.removeTopic(topicName);

    } catch (error) {
      this.logmodule.writelog('info', "Failed to unsubscribe from topic " + topicName);
      this.logmodule.writelog('error', error); 
      //throw error; // NOTE: catch fail
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
        if(DEBUG) {
          this.logmodule.writelog('debug', "SendMessageToTopic: " + JSON.stringify(args));
        }

        // validate
        if (!args) {
            this.logmodule.writelog('error', "SendMessageToTopic: no arguments provided");
            return;
        }
        if (!args.mqttTopic) {
            this.logmodule.writelog('error', "SendMessageToTopic: no mqttTopic provided in arguments");
            if(DEBUG) {
              this.logmodule.writelog('debug', "arguments: ");
              this.logmodule.writelog('debug', JSON.stringify(args, null, 2));
            }
            return;
        }

        // send
        try {
            let qos = typeof args.qos === 'string' ? parseInt(args.qos) : args.qos;
            let publish_options = {
                qos: qos && qos >= 0 && qos <= 2 ? qos : 0,
                retain: args.retain === true || args.retain === '1' || args.retain === 'true'
            };

            if(DEBUG) {
              this.logmodule.writelog('debug', "publish_options: " + JSON.stringify(publish_options));
            }

            // Check if there is already a connection  to the broker
            if (!this.connectedClient || this.brokerState === "CONNECTING") {

                // There is no connection, so create a connection and send the message
                if (this.brokerState !== "CONNECTING") {
                    this.logmodule.writelog('info', "Broker not connected, attempting connection");
                    this.connectToBroker();

                } else {
                    this.logmodule.writelog('info', "Broker not available, waiting for connection");
                }
                // add message to the senqueue.
                this.sendqueue.addMessage(args);

            } else {
                // parse objects to string
                if (args.mqttMessage !== undefined && typeof args.mqttMessage !== 'string' && typeof args.mqttMessage !== null) {
                    args.mqttMessage = JSON.stringify(args.mqttMessage);
                }

                // publish messsage to topic
                this.connectedClient.publish(args.mqttTopic, args.mqttMessage, publish_options, () => {
                  if(DEBUG) {
                    this.logmodule.writelog('debug', "send " + args.mqttMessage + " on topic " + args.mqttTopic)
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

   getTopicsRegistry() {
     return this.topicsRegistry;
   }
}

module.exports = brokerMQTT;
