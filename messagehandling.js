"use strict";
const Homey = require('homey');

var globalVar = require("./global.js");
var logmodule = require("./logmodule.js");
var triggers  = require("./triggers.js");

module.exports = {
   receiveMessage: function(topic, message, args, state) {
      receiveMessage(topic, message, args, state);
   }
}

function receiveMessage(topic, message, args, state) {
   var validJSON = true;
   logmodule.writelog('info', "received '" + message.toString() + "' on '" + topic + "'");

   let tokens = {
      message: message.toString()
   }
   
   let triggerstate = {
      triggerTopic: topic, 
   }
   
   triggers.getEvenMQTT().trigger(tokens, triggerstate, null)
//   Homey.manager('flow').trigger('eventMQTT', { message: message.toString() }, { triggerTopic: topic });
   logmodule.writelog('info', "Trigger generic card for " + topic);
}
