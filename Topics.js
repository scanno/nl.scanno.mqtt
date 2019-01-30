"use strict";
const logmodule = require("./logmodule.js");

/**
 *
 */
class Topic {
    constructor(topic) {
      this.topic = topic;
      this.registered = false;
      logmodule.writelog('debug', "Topic constructor("+topic+")");
    }

    getTopic() {
      return this;
    }

    getTopicName() {
      return this.topic;
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
   * @return {object}       Object from the api or trigger arrays matching the
   *                        name of the  topic. Null when not found.
   */
  getTopic(topic) {
    for (let i=0; i < this.triggerTopics.length; i++) {
      if (this.triggerTopics[i].getTopicName() === topic) {
        logmodule.writelog('debug', "Topic "+topic+" found in TriggerTopics");
        return this.triggerTopics[i];
      }
    }

     for (let i=0; i < this.apiTopics.length; i++) {
        if (this.apiTopics[i].getTopicName() === topic) {
          logmodule.writelog('debug', "Topic "+topic+" found in ApiTopics");
           return this.apiTopics[i];
        }
     }

     // Topic has not been found, so return null
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
   * @param  {string} topic  Name of the topic to add to the api array
   * @return {boolean}       true when the topic is added
   *                         false Otherwise
   */
  addApiTopic(topic) {
    var result = false;
    logmodule.writelog('debug', "addApiTopic("+topic+") called");
    if (!this.exists(topic)) {
      this.apiTopics.push(new Topic(topic));
      result = true;
    } else {
      logmodule.writelog('debug', "Topic "+topic+" already exists");
    }
    return result;
  }

  /**
   * addTriggerTopic - description
   *
   * @param  {string} topic  Name of the topic to add to the trigger array
   * @return {boolean}       true when the topic is added
   *                         false Otherwise
   */
  addTriggerTopic(topic) {
    var result = false;
    logmodule.writelog('debug', "addTriggerTopic("+topic+") called");
    if (!this.exists(topic)) {
      this.triggerTopics.push(new Topic(topic));
      result = true;
    } else {
      logmodule.writelog('debug', "Topic "+topic+" already exists");
    }
    return result;
  }


  /**
   * getTriggerTopics - description
   *
   * @return {Array}  Array of all topic names in the trigger array
   */
  getTriggerTopics() {
    var result = [];
    for (let i=0; i < this.triggerTopics.length; i++) {
      result.push(this.triggerTopics[i].getTopicName());
    }
    return result;
  }

  /**
   * remove - description
   *
   * @param  {string} topic name of the topic to remove from the list
   * @return {boolean}      true when succesfull, false otherwise
   */
  remove(topic) {
    var result = false;
    if (this.exists(topic)) {
      var index = this.getTriggerTopicIndex(topic);
      if (index !== -1) {
        this.triggerTopics.splice(index,1);
        result = true;
      }

      index = this.getApiTopicIndex(topic);
      if (index !== -1) {
        this.apiTopics.splice(index,1);
        var result = true;
      }
    }
    return result;
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
}

module.exports = TopicArray;
