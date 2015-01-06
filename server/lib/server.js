function start() {
	console.log("Démarrage du serveur.");
	
	var session = require("sesh").magicSession() 
	  , server = require('http').createServer(onRequest)
	  , io = require('socket.io').listen(server).set('log level', 1)
	  , url = require('url')
	  , router = require("./router")
	  , environment = require('./environment')
	  , character = require('./character')
	  , building = require('./building')
	  , infos = require('./infos')
	  , settings = require('./settings')
	  , market = require('./market')
	  , plant = require('./plant')
	  , map = require('./map')
	  , broadcast = require('./broadcast');

	server.listen(1337);
	settings.init();
	map.init();
	broadcast.init(io);
	environment.init();
	character.init(io);
	building.init();
	market.init();
	plant.init();
	
	
	function onRequest(req, res) {
		var postData = '';
		var pathname = url.parse(req.url).pathname;
		
		req.setEncoding("utf8");
		
		// On permet le traitement de données POST
		req.addListener("data", function(postDataChunk) {
			postData += postDataChunk;
		});
		req.addListener("end", function() {
			// On va enregistrer si possible, l'id utilisateur dans les sockets
			if(pathname=='/play' && req.session.data.id!=undefined) {
				io.set('authorization', function (handshakeData, callback) {
					handshakeData.user_id = req.session.data.id;
					handshakeData.user = req.session.data.user;
					
					// On initalise les informations générales de ce joueur
					infos.initData(req.session.data.id, req.session.data.user);
										
				    callback(null, true);
				});
			}
			
			router.route(req, res, pathname, postData);
		});
	}
	
	io.sockets.on('connection', function (socket) {
		router.routeSocket(socket);

		socket.on('disconnect', function () {
			io.sockets.emit('characterDisconnected', {'user_id':io.handshaken[socket.id].user_id});
		});
	});
}

exports.start = start;