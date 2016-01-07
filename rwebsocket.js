var http = require('http'),
	https = require('https'),
	websocket = require('websocket'),
	util = require('util');

function _log(msg) {
	console.log.apply(console, arguments);
	console.log('');
}

function _inspect(ass, depth) {
	undefined === depth && (depth = 3);
	if ( typeof ass != 'string' && typeof ass != 'number' ) {
		ass = util.inspect(ass, false, depth, true);
	}
	return _log(ass);
}

function _id() {
	var id = String(Math.random()).substr(2, 12);
	if ( id[0] == '0' ) {
		return _id();
	}

	return id;
}



/**
 * Options:
 * - port
 * - commands
 */

module.exports = function(options) {
	var HTTPServer = http.Server;
	var HTTPSServer = https.Server;
	var WebSocketServer = websocket.server;
	var WebSocketConnection = websocket.connection;

	var commands = options.commands || {};


	// Extend all client objects
	WebSocketConnection.prototype.sendCmd = function(cmd, data) {
		data || (data = {});
		data.cmd = cmd;
		return this.send(JSON.stringify(data));
	};
	WebSocketConnection.prototype.withAllOtherClients = function(callback) {
		this.wsServer.connections.forEach(function(client) {
			if ( client != this ) {
				callback.call(this, client);
			}
		}, this);
	};
	WebSocketConnection.prototype.withAllOtherClientsInGame = function(callback, game) {
		if ( game == null ) {
			game = this.data.game;
		}

		this.wsServer.connections.forEach(function(client) {
			if ( client.data.game == game && client != this ) {
				callback.call(this, client);
			}
		}, this);
	};



	// Dfine client event handlers here, so they exist only once
	var onMessage = function(message) {
		if (message.type === 'utf8') {
			try {
				var msg = JSON.parse(message.utf8Data); // THROWS
				if ( !msg.cmd ) {
					throw "Missing 'cmd' in message."; // THROWS
				}

				_log('Incoming:');
				_inspect(msg);

				var cmd = commands[msg.cmd];
				if ( !cmd ) {
					throw "'" + msg.cmd + "' is not a valid command."; // THROWS
				}

				try {
					cmd.call(this, msg); // THROWS
				}
				catch (ex) {
					throw "Error while executing '" + msg.cmd + "': " + ex.message; // THROWS
				}
			}
			catch (ex) {
				_log('Invalid cmd:');
				_log(message.utf8Data);
				_log(ex);

				// this.sendCmd('error', {error: ex.message});
			}
		}
	};
	var onClose = function(reasonCode, description) {
		var hours = (Date.now() - this.socket._opened) / 1000 / 60 / 60;
		_log('Client leaves: ' + this.data.id + ', after ' + (Math.round(hours * 100) / 100) + ' hours');

		if ( commands._close ) {
			commands._close.call(this, {});
		}
	};



	// Create HTTP(S) and WebSocket servers
	var httpServer = options.ssl ? new HTTPSServer(options.ssl) : new HTTPServer();
	httpServer.listen(options.port, function() {
		var httpx = options.ssl ? 'HTTPS' : 'HTTP';
		_log(httpx + ' server is listening on port ' + options.port);
	});
	var wsServer = new WebSocketServer({
		httpServer: httpServer,
	});
	wsServer.on('request', function(request) {

		// We take anyone
		var client = request.accept();
		client.wsServer = wsServer;
		client.socket._opened = Date.now();

		// Custom data
		client.data || (client.data = {});
		client.data.id = _id();
		client.data.game = 1;

		_log('New client: ' + client.data.id); // client.socket._peername.port

		client.on('message', onMessage);

		client.on('close', onClose);

		// Optionally attach more client event listeners
		if ( commands._on ) {
			for ( var type in commands._on ) {
				client.on(type, commands._on[type]);
			}
		}

		// And then run the client init/open command
		if ( commands._open ) {
			commands._open.call(client, {});
		}

	});

	return {
		httpServer: httpServer,
		wsServer: wsServer,
	};
}
