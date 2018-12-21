const Homey = require('homey');

module.exports = [{
   description:	'Test MQTT connection',
   method:      'POST',
   path:        '/test/broker/',
   requires_authorization: true,
   role: 'owner',
   fn: function(args, callback) {
      console.log("API: Incoming POST on /set/broker/");
      var result = Homey.app.testBroker(args);
      if( result instanceof Error ) callback( result );
      callback( null, result );
   }
},
{
   description:	'Notify on settings changed',
   method:      'POST',
   path:        '/test/settingschange/',
   requires_authorization: true,
   role: 'owner',
   fn: function(args, callback) {
      console.log("API: Incoming POST on /test/settingschange/");
      var result = Homey.app.changedSettings(args);
      if( result instanceof Error ) callback( result );
      callback( null, result );
   }
},
{
   description:	'Show latst 10 loglines',
   method:      'GET',
   path:        '/test/getloglines/',
   requires_authorization: true,
   role: 'owner',
   fn: function(args, callback) {
      console.log("API: Incoming POST on /test/getloglines/");
      var result = Homey.app.getLogLines(args);
      callback(null, result);
   }

},
{
   description:	'Publish message (app2app)',
   method:      'PUT',
   path:        '/app2app/publish/',
   requires_authorization: true,
   role: 'app',
   fn: function(args, callback) {
      result = Homey.app.publishMessage(args);
      if( result instanceof Error ) return callback( result );
      return callback( null, result );
   }
},
]
