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
      const ref=this;
      this.logmodule.writelog('info', "received '" + message.toString() + "' on '" + topic + "'");

      let tokens = {
         message: message.toString(),
         topic: topic
      }

      let triggerstate = {
         triggerTopic: topic,
      }

      ref.triggers.getEventMQTT().trigger(tokens, triggerstate, null).catch( function(e) {
        ref.logmodule.writelog('error', "Error occured: " +e);
      })
      this.logmodule.writelog('info', "Trigger generic card for " + topic);
   }

   updateRef(app) {
      this.triggers = app.triggers;
   }
}

module.exports = handlingMQTT;
