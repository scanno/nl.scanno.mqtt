"use strict";
const logmodule = require("./logmodule.js");
const topicMatches = require("./topicmatches.js");

const TRIGGER_REF = 'trigger';
const API_REF     = 'api';

/**
 * Model containing the topic subscription info
 */
class Topic {

  /**
   * Create new Topic
   * 
   * @param {string} topic the topic name to subscribe to
   * @param {boolean} api is this topic registered by the app api?
   * @param {string} [reference] [optional] reference for this topic, will be based on the 'api' param if not provided 
   */
    constructor(topic, api, reference) {
      this.topic = topic;
      this.api = !!api;
      this.subscribed = false;

      // custom reference provided OR use the default 'trigger' or 'api' reference for this topic?
      this.reference = reference || (api ? API_REF : TRIGGER_REF);
      
      logmodule.writelog('debug', "Topic constructor("+topic+","+api+","+reference+")");
    }

    getTopic() {
      return this;
    }

    getTopicName() {
      return this.topic;
    }

    getReference() {
      return this.reference;
    }

    isApiTopic() {
      return this.api;
    }

    isSubscribed() {
      return this.subscribed;
    }

    setSubscribed(subscribed) {
      this.subscribed = subscribed;
    }
}

/**
 * Registry for subscribed topics by reference.
 * A reference is used to diversify subscriptions between apps.
 * A reference can be anything to group topics like the app id, device id 
 * or discovery channel name during the pairing process of a device.
 * References are mainly used to prevent unsubscription if another process is still using the topic.
 * 
 * Topics registered for trigger cards are registered by reference 'trigger'
 * Topics registered trough the api without a reference are listed by reference 'api'
 */
class TopicsRegistry {

  constructor() {
    // REGISTRY: Map<string, Map<string, Topic>> => topics[reference][topicName] = Topic
    this.topics = new Map();          // topics registered by reference and topic name
    this.apiReferences = new Set();   // a unique set of references for api subscriptions (i.e. all topics.keys except 'trigger')
    
    logmodule.writelog('debug', "TopicsRegistry constructor()");
  }

  /**
   * update the set of topics registered through the api.
   * also includes the default 'api' reference
   */
  _updateApiReferences() {
    const references = Array.from(this.topics.keys());
    const apiReferences = references.filter(ref => ref !== TRIGGER_REF);
    this.apiReferences = new Set(apiReferences);
  }

  /**
   * getApiReferences - get all api topic registration references
   * 
   * @returns {Array<string>} All API references (including the default 'api')
   */
  getApiReferences() {
    return this.apiReferences;
  }

  /**
   * setSubscribed - mark all registered Topics for this topic name as subscribed / unsubscribed
   * 
   * @param {string} topicName name of the topic
   * @param {boolean} subscribed mark subscribed or unsubscribed
   */
  setSubscribed(topicName, subscribed) {
    this.getTopicsByName(topicName).forEach(t => t.setSubscribed(subscribed));
  }

  /**
   * getTopic - get topic by topic name and optional filter by reference
   *
   * @param  {string} topicName   Name of the topic
   * @param  {string} [reference] [optional] topic reference
   * @return {Topic|null}         Topic registration matching the name of the topic. Null when not found.
   */
  getTopic(topicName, reference) {
    // no reference provided? 
    if(!reference) {
      // Check for a trigger topic first, otherwise grab the first match on any of the api topic registrations
      return this.getTriggerTopic(topicName) || this.getApiTopic(topicName);
    }

    // get all topics for the provided reference
    const topics = this.topics.get(reference);

    // get Topic for the requested topic name
    return topics ? topics.get(topicName) : null;
  }

  /**
   * getTriggerTopic - get Topic for 'trigger' registration
   * 
   * @param {string} topicName name of the topic
   * @returns {Topic|null} 
   */
  getTriggerTopic(topicName) {
    return this.getTopic(topicName, TRIGGER_REF);
  }
  
  /**
   * getTriggerTopic - get Topic for api registration
   * if a reference is provided, only the Topic registered for this reference will be returned, 
   * otherwise the first matching Topic for any api reference will be searched for
   * 
   * @param {string} topicName name of the topic
   * @param {string} [reference]
   * @returns {Topic|null} 
   */
  getApiTopic(topicName, reference) {
    const references = reference ? [reference] : this.getApiReferences();
    for(let reference of references) {
      const result = this.getTopic(topicName, reference);
      if(result) return result;
    }
    return null;
  }

  /**
   * exists - Check if a topic exists in the registry
   *
   * @param  {string} topicName name of the topic.
   * @param  {string} [reference] [optional] filter by reference
   * @return {boolean}      true when topic exists
   *                        flase when topic does not exist
   */
  exists(topicName, reference) {
    return this.getTopic(topicName, reference) !== null;
  }

  /**
   * active - checks if the given topic is registered.
   *
   * @param  {string} topicName name of the topic
   * @param  {string} [reference] [optional] filter by reference
   * @return {boolean}       true when topic is registered, false Otherwise   
   */
  active(topicName, reference) {
    const topic = this.getTopic(topicName, reference);
    return topic && topic.isSubscribed();
  }

  /**
   * addTopic - register a new Topic
   * 
   * @param {Topic} topic The Topic info to add to the registry
   * @returns {Topic} The registered Topic info for this topic name
   */
  addTopic(topic) {
    if(!topic) return null;
    
    const reference = topic.getReference();
    const topicName = topic.getTopicName();

    // Check for existng Topic
    const existing = this.getTopic(topicName, reference);
    if(existing)
      return existing; // return existing Topic to keep the internal state (i.e. subscribed?)

    // get the list of topics registered for the Topic reference (if undefined; create a new one)
    // topics are mapped by topic name
    let topics = this.topics.get(reference) || new Map();

    // register new Topic
    topics.set(topic.getTopicName(), topic);
    this.topics.set(reference, topics);

    // update api references
    if(reference !== TRIGGER_REF) {
      this.apiReferences.add(reference);
    }

    return topic;
  }

  /**
   * addApiTopic - register a new api Topic
   *
   * @param  {string} topicName  Name of the topic to add to the registry
   * @return {Topic}             The registered Topic info for this topic name
   */
  addApiTopic(topicName, reference) {
    logmodule.writelog('debug', "addApiTopic("+topicName+") called with reference: " + reference);
    return this.addTopic(new Topic(topicName, true, reference));
  }

  /**
   * addTriggerTopic - register a new 'trigger' Topic
   *
   * @param  {string} topicName  Name of the topic to add to the registry
   * @return {Topic}             The registered Topic info for this topic name
   */
  addTriggerTopic(topicName) {
    logmodule.writelog('debug', "addTriggerTopic("+topicName+") called");
    return this.addTopic(new Topic(topicName));
  }

  /**
   * getTopics - get all Topics registered by 'reference'
   * 
   * @param {string} [reference]
   * @returns {Iterable<Topic>} List of Topics for reference
   */
  getTopics(reference) {
    if(reference) {
      let topics = this.topics.get(reference);
      return topics ? topics.values() : [];
    }
    else {
      return this._getTopicsForReferences(this.topics.keys());
    }
  }

  /**
   * Find all Topics for reference
   * 
   * @param {string} references 
   * @returns {Iterable<Topic>} Unique set of Topics
   */
  _getTopicsForReferences(references) {
    let result = new Set();
    if(!references) return result;
    for(let reference of references) {
      let topics = this.topics.get(reference);
      if(topics) {
        for(let topic of topics.values()) {
          result.add(topic);
        }
      }
    }
    return result;
  }

  /**
   * Find all topic names / wildcards for a list of references
   * 
   * @param {Iterable<string>} references List of references
   * @returns {Iterable<string>} Unique set of topics names / wildcards
   */
  _getTopicNamesForReferences(references) {
    let result = new Set();
    if(!references) return result;
    for(let reference of references) {
      let topics = this.topics.get(reference);
      if(topics) {
        for(let topicName of topics.keys()) {
          result.add(topicName);
        }
      }
    }
    return result;
  }

  /**
   * getTopicNames - Get all topic names / wildcards
   * 
   * @param {string} [reference] [optional] filter by reference
   * @returns {Iterable<string>} Unique set of topics names / wildcards
   */
  getTopicNames(reference) {
    if(reference) {
      const topics = this.topics.get(reference);
      return topics ? topics.keys() : [];
    }
    return this._getTopicNamesForReferences(this.topics.keys());
  }

  /**
   * getTriggerTopics - get all trigger Topics
   *
   * @return {Iterable<Topic>}  Array of all trigger Topics in the registry
   */
  getTriggerTopics() {
    const topics = this.topics.get(TRIGGER_REF);
    return topics ? topics : [];
  }

  /**
   * getTriggerTopicNames - Get all 'trigger' topic names / wildcards
   *
   * @return {Iterable<string>}  List of all topic names registered as trigger topic
   */
  getTriggerTopicNames() {
    return this.getTopicNames(TRIGGER_REF);
  }

  /**
   * getApiTopics - Get all api Topics
   *
   * @param {string} [reference] [optional] filter by reference
   * @return {Iterable<Topic>}  List of all topics registered trough the api
   */
  getApiTopics(reference) {
    if(reference === TRIGGER_REF) return [];
    return reference 
      ? this.getTopics(reference) 
      : this._getTopicsForReferences(this.getApiReferences());
  }

  /**
   * getApiTopicNames - Get all api topic names / wildcards
   *
   * @return {Iterable<string>}  List of all topic names registered as trigger topic
   */
  getApiTopicNames(reference) {
    const topics = this.getApiTopics(reference);
    const topicNames = Array.from(topics).map(t => t.getTopicName());
     return new Set(topicNames); // unique
  }

  /**
   * getTopicsByName - Get all registered Topic info for a topic name
   * 
   * @param {string} topicName name of the topic
   * @returns {Topic[]} List of all registered Topics for topicName
   */
  getTopicsByName(topicName) {
    let result = [];
    for(let topics of this.topics.values()) {
      result.push(topics.get(topicName));
    }
    return result.filter(x => x);
  }

  /**
   * removeTopic - Remove a Topic from the registry
   * 
   * @param {Topic} topic Topic to be removed
   */
  removeTopic(topic) {
    let topics = this.topics.get(topic.getReference());
    if(topics) {
      topics.delete(topic.getTopicName());
    }

    if(topic.isApiTopic()) {
      this._updateApiReferences();
    }
  }

  /**
   * removeByName - Remove a Topic from the registry by topic name
   * NOTE: all Topics with this topicName for all references (including 'trigger') are removed
   *
   * @param  {string} topicName name of the topic to remove from the registry
   */
   removeByName(topicName) {

    for(let topics of this.topics.values()){
      topics.delete(topicName);
    }

    this._updateApiReferences();
  }

  /**
   * removeTriggerTopic - Remove a 'trigger' Topic from the registry by topic name
   *
   * @param  {string} topicName name of the topic to remove from the triggers registry
   */
  removeTriggerTopic(topicName) {
    const topics = this.topics.get(TRIGGER_REF);
    if(topics) {
      topics.delete(topicName);
    }
  }

  /**
   * removeApiTopic - Remove an api Topic from the registry by topic name
   *
   * @param {string} topicName name of the topic to remove from the registry
   * @param {string} [reference] [optional] remove only topics registered by this reference
   */
  removeApiTopic(topicName, reference) {
    if(reference === TRIGGER_REF) return; // 'trigger' is not an API topic
    const references = this.getApiReferences();
    for(let reference of references) {
      const topics = this.topics.get(reference);
      if(topics) {
        topics.delete(topicName);
      }
    }

    this._updateApiReferences();
  }

  /**
   * removeByReference - remove all Topics for a reference
   * @param {string} reference remove Topics registered by this reference
   */
  removeByReference(reference) {
    if(!reference) return;
    if(reference === TRIGGER_REF || reference === API_REF) {
      logmodule.writelog('debug', "[WARNING] removing all registered topics for STATIC reference: " + reference);
    }
    this.topics.delete(reference);
    this.apiReferences.delete(reference);
  }

  /**
   * hasMatch - has the registry a match (by wildcard) for this topic name 
   * 
   * @param {string} topicName topic name to find a match for
   * @param {string} [reference] [optional] filter by reference
   * @returns {boolean} found a match
   */
  hasMatch(topicName, reference) {
    const topics = this.topics.get(reference);
    if(!topics) return false;
    for(let wildcard of topics.keys()) {
      if(topicMatches(topicName, wildcard)) {
        return true;
      }
    }
    return false;
  }

  /**
   * hasTriggerMatch - has the registry a match (by wildcard) for this 'trigger' topic name 
   * 
   * @param {string} topicName topic name to find a match for
   * @returns {boolean} found a match
   */
  hasTriggerMatch(topicName) {
    return this.hasMatch(topicName, TRIGGER_REF);
  }

  /**
   * hasTriggerMatch - has the registry a match (by wildcard) for this api topic name 
   * 
   * @param {string} topicName topic name to find a match for
   * @param {string} [reference] [optional] filter by reference
   * @returns {boolean} found a match
   */
  hasApiMatch(topicName, reference) {
    if(reference === TRIGGER_REF) return false;
    if(reference) return this.hasMatch(topicName, reference);
    const references = this.getApiReferences();
    for(let reference of references) {
      if(this.hasMatch(topicName, reference)) {
        return true;
      }
    }
    return false;
  }

  /**
   * getMatches - get all registered Topics matching this topic name (by wildcard)
   * 
   * @param {string} topicName topic name to find all matches for
   * @param {string} [reference] [optional] filter by reference
   * @returns {Iterable<Topic>} matches
   */
  getMatches(topicName, reference) {
    const topics = this.topics.get(reference);
    const result = [];
    if(!topics) return result;
    for(let topic of topics.values()) {
      if(topicMatches(topicName, topic.getTopicName())) {
        result.push(topic);
      }
    }
    return result;
  }

  /**
   * getTriggerMatches - get all registered 'trigger' Topics matching this topic name (by wildcard)
   * 
   * @param {string} topicName topic name to find all matches for
   * @returns {Iterable<Topic>} matches
   */
  getTriggerMatches(topicName) {
    return this.getMatches(topicName, TRIGGER_REF);
  }

  /**
   * getApiMatches - get all registered api Topics matching this topic name (by wildcard)
   * 
   * @param {string} topicName topic name to find all matches for
   * @param {string} [reference] [optional] filter by reference
   * @returns {Iterable<Topic>} matches
   */
  getApiMatches(topicName, reference) {
    if(reference === TRIGGER_REF) return false;
    if(reference) return this.getMatches(topicName, reference);
    const references = this.getApiReferences();
    let result = [];
    for(let reference of references) {
      let matches = this.getMatches(topicName, reference);
      result = result.concat(matches);
    }
    return result;
  }
}

module.exports = TopicsRegistry;
