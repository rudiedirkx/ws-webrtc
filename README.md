Usage
----

`client.html` is any connected user. `calling.html` is the call window/popup.

1. Open `client.html#coach1`
2. The coach can see the client offline status
3. Open `client.html#client1`
4. The coach can now call the client
5. The client can accept or reject this

Whether the RTC connection succeeds depends on a lot.

Server config
----

Run the Node server: `node server.js`, to start the WebSocket server. Port 8088.

To use on HTTPS/WSS, the webserver must set a WS proxy. On Apache, that's super easy. In the
HTTPS Vhost, add:

	ProxyPass /ws ws://127.0.0.1:8088/

`client.html` will automatically connect to the right WS or WSS server.
