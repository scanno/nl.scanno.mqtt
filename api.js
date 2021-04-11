
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
    const result = homey.app.sendMessage(body);
    return result === undefined ? null : result;
  },

  async subscribeTopic({ homey, params, body }) {
    console.log("API: Incoming POST on /subscribe/");
    const result = await homey.app.subscribeToTopic(body.topic);
    return result === undefined ? null : result;
  },

  async unsubscribeTopic({ homey, params, body }) {
    console.log("API: Incoming POST on /unsubscribe/");
    const result = await homey.app.unsubscribeFromTopic(body.topic);
    return result === undefined ? null : result;
  },
};
