var rwebsocket = require('./rwebsocket.js');

function _log(msg) {
	console.log.apply(console, arguments);
	console.log('');
}

var online = {
	// id: Date
};
var offliners = {
	// id: timer
};

var pools = {
	177: {
		coach: 'coach1',
		client: 'client1',
	},
	331: {
		coach: 'coach2',
		client: 'client2',
	},
};

var wsw = {
	validateID: function(id, callback) {
		// Validate user input ID
		for (var game in pools) {
			var pool = pools[game];
			if (pool.coach == id) {
				return callback({game: game, role: 'coach'});
			}
			else if (pool.client == id) {
				return callback({game: game, role: 'client'});
			}
		}

		return callback(false);
	},
};

var commands = {
	_ignore: ['ping'],
	_init: function(WebSocketServer, WebSocketConnection) {
		WebSocketConnection.prototype.withAllOtherUsersInGame = function(callback) {
			this.withAllOtherClientsInGame(function(other) {
				if (this.data.user != other.data.user) {
					callback.call(this, other);
				}
			});
		};
	},

	/**
	 * PRESENCE
	 */
	init: function(data) {
		this.data.user = data.id;
		var client = this;

		// Identify and authenticate the incoming ID
		wsw.validateID(data.id, function(user) {
			if (user) {
				client.data.game = user.game;
				client.data.role = user.role;
				client.sendCmd('init', user);

				// This user isn't online yet
				if (!online[client.data.user]) {
					_log('JOIN: ' + client.data.user);

					// This is a client, so we tell all coaches about them
					if (client.data.role == 'client') {
						var notified = [];
						client.withAllOtherClientsInGame(function(other) {
							// Once per user, because 1 client might have 4 instances/windows
							if (notified.indexOf(other.data.user) == -1) {
_log('tell ' + other.data.role + ' ' + other.data.id + ' that ' + client.data.role + ' ' + client.data.id + ' joined');
								notified.push(other.data.user);
								other.sendCmd('join');
							}
						});
					}
				}

				// Tell this coach instance/window about all online clients
				if (client.data.role == 'coach') {
					var notified = [];
					client.withAllOtherClientsInGame(function(other) {
						// Once per user, because this client might have 4 instances/windows, but the coach needs only 1 notification
						if (other.data.role == 'client' && notified.indexOf(other.data.user) == -1) {
_log('tell ' + client.data.role + ' ' + client.data.id + ' that ' + other.data.role + ' ' + other.data.id + ' is online');
							notified.push(other.data.user);
							client.sendCmd('join');
						}
					});
				}

				// Start listening for timeout/missing pings
				commands._listenForTimeout.call(client);
			}
			else {
				client.sendCmd('invalid');
				client.close();
			}
		});

	},
	ping: function() {
		// Push ahead (reset) the timeout timer
		commands._listenForTimeout.call(this);
	},
	_listenForTimeout: function() {
		online[this.data.user] = 1;

		// Reset timeout timer
		clearTimeout(offliners[this.data.user]);
		offliners[this.data.user] = setTimeout(function(client) {
			online[client.data.user] = 0;
			_log('LEAVE: ' + client.data.user);

			if (client.data.role == 'client') {
				client.withAllOtherClientsInGame(function(other) {
_log('tell ' + other.data.role + ' ' + other.data.id + ' that ' + client.data.role + ' ' + client.data.id + ' left');
					other.sendCmd('leave');
				});
			}
		}, 3000, this);
	},

	/**
	 * CALLING
	 */
	call: function(data) { // Coach to client
		// Only accept the call signal from a coach
		if (this.data.role == 'coach') {
			this.withAllOtherUsersInGame(function(other) {
				other.sendCmd('call', {from: this.data.id});
			});
		}
	},
	accept: function(data) { // Client to coach
		// Only accept the accept signal from a client
		if (this.data.role == 'client') {
			this.withAllOtherUsersInGame(function(other) {
				other.sendCmd('accept');
			});
		}
	},
	reject: function(data) { // Client to coach
		// Only accept the reject signal from a client
		if (this.data.role == 'client') {
			this.withAllOtherClientsInGame(function(other) {
				if (other.data.id == data.from) {
					other.sendCmd('reject');
				}
			});
		}
	},
	unable: function(data) { // Both
		this.withAllOtherClientsInGame(function(other) {
			other.sendCmd('unable');
		});
	},

	/**
	 * WEBRTC
	 */
	offer: function(data) { // Coach to client
		this.withAllOtherClientsInGame(function(other) {
			other.sendCmd('offer', data);
		});
	},
	answer: function(data) { // Client to coach
		this.withAllOtherClientsInGame(function(other) {
			other.sendCmd('answer', data);
		});
	},

	_open: function() {
		// Ignore this, because online starts only after the 'init' signal
	},
	_close: function() {
		// Ignore this, because 1 user might have 4 instances/windows, and one of them closing doesn't mean offline
	},
};

var options = {
	port: 8088,
	commands: commands,
};
var rws = rwebsocket(options);
