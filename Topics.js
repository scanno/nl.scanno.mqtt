"use strict";
const logmodule = require("./logmodule.js");

/**
 *
 */
class Topic {
    constructor(topic, api) {
      this.topic = topic;
      this.api = !!api;
      this.registered = false;
      logmodule.writelog('debug', "Topic constructor("+topic+")");
    }

    getTopic() {
      return this;
    }

    getTopicName() {
      return this.topic;
    }

    isApiTopic() {
      return this.api;
    }

    isRegistered() {
      return this.registered;
    }

    setRegistered(registered) {
      this.registered = registered;
    }
}

/**
 *
 */
class TopicArray {
  constructor() {
    this.triggerTopics =  [];
    this.apiTopics = [];
    logmodule.writelog('debug', "TopicArray constructor()");
  }

  /**
   * getTopic - description
   *
   * @param  {string} topic Name of the topic
   * @param  {string} type [optional] 'trigger' | 'api'
   * @return {object}       Object from the api or trigger arrays matching the
   *                        name of the  topic. Null when not found.
   */
  getTopic(topic, type) {
    switch(type) {
      case 'trigger':
        return this.getTriggerTopic(topic);
      case 'api':
        return this.getApiTopic(topic);
      default:
         return this.getTriggerTopic(topic) || this.getApiTopic(topic);
    }
  }

  getTriggerTopic(topic) {
    for (let i=0; i < this.triggerTopics.length; i++) {
      if (this.triggerTopics[i].getTopicName() === topic) {
        logmodule.writelog('debug', "Topic "+topic+" found in TriggerTopics");
        return this.triggerTopics[i];
      }
    }
     // Trigger topic has not been found, so return null
     return null
  }
  
  getApiTopic(topic) {
     for (let i=0; i < this.apiTopics.length; i++) {
        if (this.apiTopics[i].getTopicName() === topic) {
          logmodule.writelog('debug', "Topic "+topic+" found in ApiTopics");
           return this.apiTopics[i];
        }
     }

     // Api topic has not been found, so return null
     return null
  }

  /**
   * getTriggerTopicIndex - description
   *
   * @param  {string} topic Name of the topic
   * @return {number}       Index in the trigger array matching the topic name.
   *                        -1 when not found in the array.
   */
  getTriggerTopicIndex(topic) {
    for (let i=0; i < this.triggerTopics.length; i++) {
      if (this.triggerTopics[i].getTopicName() === topic) {
         return i;
      }
    }
    return -1;
  }

  /**
   * getApiTopicIndex - description
   *
   * @param  {string} topic Name of the topic
   * @return {number}       Index in the api array matching the topic name.
   *                        -1 when not found in the array.
   */
  getApiTopicIndex(topic) {
    for (let i=0; i < this.apiTopics.length; i++) {
      if (this.apiTopics[i].getTopicName() === topic) {
         return i;
      }
    }
    return -1;
  }

  /**
   * getTopics - Return all registered topics.
   *
   * @return {Array}  concatination of topic names from trigger and api array
   */
  getTopics() {
    var temp = this.triggerTopics.concat(this.apiTopics);
    var result = [];
    for (let i=0; i < temp.length; i++) {
      result.push(temp[i].getTopicName());
    }
    return result;
  }

  /**
   * exists - Check if a topic exists in trigger and api array
   *
   * @param  {string} topic name of the topic.
   * @return {boolean}      true when topic exists
   *                        flase when topic does not exist
   */
  exists(topic) {
    return this.getTopic(topic) !== null;
  }

  /**
   * active - checks if the given topic is registered.
   *
   * @param  {string} topic name of the topic
   * @return {boolean}       true when topic is registered, false Otherwise   
   */
  active(topic) {
    if (this.exists(topic)) {
      return this.getTopic(topic).isRegistered();
    }
    return false;
  }

  /**
   * addApiTopic - description
   *
   * @param  {string} topicName  Name of the topic to add to the api array
   * @return {Topic}             The registered Topic info for this topic name
   */
  addApiTopic(topicName) {
    logmodule.writelog('debug', "addApiTopic("+topicName+") called");
    let topic = this.getApiTopic(topicName);
    if (!topic) {
      topic = new Topic(topicName, true);
      this.apiTopics.push(topic);
    } else {
      logmodule.writelog('debug', "Topic "+topicName+" already exists");
    }
    return topic;
  }

  /**
   * addTriggerTopic - description
   *
   * @param  {string} topicName  Name of the topic to add to the trigger array
   * @return {Topic}             The registered Topic info for this topic name
   */
  addTriggerTopic(topicName) {
    logmodule.writelog('debug', "addTriggerTopic("+topicName+") called");
    let topic = this.getTriggerTopic(topicName);
    if (!topic) {
      topic = new Topic(topicName);
      this.triggerTopics.push(topic);
    } else {
      logmodule.writelog('debug', "Topic "+topicName+" already exists");
    }
    return topic;
  }


  /**
   * getTriggerTopics - description
   *
   * @return {Array}  Array of all topic names in the trigger array
   */
  getTriggerTopics() {
    return (this.triggerTopics || []).map(t => t.getTopicName());
  }

  /**
   * getApiTopics - description
   *
   * @return {Array}  Array of all topic names in the api array
   */
  getApiTopics() {
     return (this.apiTopics || []).map(t => t.getTopicName());
  }

  /**
   * remove - description
   *
   * @param  {string} topic name of the topic to remove from the list
   * @param  {string} type [optional] 'trigger' | 'api'
   * @return {boolean}      true when succesfull, false otherwise
   */
  remove(topic, type) {
    switch(type) {
      case 'trigger':
        return this.removeTriggerTopic(topic);
      case 'api':
        return this.removeApiTopic(topic);
      default:
        const trigger = this.removeTriggerTopic(topic);
        const api = this.removeApiTopic(topic);
        return trigger || api;    
    }
  }

  removeTriggerTopic(topic) {
    var index = this.getTriggerTopicIndex(topic);
    if (index !== -1) {
      this.triggerTopics.splice(index,1);
      return true;
    }
    return false;
  }

  removeApiTopic(topic) {
    index = this.getApiTopicIndex(topic);
    if (index !== -1) {
      this.apiTopics.splice(index,1);
      return true;
    }
    return false;
  }

  removeTopic(topic) {
    if(topic.isApiTopic()){
      this.removeApiTopic(topic.getTopicName());
    } else {
      this.removeTriggerTopic(topic.getTopicName());
    }
  }

  /**
   * clearTopicArray - description
   *
   */
  clearTopicArray() {
    this.triggerTopics = [];
  }

  /**
   * getTriggerTopicArray - description
   *
   * @return {array}  give a reference to the triggerTopics array
   */
  getTriggerTopicArray() {
    return this.triggerTopics;
  }

  /**
   * getApiTopicArray - description
   *
   * @return {array}  give a reference to the apiTopics array
   */
  getApiTopicArray() {
    return this.apiTopics;
  }

  getAll() {
    return this.triggerTopics.concat(this.apiTopics);
  }
}

module.exports = TopicArray;
