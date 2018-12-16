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

# You need access to a MQTT broker to be able to use this app.

#### Now it is possible to run a MQTT Broker in your Homey !!!. See my MQTT Broker app in the app store. It is still in beta at the moment, but fully functional.
