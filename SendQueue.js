"use strict"

class SendQueue {
  constructor() {
    this.messages = []
    this.logmodule = require("./logmodule.js");
  }

  getMessages() {
    return this.messages;
  }

  addMessage(message) {
    this.messages.push(message);
  }

  removeMessage() {
    var message=this.messages.pop();
    return message;
  }

  clear() {
    this.messages = [];
  }

  isEmpty() {
    return this.messages.length === 0;
  }
}

module.exports = SendQueue
