function isClient() {
	return document.body.classList.contains('role-client');
}

function isCoach() {
	return !isClient();
}

function init() {
	var id = location.hash.substr(1);
	if (!id) {
		alert('Need #id: coach1, client1, coach2, client2');
		return;
	}

	_log('initializing socket...');
	var url = 'wss://' + location.hostname + ':' + window.PORT;
	var socket = new WebSocket(url);
	socket.on('close', function() {
		document.body.classList.remove('loaded');
		window.COMMANDS.leave && window.COMMANDS.leave.call(null, {});
	});
	socket.on('open', function() {
		window.SOCKET = this;
		document.body.classList.add('loaded');
		_log('on open');

		this.sendCmd('init', {id: id});

		this.on('message', function(e) {
			var msg = JSON.parse(e.data);
console.log('msg', msg.cmd, msg);
			if (window.COMMANDS[msg.cmd]) {
				window.COMMANDS[msg.cmd].call(null, msg);
			}

			var cmd = msg.cmd;
			delete msg.cmd;
			var pre = document.createElement('pre');
			pre.textContent = cmd + ': ' + JSON.stringify(msg);
			document.body.insertBefore(pre, document.body.firstElementChild);
		});
	});
}
