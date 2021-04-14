// Origninal implementation can be found here: https://github.com/hobbyquaker/mqtt-wildcard/blob/master/index.js
const topicMatches = function(topic, wildcard) {
    // MQTT subscription topics can contain "wildcards", i.e a + sign. However the topic returned
    // by MQTT brokers contain the topic where the message is posted on. In that topic, the wildcard
    // is replaced by the actual value. So we will have to take into account any wildcards when matching the topics.
    // MQTT subscription topics can contain "wildcards", i.e a + sign. However the topic returned
    // by MQTT brokers contain the topic where the message is posted on. In that topic, the wildcard
    // is replaced by the actual value. So we will have to take into account any wildcards when matching the topics.

    if (topic === wildcard) {
       return true;
    } else if (wildcard === '#') {
       return true;
    }
    var res = [];
    var t = String(topic).split('/');
    var w = String(wildcard).split('/');

    var i = 0;
    for (var lt = t.length; i < lt; i++) {
       if (w[i] === '+') {
             res.push(t[i]);
       } else if (w[i] === '#') {
             res.push(t.slice(i).join('/'));
             return true;
       } else if (w[i] !== t[i]) {
             return false;
       }
    }

    if (w[i] === '#') {
       i += 1;
    }

    if (i === w.length) {
       return true;
    } else {
       return false;
    }
 }

 module.exports = topicMatches;