
module.exports = {
  async testBroker({ homey, params, body }) {
    console.log("API: Incoming POST on /set/broker/");
    const result = await homey.app.testBroker(params);
    return result === undefined ? null : result;
  },

  async updateSettings({ homey, params, body }) {
    console.log("API: Incoming POST on /test/settingschange/");
    const result = homey.app.changedSettings(body);
    return result === undefined ? null : result;
  },

  async getLoglines({ homey, query }) {
    console.log("API: Incoming POST on /test/getloglines/");
    const result = homey.app.getLogLines();
    return result === undefined ? null : result;
  },

  async sendMessage({ homey, params, body }) {
    console.log("API: Incoming POST on /send/ ");
    if (!homey.app) {
      console.log("API: App not yet available");
      return ("too soon");
    }
    const result = homey.app.sendMessage(body);
    return result === undefined ? null : result;
  },

  async subscribeTopic({ homey, params, body }) {
    console.log("API: Incoming POST on /subscribe/");
    if (!homey.app) {
        console.log("API: App not yet available");
        return ("too soon");
    }

    const result = await homey.app.subscribeToTopic(body.topic, body.reference);
    return result === undefined ? null : result;
  },

  async unsubscribeTopic({ homey, params, body }) {
    console.log("API: Incoming POST on /unsubscribe/");
    if (!homey.app) {
        console.log("API: App not yet available");
        return ("too soon");
    }

    if(!body.topic && !body.reference) {
      throw new Error('No reference provided in the request body. Can only unsubscribe from topics subscribed with a reference (e.g. app.id)');
    }  

    return body.topic 
      ? await homey.app.unsubscribeFromTopic(body.topic, body.reference)
      : await homey.app.unsubscribeFromAllTopicsForReference(body.reference);
  },
};
