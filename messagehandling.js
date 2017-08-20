"use strict";
//const Homey = require('homey');


/*module.exports = {
   receiveMessage: function(topic, message, args, state) {
      receiveMessage(topic, message, args, state);
   }
}
*/

class handlingMQTT {

   constructor(app) {
      this.globalVar = app.globalVar;
      this.logmodule = app.logmodule;
      this.triggers  = app.triggers;
   }
   
   receiveMessage(topic, message, args, state) {
      var validJSON = true;
      this.logmodule.writelog('info', "received '" + message.toString() + "' on '" + topic + "'");

      let tokens = {
         message: message.toString()
      }
   
      let triggerstate = {
         triggerTopic: topic, 
      }
   
      this.triggers.getEventMQTT().trigger(tokens, triggerstate, null);
      this.logmodule.writelog('info', "Trigger generic card for " + topic);
   }
   
   updateRef(app) {
      this.triggers = app.triggers;
   }
}

module.exports = handlingMQTT;