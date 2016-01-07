window.onerror = function(e) {
	alert(e);
};

function _log() {
	return console.log.apply(console, arguments);
}

(function(P) {
	P.on = P.addEventListener;
	P.sendJSON = function(data, callback) {
		return this.send(JSON.stringify(data), callback);
	};
	P.sendCmd = function(cmd, data) {
		data || (data = {});
		data.cmd = cmd;
		return this.sendJSON(data);
	};
})(WebSocket.prototype);
