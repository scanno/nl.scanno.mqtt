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
//    this.logmodule.writelog('debug', "add message: "+ JSON.stringify(message));
    this.messages.push(message);
  }

  removeMessage() {
    var message=this.messages.pop();
//    this.logmodule.writelog('debug', "pop message: "+ JSON.stringify(message));
    return message;
  }

  clear() {
    this.messages = [];
  }

  isEmpty() {
  //  this.logmodule.writelog('debug', "length "+ this.messages.length);
    return this.messages.length === 0;
  }
}

module.exports = SendQueue
