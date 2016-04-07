# MQTT Client for Homey

This app makes it possible to subscribe to messages available on a message broker. Messages can also be published
on the message broker.

The app has a trigger with an argument where you have to define the topic you are subscribing to. There is a token "message"
that will contain the message received.

There is an Action where a message on a topic can be send to the broker.

In the app setting an URL where the broker can be found must be entered. Format is like 192.168.1.40:1883. At the moment
I assume that the broker is in your local network, probably installed on a Raspberry Pi together with Node-red :wink:.

Because there is a kind of chicken and egg problem here, you need to reboot/unplug the homey after you have defined the URL and 
first active trigger. A new trigger will work after any other active trigger was triggered. Of course you could also restart
your Homey.

What works:

* Multiple topics, triggers and actions can be used
* The same topic can be used more than once
* works for Mosquitto MQTT broker but probably also for any other broker that supports MQTT.

What doesn't:

* Use brokers that require username/password
* Starting from scratch without restarting Homey

Future enhancements:

* Support username password
* More than one broker?
* No reboot necesarry
