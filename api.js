module.exports = [
    {
        description:	'Test Owntracks connection',
        method: 		'POST',
        path:			'/get/broker/',
        fn: function(callback, args) {
            Homey.log("");
            Homey.log("API: Incoming POST on /test/broker/");
            
            Homey.app.testBroker(callback, args);
        }
/*    },
    
    {
        description:	'Get Homey\'s location',
        method: 		'POST',
        path:			'/get/restart/',
        fn: function(callback, args) {
            Homey.log("");
            Homey.log("API: Incoming POST on /get/restart/");
            
            Homey.app.setStatusChanged(callback, args);
        }*/
    }
]
