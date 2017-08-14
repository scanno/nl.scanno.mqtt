"use strict";
const Homey = require('homey');

var globalVar = require("./global.js");
var logmodule = require("./logmodule.js");
var broker    = require("./broker.js");

var publishMQTT = null;
var sayString = null;

module.exports = {
   registerActions: function() {
      registerActions();
   }
}

function registerActions() {
   logmodule.writelog("registerActions called");

   // Put all the action trigger here for registering them and executing the action
   
   publishMQTT = new Homey.FlowCardAction('publishMQTT');
   sayString = new Homey.FlowCardAction('sayString');

   publishMQTT.register();
   sayString.register();

   // Put all the action trigger here for registering them and executing the action
   // Action for sending a message to the broker on the specified topic
   publishMQTT.registerRunListener((args, state ) => {
      logmodule.writelog('debug', "Listener publishMQTT called");
      try {
         broker.sendMessageToTopic(args);
         return Promise.resolve( true );
       } catch(err) {
         logmodule.writelog('error', "Error in Listener publishMQTT: " +err);
         return Promise.reject(err);
       }
   })

   // Action for speaking out the string recieved from MQTT topic
   sayString.registerRunListener((args, state ) => {
      logmodule.writelog('debug', "Listener sayString called");
      try {
         homeySayString(args);
       } catch(err) {
         logmodule.writelog('error', "Error in Listener sayString: " +err);
       }
   })

}

function homeySayString(args) {
   try {
      Homey.ManagerSpeechOutput.say(args.voiceString)
      logmodule.writelog("homeySayString: " +args.voiceString);
   } catch(err) {
      logmodule.writelog("homeySayString: " +err);
   }
}

