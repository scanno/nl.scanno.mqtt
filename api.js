module.exports = [{
   description:	'Test Owntracks connection',
   method:      'POST',
   path:        '/test/broker/',
   requires_authorization: true,
   role: 'owner',
   fn: function(callback, args) {
      Homey.log("");
      Homey.log("API: Incoming POST on /set/broker/");
      Homey.app.testBroker(callback, args);
      callback(callback, args);
   }
},
{
   description:	'Notify on settings changed',
   method:      'POST',
   path:        '/test/settingschange/',
   requires_authorization: true,
   role: 'owner',
   fn: function(callback, args) {
      Homey.log("");
      Homey.log("API: Incoming POST on /test/settingschange/");
      Homey.app.changedSettings(callback, args);
      callback(callback, args);
   }
},
{
   description:	'Show latst 10 loglines',
   method:      'GET',
   path:        '/test/getloglines/',
   requires_authorization: true,
   role: 'owner',
   fn: function(callback, args) {
      Homey.log("");
      Homey.log("API: Incoming POST on /test/getloglines/");
      Homey.app.getLogLines(callback, args);
      callback(callback, args);
   }

}]




