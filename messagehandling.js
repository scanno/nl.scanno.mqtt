"use strict";

const { ManagerApi } = require('homey');

class handlingMQTT {

   constructor(app) {
      this.globalVar = app.globalVar;
      this.logmodule = app.logmodule;
      this.triggers  = app.triggers;
   }

   /**
    * receiveMessage - Handling of received messages.
    * This gets called as soon as the client receives a message published
    * on a subscribed topic
    *
    * @param  {type} topic   topic where message was published on
    * @param  {type} message payload of the received message
    * @param  {type} args    list of arguments that are part of the trigger FlowCardTrigger
    * @param  {type} state   state arguments of the FlowCardTrigger
    * @return {type}         no return value
    */
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

      this.dispatchToRealtimeApi(topic, message);
   }

    dispatchToRealtimeApi(topic, message) {
        this.logmodule.writelog('debug', "send message to listeners via realtime api");
        this.logmodule.writelog('debug', topic + ": " + message.toString());
        ManagerApi.realtime(topic, JSON.parse(message.toString()));
    }

   /**
    * updateRef - updates references to other classes
    *
    * @param  {type} app reference to the main app instance
    * @return {type}     no return value
    */
   updateRef(app) {
      this.triggers = app.triggers;
   }
}

module.exports = handlingMQTT;
