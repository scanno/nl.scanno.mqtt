"use strict";	

class globalVars {

   constructor(app) {
//     if (this.topicArray == undefined) {
         this.topicArray = [];
//      }
//      this.logmodule = require("./logmodule.js");
   }

   getTopicArray() {
      return this.topicArray;
   }
   
   getTopic(topicName) {
      for (var i=0; i < this.topicArray.length; i++) {
         if (this.topicArray[i].topicName === topicName) {
            return this.topicArray[i];
         }
      }
      // Topic has not been found, so return null
      return null
   }

   setTopic(topicData) {
      var entryArray = getTopic(topicData.topicName);
      if (entryArray !== null) {
         entryArray = topicData;
      } else {
         // User has not been found, so assume this is a new user
         this.topicArray.push(topicData);
      }
   }

   clearTopicArray() {
      this.topicArray = [];
   }
}
module.exports = globalVars;