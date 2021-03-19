
module.exports = {
  async testBroker({ homey, params, body }) {
    console.log("API: Incoming POST on /set/broker/");
    const result = await homey.app.testBroker(params);
    return result;
  },

  async updateSettings({ homey, params, body }) {
    console.log("API: Incoming POST on /test/settingschange/");
    const result = homey.app.changedSettings(body);
    return result;
  },

  async getLoglines({ homey, query }) {
    console.log("API: Incoming POST on /test/getloglines/");
    const result = homey.app.getLogLines();
    return result;
  },

  async sendMessage({ homey, params, body }) {
    console.log("API: Incoming POST on /send/ ");
    const result = homey.app.sendMessage(body);
    return result;
  },

  async subscribeTopic({ homey, params, body }) {
    console.log("API: Incoming POST on /subscribe/");
    const result = homey.app.subscribeToTopic(body.topic);
    return result;
  },
};
