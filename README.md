# Owntracks MQTT Client for Homey

This app is based on the MQTT Client for Homey made by Johan Kuster. So big thanks to him for creating the original
MQTT Client for Homey.

With this app it is posible to subscripe to MQTT topics and mainly to owntracks topics.

At this time the app has one trigger card. On this card you have to specify the topic and the name of the geofence that
is specified in the owntracks app.


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

* Starting from scratch without restarting Homey

Future enhancements:
* More trigger cards for boolean triggers

