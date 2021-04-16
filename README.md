# MQTT Client for Homey

This app was initially based on the MQTT Client for Homey made by Johan Kuster.

With this app you will be able to send messages to a topic and receive messages from a topic.

The app contains two cards. One for subscribing to a topic and receiving messages from that topic.
With the other card you will be able to send a message to a topic.

Wildcards in a topic are supported.

The settings page contains:
- The option to use the HiveMQ public broker
- IP adres or DNS name of the broker wehre to connect top
- Portnumber to connect to.
- The option to use a secure session (TLS). No support for self signed certificates.
- Possibility to bypass certificate check in case of self-signed certificates
- Userid for the broker connection
- Password to use for the broker connection

# Public API

- send MQTT messages to `topic`
- subscribe to topic

## API usage example
Add `homey:app:nl.scanno.mqtt` to your app.json permissions.

```
const Homey = require('homey');
const MQTTClient = new Homey.ApiApp('nl.scanno.mqtt');

class MyApp extends Homey.App {

    onInit() {
        MQTTClient
            .register()
            .on('install', () => this.register())
            .on('uninstall', () => this.unregister())
            .on('realtime', (topic, message) => this.onMessage(topic, message));
        
        MQTTClient.getInstalled()
            .then(installed => {
                if (installed) {
                    this.register();
                }
            })
            .catch(error => this.log(error));
    }

    onMessage(topic, message) {
        this.log(topic + ": " + JSON.stringify(message, null, 2));
    }

    register() {
        // Subscribe to all messages in the `homey` topic
        // messages will pass through the onMessage method via the realtime api
        MQTTClient.post(
            'subscribe', 
            { topic: 'homey/#', reference: 'my.app.id' }, 
            (error) => this.log(error || 'subscribed to topic: homey/#')
        );

        // send a message
        try {
            MQTTClient.post('send', {
                qos: 0,
                retain: false,
                mqttTopic: 'homey/test',
                mqttMessage: {
                    msg: 'Hello MQTT!'
                }
            });
        } catch (error) {
            this.log(error);
        }
    }

    unregister(){
        // Unsubscribe from topics used by this app
        // If the topic is not provided, all topics used by 'my.app.id' will be unsubscribed
        MQTTClient.post(
            'unsubscribe', 
            { topic: 'homey/#', reference: 'my.app.id' }, 
            (error) => this.log(error || 'subscribed to topic: homey/#')
        );
    }
}
```

# You need access to a MQTT broker to be able to use this app.

#### Now it is possible to run a MQTT Broker in your Homey !!!. See my MQTT Broker app in the app store. It is still in beta at the moment, but fully functional.
