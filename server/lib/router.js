var path = require('path'),
	fs = require('fs'),
	requestHandler = require("./requestHandler"),
	querystring = require("querystring"),
	map = require("./map"),
	character = require("./character"),
	building = require("./building"),
	environment = require('./environment'),
	infos = require('./infos'),
	settings = require('./settings'),
	plant = require('./plant'),
	handle = {};

handle["/"] = requestHandler.start;
handle["/start"] = requestHandler.start;
handle["/logout"] = requestHandler.logout;
handle["/register"] = requestHandler.register;
handle["/passwordLost"] = requestHandler.passwordLost;
handle["/resetPassword"] = requestHandler.resetPassword;
handle["/play"] = requestHandler.play;
handle["/userExists"] = requestHandler.userExists;
handle["/userCredentials"] = requestHandler.userCredentials;

var mimeTypes = {
	"html": "text/html",
	"jpeg": "image/jpeg",
	"jpg": "image/jpeg",
	"png": "image/png",
	"js": "text/javascript",
	"css": "text/css"
};


function route(req, res, pathname, postData) {
	if (typeof handle[pathname] === 'function') {
		handle[pathname](req, res, querystring.parse(postData));
	}
	else {
		var filename = path.join(process.cwd(), pathname);
		fs.exists(filename, function(exists) {
			if(!exists) {
				console.log("Doesn't exist: " + filename);
				res.writeHead(404, {'Content-Type': 'text/plain'});
				res.write('404 Not Found\n');
				res.end();
				return;
			}
			
			load(filename, res);
			/*
			
			// On simule un chargement distant
			var regex = /^\/view\/img\//;
			var logo = /^\/view\/img\/logo.png/;
			var background = /^\/view\/img\/sign\-background.png/;

			if(regex.test(pathname) && !logo.test(pathname) && !background.test(pathname)) {
				var delay = (Math.random()*10000000)%500;
				setTimeout(function(){load(filename, res);}, delay);
			}
			else {
				load(filename, res);
			}
			*/
		});
	}
}

function load(filename, res) {
	var mimeType = mimeTypes[path.extname(filename).split(".")[1]];
	res.writeHead(200, {'Content-Type':mimeType});

	var fileStream = fs.createReadStream(filename);
	fileStream.pipe(res);
}

function routeSocket(socket, user_id) {
	// Map
	socket.on('getMap', function(data) { map.getMap(socket, data); })
		  .on('getMapHandshake', function(data) { map.getMap(socket, data, undefined, true); })
		  .on('getPosition', function() { map.getPosition(socket); })
		  .on('updateMapPosition', function(data) { map.updateMapPosition(socket, data); })
		  .on('getTileInformations', function(data) {  });

	// Environnement
	socket.on('getTime', function() { environment.getTime(socket); });

	// Character
	socket.on('moveCharacter', function(data) { character.moveCharacter(socket, data); })
		  .on('updateAngle', function(data) { character.updateAngle(socket, data); });
	
	// Plantes
	socket.on('plantAdd', function(data) { plant.plantAdd(socket,data); })
		  .on('plantRemove', function(data) { plant.deleteCrop(socket,data); })
		  .on('plantHarvest', function(data) { plant.harvest(socket, data); })
		  .on('plantHarvestDistribution', function(data) { plant.harvestDistribution(socket, data); })
		  .on('plantFertilize', function(data) { plant.fertilize(socket, data); })
		  .on('plantWaterize', function(data) { plant.waterize(socket, data); });

	// Buildings
	socket.on('buildingAdd', function(data) { building.buildingAdd(socket, data); })
		  .on('buildingRemove', function(data) { building.buildingRemove(socket, data); });
	
	// Informations
	socket.on('getInformations', function() { infos.getInformations(socket); })
		  .on('getAttackableTileAmount', function() {  })
		  .on('getOwnedWeapon', function() { infos.getOwnedWeapon(socket); })
		  .on('getTileInformations', function(data) { map.getTileInformations(socket, data); });
	
	// Réglages
	socket.on('getDisplaySettings', function() { settings.getDisplayData(socket); })
		  .on('getBuildingSize', function(data) { settings.getBuildingSizeSocket(socket); })
		  .on('getPrices', function() { settings.getPrices(socket); });
}


exports.route = route;
exports.routeSocket = routeSocket;