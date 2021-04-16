"use strict";

const DEBUG = process.env.DEBUG === '1';

class actionsMQTT {
   constructor (app) {
      this.logmodule = app.logmodule;
      this.broker = app.broker;
      this.publishMQTT = null;
      this.sayString = null;
      this.Homey = app.homey;
      this.OnInit();
   }

   OnInit() {
      this.registerActions();
   }

   registerActions() {
      const ref = this;
      this.logmodule.writelog("registerActions called");

      // Put all the action trigger here for registering them and executing the action

      this.publishMQTT = this.Homey.flow.getActionCard('publishMQTT');
      this.publishEmpty = this.Homey.flow.getActionCard('publishEmptyMessage');
      this.publishMQTT_Adv = this.Homey.flow.getActionCard('publishMQTT_Adv');
      this.sayString = this.Homey.flow.getActionCard('sayString');

      // Put all the action trigger here for registering them and executing the action
      // Action for sending a message to the broker on the specified topic
      this.publishMQTT.registerRunListener((args, state ) => {
         if(DEBUG) {
            ref.logmodule.writelog('debug', "Listener publishMQTT called");
         }
         try {
            ref.broker.sendMessageToTopic(args);
            return Promise.resolve( true );
          } catch(err) {
            ref.logmodule.writelog('error', "Error in Listener publishMQTT: " +err);
            return Promise.reject(err);
          }
      })

      this.publishEmpty.registerRunListener((args, state ) => {
         if(DEBUG) {
            ref.logmodule.writelog('debug', "Listener publishEmptyMessage called");
         }
         try {
            ref.broker.sendMessageToTopic(args);
            return Promise.resolve( true );
          } catch(err) {
            ref.logmodule.writelog('error', "Error in Listener publishEmptyMessage: " +err);
            return Promise.reject(err);
          }
      })

      this.publishMQTT_Adv.registerRunListener((args, state ) => {
         if(DEBUG) {
            ref.logmodule.writelog('debug', "Listener publishMQTT_Adv called");
         }
         try {
            ref.broker.sendMessageToTopic(args);
            return Promise.resolve( true );
          } catch(err) {
            ref.logmodule.writelog('error', "Error in Listener publishMQTT_Adv: " +err);
            return Promise.reject(err);
          }
      })

      // Action for speaking out the string recieved from MQTT topic
      this.sayString.registerRunListener((args, state ) => {
         if(DEBUG) {
            ref.logmodule.writelog('debug', "Listener sayString called");
         }

         try {
            ref.homeySayString(args);
          } catch(err) {
            ref.logmodule.writelog('error', "Error in Listener sayString: " +err);
          }
      })
   }

   homeySayString(args) {
      try {
         this.Homey.speechOutput.say(args.voiceString)
         this.logmodule.writelog("homeySayString: " +args.voiceString);
      } catch(err) {
         this.logmodule.writelog("homeySayString: " +err);
      }
   }
}

module.exports = actionsMQTT;
