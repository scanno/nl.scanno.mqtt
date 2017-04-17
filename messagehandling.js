var globalVar = require("./global.js");
var logmodule = require("./logmodule.js");

module.exports = {
   receiveMessage: function(topic, message, args, state) {
      receiveMessage(topic, message, args, state);
   }
}

function receiveMessage(topic, message, args, state) {
   var validJSON = true;
   logmodule.writelog("received '" + message.toString() + "' on '" + topic + "'");

   Homey.manager('flow').trigger('eventMQTT', { message: message.toString() }, { triggerTopic: topic });
   logmodule.writelog("Trigger generic card for " + topic);
}

