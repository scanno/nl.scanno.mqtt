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

The settings page contains:
- The option to use the HiveMQ public broker
- IP adres or DNS name of the broker wehre to connect top
- Portnumber to connect to.
- The option to use a secure session (TLS). No support for self signed certificates.
- Userid for the broker connection
- Password to use for the broker connection
- The ability to specify the loaction accuracy in meters. Default is set at 100 meters. If the accuracy is worse than
  100 meters, the received event will be ignored.

Changes in version 0.3.0:
- Finally solved the multi triggering
- Connect options solved (userid and password)

Changes in version 0.2.0:
- Better JSON parsing
- Better topic handling
- Accuracy added
- TLS support
- No need to reboot after setting or changing broker settings
- Fixed the accumulating event triggering

What works:

* Multiple topics, triggers can be used
* The same topic can be used more than once
* works for Mosquitto MQTT broker but probably also for any other broker that supports MQTT.


