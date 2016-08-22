# Owntracks MQTT Client for Homey

This app is based on the MQTT Client for Homey made by Johan Kuster.

Owntracks is an open source location app for Android and iOS. It sends location information to a MQTT broker.
This can be a private MQTT broker you are hosting yourself, or a public MQTT broker. The Owntracks app does not
use a lot of battery (at least on my Android phone).
The Owntracks apps have an integrated option to connect to the owntracks public MQTT broker, but this cannot be
used with this client. This is due to the fact that a random userid is generated. However there are several other
public MQTT brokers available. I have tested with broker.hivemq.com.

USING A PUBLIC MQTT BROKER HAS SECURITY IMPLICATIONS. EVERYONE CAN SEE YOUR MESSAGES.

How does this work and what can it do on Homey?
In the Owntracks app you can add geofences, and Owntracks sends events to the broker containing information about
entering or leaving a geofence. These events can be used with trigger cards in Homey flows.
And as such it can be used for presence detection.

The Owntracks app sends its data to a MQTT topic on the broker. This topic is different for each user and each device.
A typical topic name would be: owntracks/<user-id>/<device-name>/event
The trailing event means that only events regarding geofences will be received by the Homey client. In the Owntracks 
clients, you can find out what topic is used to send the messages to (do not forget to add event to that topic).
Besides subscribing to the MQTT topic, you have to enter the name of the geofence you specified in the Owntracks Android
or iOS app (regions section). Make sure you enbale the share option. Otherwise the name of the geofence is not included in
the message and the trigger will not fire.

This app supports the following trigger cards:
- a card that will trigger when entering the specified geofence
- a card that will trigger when leaving the specified geofence
- a card that will trigger on a enter / leave event on the specified geofence. This card provides a tag that contains 
  the event (i.e. the values can be enter or leave)

The setting page contains 3 input fields for specifying the adress of the MQTT server, userid and password for that server.
When using a public MQTT server, you can just leave the userid and password fields empty.

As said this app is based on the MQTT Client from Johan Kuster. It also has the same problems:
Because there is a kind of chicken and egg problem here, you need to reboot/unplug the homey after you have defined the URL and 
first active trigger. A new trigger will work after any other active trigger was triggered. Of course you could also restart
your Homey.

What works:

* Multiple topics, triggers can be used
* The same topic can be used more than once
* works for Mosquitto MQTT broker but probably also for any other broker that supports MQTT.

What doesn't:

* Starting from scratch without restarting Homey

Future enhancements:
* Look into adding secure sessions (i.e TLS)

