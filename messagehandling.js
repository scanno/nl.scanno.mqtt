"use strict";

class handlingMQTT {

   constructor(app) {
      this.logmodule = app.logmodule;
      this.triggers  = app.triggers;
      this.Homey     = app.homey;
   }

   /**
    * receiveMessage - Handling of received messages.
    * This gets called as soon as the client receives a message published
    * on a subscribed topic
    *
    * @param  {type} topic   topic where message was published on
    * @param  {type} buffer  payload of the received message
    * @param  {type} args    list of arguments that are part of the trigger FlowCardTrigger
    * @param  {type} state   state arguments of the FlowCardTrigger
    * @return {type}         no return value
    */
   async receiveMessage(topic, buffer) {
      this.logmodule.writelog('info', "received '" + buffer.toString() + "' on '" + topic + "'");

      const message = buffer.toString();
      await this.callTriggers(topic, message)
      this.dispatchToRealtimeApi(topic, message);
   }

   async callTriggers(topic, message){
      let tokens = {
         message: message,
         topic: topic
      }

      let triggerstate = {
         triggerTopic: topic,
      }


      try {
         this.logmodule.writelog('debug', "Trigger generic card for " + topic);
         await this.triggers.getEventMQTT().trigger(tokens, triggerstate);
      } catch(e) {
         this.logmodule.writelog('error', "Error occured: " +e);
      }
   }

   dispatchToRealtimeApi(topic, message) {
      var messageToSend;
      try {
         messageToSend = JSON.parse(message);
      } catch (err) {
         messageToSend = message;
      }

      let apiTopics = this.triggers.broker.getTopicArray().getApiTopics();
      if(apiTopics.some(wildcard => this.triggers.topicMatches(topic, wildcard))){
         this.logmodule.writelog('debug', "send message to listeners via realtime api");
         this.logmodule.writelog('debug', topic + ": " + message);
         this.Homey.api.realtime(topic, messageToSend);
      } else {
         this.logmodule.writelog('debug', "Skip realtime no match found for api topic.");
      }
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
