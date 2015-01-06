var infos = require('./infos');
var map = require('./map');
var globalSettings = require('./settings');

var socketio;


function init(io) {
	socketio = io;
}

function refreshViewerMap(x, y, exception) {
	for(s in socketio.handshaken) {
		if(socketio.handshaken[s].user_id!=undefined && socketio.sockets.sockets[s]!=undefined && (exception==undefined || exception!=socketio.handshaken[s].user_id)) {
			
			// On récupère les informations de ce spectateur
			var viewerData = infos.getMapData(socketio.handshaken[s].user_id);
			
			if(x>=viewerData.min_x-((viewerData.max_x-viewerData.min_x-1)/2) && x<=viewerData.max_x && y>=viewerData.min_y-((viewerData.max_y-viewerData.min_y-1)/2) && y<=viewerData.max_y) {
				map.refreshMap(socketio.sockets.sockets[s]);
			}
		}
	}
}

function showTornado(x, y, data) {
	for(s in socketio.handshaken) {
		if(socketio.handshaken[s].user_id!=undefined && socketio.sockets.sockets[s]!=undefined) {

			// On récupère les informations de ce spectateur
			var viewerData = infos.getMapData(socketio.handshaken[s].user_id);

			if(x>=viewerData.min_x && x<=viewerData.max_x && y>=viewerData.min_y && y<=viewerData.max_y) {
				socketio.sockets.sockets[s].emit('tornado', data);
			}
		}
	}
}

function updateTime(data) {
	socketio.sockets.emit('updateTime', data);
}

function getSocketByUserId(user_id) {
	for(s in socketio.handshaken) {
		if(socketio.handshaken[s].user_id!=undefined && socketio.handshaken[s].user_id==user_id) {
			return socketio.sockets.sockets[s];
		}
	}
	
	return null;
}

function refreshMarketPrices() {
	for(s in socketio.handshaken) {
		if(socketio.handshaken[s].user_id!=undefined && socketio.sockets.sockets[s]!=undefined) {
			globalSettings.refreshMarketPrices(socketio.sockets.sockets[s]);
		}
	}
}


exports.init = init;
exports.refreshViewerMap = refreshViewerMap;
exports.showTornado = showTornado;
exports.updateTime = updateTime;
exports.getSocketByUserId = getSocketByUserId;
exports.refreshMarketPrices = refreshMarketPrices;