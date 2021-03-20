MQTT Client for Homey

With this app you will be able to send messages to a topic and receive messages from a topic.
By means of flowcards you can subscript to topics (Wildcards are supported) and trigger a
flow when a message arrives on a topic.

With the action cards you are able to send a message to a topic.

The settings page contains:
- IP adres or DNS name of the broker where to connect to
- Portnumber to connect to.
- The option to use a secure session (TLS). No support for self signed certificates.
- Possibility to bypass certificate check in case of self-signed certificates
- Userid for the broker connection
- Password to use for the broker connection

MQTT support for other apps / drivers

The MQTT Client includes a simple way for other applications / drivers to use MQTT
by supplying a way to subscribe to MQTT topics and sending messages to a MQTT topic.
This eliminates the need for the application/drivers to include their own MQTT client.
