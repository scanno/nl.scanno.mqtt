"use strict";

const DEBUG = process.env.DEBUG === '1';

const delay = require('./delay');
const topicMatches = require('./topicmatches');

// The Homey trigger system allows a max of 10 calls per second for each flow card.
// And there is a second limit of 100 calls per minute
const RATE_LIMIT = 10;              // max 10 triggers per second
const RATE_LIMIT_DELAY = 6 * 1000;  // wait 6 seconds to pervent hitting the second limit of 100 messages per minute

class TriggerQueue {
    constructor(app) {
        this.logmodule = app.logmodule;
        this.triggers = app.triggers;
        this.broker = app.broker;

        this.queue = [];                // messages to be send to the trigger flow cards
        this.delayedTopics = new Set(); // currently delayed topics (rate limited)
        this.delayedQueue = [];         // messages on delayed topics are moved to this queue to process them after the rest of the messages
        this.running = true;
    }

    /**
     * @returns the total number of messages in the queue
     */
    getCount() {
        return this.queue.length + this.delayedQueue.length;
    }

    /**
     * add - Add a message to the trigger queue
     * @param {string} topic  
     * @param {string} message 
     */
    add(topic, message) {

        // pre-check to prevent uneccesairy calls to the Homey trigger system
        // prevents disabling of random flows not even listening to these topics (Homey BUG?)...
        // this is also a performance boost, since the Homey trigger system won't be called for all api topics
        // the small downside is the duplicate topic matching, if there is a match on a trigger topic (here & at the trigger listener...)
        let triggers = this.broker.getTopicsRegistry().getTriggerMatches(topic).map(t => t.getTopicName());
        if(triggers.length == 0) {
            if(DEBUG) {
                this.logmodule.writelog('debug', "Skip trigger no match found for trigger topic.");
            }
            return false;
        }
   
        // add message to queue
        this._addToQueue({ topic, message, triggers });

        // process queue
        if (process !== false) {
            this.process()
                .catch(e => {
                    this.logmodule.writelog('info', "Failed to process trigger queue");
                    this.logmodule.writelog('error', e);
                });
        }
        return true;
    }

    // Choose the correct queue for incoming messages
    _addToQueue(trigger) {
        // is delayed topic?
        if(trigger.triggers.some(wildcard => this.delayedTopics.has(wildcard))) {
            this.delayedQueue.push(trigger); // add the trigger to the delayed queue
        } else {
            this.queue.push(trigger);        // leave the trigger on the regular queue
        }
    }

    /**
    * removeMessagesForTopic - Remove all queued messages for a specific topic from the trigger queue
    * e.g. Can be used to clean-up when the topic on a flow card trigger is changed
    * @param {string} topic the topic to remove all messages for
    */
    removeMessagesForTopic(topic) {
        let total = this.queue.length + this.delayedQueue.length;
        this.queue = this.queue.filter(t => t.topic === topic);
        this.delayedQueue = this.delayedQueue.filter(t => t.topic === topic);
        let remaining = this.queue.length - this.delayedQueue.length;
        this.logmodule.writelog('info', "Removed "+(total-remaining)+" messages from the trigger queue, "+remaining+" remaining");
    }

    /**
     * Empty the queue
     */
    async process() {
        if (this._processing) return;
        this._processing = true;

        try {
            const counts = new Map(); // counts per trigger topic
            let trigger = null;

            // messages left in the queue? 
            while (this.running && this.getCount() > 0) {
                this.total = Math.max(this.getCount(), this.total);

                // call the flow card for the next trigger message in the queue
                try {
                    trigger = await this.next();
                } catch (e) {
                    trigger = null;
                    this.logmodule.writelog('info', "TriggerQueue: Failed to process next message");
                    this.logmodule.writelog('error', e);
                }

                if(!trigger) continue; // failed to trigger flow card, just continue...

                // The Homey trigger system allows a max of 10 calls per second for each flow card.
                // Since each card triggers on a specific topic, we count executions per trigger topic.
                // If one of the topics reached the max of 10 calls, we wait 1 second to prevent the flow card to be disabled.
                for(let wildcard of trigger.triggers) {
                    let count = (counts.get(wildcard) || 0) + 1; // how many times has this trigger topic been hit?
                    if(count === RATE_LIMIT) {                   // rate limit hit?

                        this.logmodule.writelog('info', "[WARNING] Rate limiter hit for topic: " + trigger.topic + ' on trigger ' + wildcard);
                        this.logmodule.writelog('info', this.getCount() + " messages left in the trigger queue");

                        // wait?
                        if (RATE_LIMIT_DELAY > 0) {
                            try {
                                // mark wilcard as delayed & move messages to the delayed queue
                                this._handleRateLimitedTriggerTopic(wildcard);

                                // wait 1 sec. to prevent disabling of the flow(s)
                                // A delay is non-blocking, meaning the client can still send or process all other messages during the wait
                                await delay(RATE_LIMIT_DELAY); 
                            } catch (e) {
                                this.logmodule.writelog('info', "TriggerQueue: Rate limiting delay failure");
                                this.logmodule.writelog('error', e);
                            }
                        }
    
                        // clear the counts to start all over
                        counts.clear();

                        // finished processing all triggers for limited topics?
                        if(this.delayedQueue.length == 0) {
                            this.delayedTopics.clear();
                        }

                    } else { // all save
                        counts.set(wildcard, count); // increase the counter for the trigger topic
                    }
                    break; // break the loop; we already waited. The check for the rest op the trigger topics can be skipped
                }
            }
        } catch (e) {
            this.logmodule.writelog('info', 'TriggerQueue: Failed to process queue');
            this.logmodule.writelog('error', e);
        }
        
        // reset for the next process call
        this._processing = false;
        this.total = 0;
    }

    _handleRateLimitedTriggerTopic(wildcard) {
        this.delayedTopics.add(wildcard); // mark topic limited
        const limitedCount = this.delayedQueue.length;

        // move all existing triggers to the correct queue
        let triggers = this.queue;
        this.queue = [];
        for(let trigger of triggers) {
            this._addToQueue(trigger);            
        }

        // log
        const movedCount = this.delayedQueue.length - limitedCount;
        if(movedCount > 0) {
            this.logmodule.writelog('info', 'Moved ' + movedCount + ' triggers to the delayed queue to prevent disabling of flows');
        }
    }

    /**
     * next - process the next message in the queue
     */
    async next() {
        var trigger = this.queue.shift() || this.delayedQueue.shift();
        if (trigger) {
            try {
                await this._trigger(trigger.topic, trigger.message);
                return trigger;
            } catch (e) {
                this.logmodule.writelog('info', 'TriggerQueue: Failed to trigger next message');
                this.logmodule.writelog('error', e);
            }
        }
        return null;
    }

    // send message to the Homey flow card trigger
    async _trigger(topic, message) {
        let tokens = {
            message: message,
            topic: topic
         }
   
         let triggerstate = {
            triggerTopic: topic,
         }
   
         try {
            if(DEBUG) {
                this.logmodule.writelog('debug', "Trigger generic card for " + topic);
            }
            await this.triggers.getEventMQTT().trigger(tokens, triggerstate);
         } catch(e) {
            this.logmodule.writelog('error', "Error occured: " +e);
         }
    }

    /**
     * getState - get processing info 
     * @returns the number of messages being processed
     */
    getState() {
        let total = Math.max(this.getCount(), this.total);
        return {
            processing: this._processing,
            progress: total - Math.max(0, Math.min(total, this.getCount())),
            total: total
        };
    }
    
    /**
     * start - start processing messages in the queue
     */
    start() {
        this.running = true;
        this.process();
    }

    /**
     * stop - stop processing messages in the queue
     */
    stop() {
        this.running = false;
    }

    /**
     * clear - remove all messages from the queue
     */
    clear() {
        this.queue = [];
        this.delayedTopics.clear();
        this.delayedQueue = [];
        this.total = 0;
    }

    /**
    * updateRef - updates references to other classes
    *
    * @param  {type} app reference to the main app instance
    * @return {type}     no return value
    */
    updateRef(app) {
        this.triggers = app.triggers;
        this.broker = app.broker;
    }

    /**
     * destroy - Destroy the TriggerQeueu
     */
    destroy() {
        this.stop();
        this.clear();
    }
}

module.exports = TriggerQueue;
