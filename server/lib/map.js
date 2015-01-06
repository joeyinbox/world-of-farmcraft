var url = require('url');
var db = require("./db");
var character = require('./character');
var infos = require('./infos');
var globalSettings = require("./settings");

var Tile = require('./class/tile');
var Ground = require('./class/ground');
var Water = require('./class/water');
var Corn = require('./class/corn');
var Tomato = require('./class/tomato');
var Wheat = require('./class/wheat');
var Barn = require('./class/barn');
var ColdStorage = require('./class/coldStorage');
var Silo = require('./class/silo');

var mapData = new Array();


function init() {
	// On va récupérer en local toutes les cases existantes du jeu
	console.log('Starting to load map tiles in memory...');
	
	connection = db.getConnection();
	connection.query('SELECT * FROM wof_tile_informations ORDER BY xpos, ypos', function(error, rows, fields) {
		if(error) {
			console.log('Database error on retrieving map tiles');
			console.log(error);
			process.exit();
		}
		else {
			for(var i=0; i<rows.length; i++) {
				setMapData(rows[i].xpos, rows[i].ypos, rows[i]);
			}
			
			console.log(rows.length+' map tiles successfully loaded in memory!');
		}
	});
}

function setMapData(x, y, data) {
	// On vérifie si l'entrée du tableau existe
	if(mapData[x]==undefined) {
		mapData[x] = new Array();
	}
	if(mapData[x][y]==undefined) {
		mapData[x][y] = {};
		mapData[x][y].xpos = null;
		mapData[x][y].ypos = null;
		mapData[x][y].type = 'ground';
		mapData[x][y].humidity = 0;
		mapData[x][y].fertility = 0;
		mapData[x][y].maturity = 0;
		mapData[x][y].health = 100;
		mapData[x][y].productivity = 1;
		mapData[x][y].maturated = null;
		mapData[x][y].id_crop = null;
		mapData[x][y].id_building = null;
		mapData[x][y].owner = null;
		mapData[x][y].id_alliance = null;
	}
	
	// Puis on ajoute les données
	
	if(data.xpos!=undefined) {
		mapData[x][y].xpos = data.xpos;
	}
	if(data.ypos!=undefined) {
		mapData[x][y].ypos = data.ypos;
	}
	if(data.type!=undefined) {
		mapData[x][y].type = data.type;
	}
	if(data.humidity!=undefined) {
		mapData[x][y].humidity = data.humidity;
	}
	if(data.fertility!=undefined) {
		mapData[x][y].fertility = data.fertility;
	}
	if(data.maturity!=undefined) {
		mapData[x][y].maturity = data.maturity;
	}
	if(data.health!=undefined) {
		mapData[x][y].health = data.health;
	}
	if(data.productivity!=undefined) {
		mapData[x][y].productivity = data.productivity;
	}
	if(data.maturated!=undefined) {
		mapData[x][y].maturated = data.maturated;
	}
	if(data.id_crop!=undefined) {
		mapData[x][y].id_crop = data.id_crop;
	}
	if(data.id_building!=undefined) {
		mapData[x][y].id_building = data.id_building;
	}
	if(data.owner!=undefined) {
		mapData[x][y].owner = data.owner;
	}
	if(data.id_alliance!=undefined) {
		mapData[x][y].id_alliance = data.id_alliance;
	}
}

function getMapRawData(x, y) {
	// On vérifie si l'entrée du tableau existe
	if(mapData[x]==undefined || mapData[x][y]==undefined) {
		return null;
	}
	
	return mapData[x][y];
}

function getMapData(x, y, data) {
	// On vérifie si l'entrée du tableau existe
	if(mapData[x]==undefined || mapData[x][y]==undefined) {
		return null;
	}
	
	if(typeof mapData[x][y].type === "string") {
		var element = eval('new '+mapData[x][y].type.replace(/\b./g, function (f) {return f.toUpperCase()})+'({maturity:mapData[x][y].maturity, health:mapData[x][y].health, maturated:mapData[x][y].maturated, id_building:mapData[x][y].id_building})');
	}
	else {
		var element = new Ground({maturity:mapData[x][y].maturity, health:mapData[x][y].health, maturated:mapData[x][y].maturated, id_building:mapData[x][y].id_building});
	}
	
	return new Tile(mapData[x][y].xpos, 
					mapData[x][y].ypos, 
					parseInt(mapData[x][y].xpos-data.x), 
					parseInt(mapData[x][y].ypos-data.y), 
					mapData[x][y].humidity, 
					mapData[x][y].fertility, 
					element,
					declareOwnership(data.user_id, data.alliance, mapData[x][y].owner, mapData[x][y].id_alliance));
}

function testMapData(socket, data) {
	socket.emit('test', getMapData(data.x, data.y, {x:data.x, y:data.y, user_id:1, alliance:null}));
}

function getMap(socket, data, fallback, handshake) {
	// On vérifie que l'on dispose des bonnes informations utilisateur
	data.user_id = socket.handshake.user_id;
	if(data.user_id==undefined || data.user_id==null || parseInt(data.user_id)!=data.user_id) {
		socket.emit('error', {invalidSession: true});
		return;
	}
	
	// On vérifie que l'angle est correct
	if(data.angle==undefined || !validateAngle(data.angle)) {
		if(fallback==undefined) {
			socket.emit('getMapAnswer', {error:'Invalid angle'});
			return;
		}
		else {
			fallback(socket, data, {error:'Invalid angle'});
			return;
		}
	}
	
	// On vérifie maintenant que la profondeur de la map est correcte
	if(data.depth_x==undefined || data.depth_x!=parseInt(data.depth_x) || data.depth_x<=0 || data.depth_y==undefined || data.depth_y!=parseInt(data.depth_y) || data.depth_y<=0) {
		if(fallback==undefined) {
			socket.emit('getMapAnswer', {error:'Invalid depth'});
			return;
		}
		else {
			fallback(socket, data, {error:'Invalid depth'});
			return;
		}
	}
	
	// Enfin, on vérifie que la position centrale a été renseignée
	if(data.x==undefined || data.x!=parseInt(data.x) || data.y==undefined || data.y!=parseInt(data.y)) {
		if(fallback==undefined) {
			socket.emit('getMapAnswer', {error:'Invalid position'});
			return;
		}
		else {
			fallback(socket, data, {error:'Invalid position'});
			return;
		}
	}
	
	// On enregistre la vue actuelle de l'utilisateur
	if(handshake!=undefined && fallback==undefined) {
		infos.setMapData(data.user_id, {'min_x':data.x, 'min_y':data.y, 'max_x':(data.x+parseInt(data.depth_x)), 'max_y':(data.y+parseInt(data.depth_y)), 'angle':data.angle});
		character.sendCharacterDisplay(socket, data.user_id);
		character.getOtherCharacterDisplay(socket, data.user_id, {'min_x':data.x, 'min_y':data.y, 'max_x':(data.x+parseInt(data.depth_x)), 'max_y':(data.y+parseInt(data.depth_y)), 'angle':data.angle});
	}
	
	// On ajuste la position de la map pour centrer la vue
	if(fallback==undefined) {
		data.x -= (data.depth_x-1)/2;
		data.y -= (data.depth_y-1)/2;
	}
	
	// On récupère une éventuelle alliance de l'utilisateur
	data.alliance = infos.getAlliance(data.user_id);
	
	// On vérifie maintenant si l'on possède déjà ces données ou s'il faut les générer
	var map = new Array();
	var toGenerate = new Array();
	
	for(i=parseInt(data.x); i<(parseInt(data.x)+parseInt(data.depth_x)); i++) {
		map[i-parseInt(data.x)] = new Array();
		for(j=parseInt(data.y); j<(parseInt(data.y)+parseInt(data.depth_y)); j++) {
			map[i-parseInt(data.x)][j-parseInt(data.y)] = getMapData(i, j, data);
			
			if(map[i-parseInt(data.x)][j-parseInt(data.y)]==null) {
				toGenerate.push({x:i, y:j});
			}
		}
	}
	
	// On vérifie si l'on a besoin de charger des données jusqu'alors inconnues
	if(toGenerate.length>0) {
		map = generateMap(data.x, data.y, map, toGenerate);
	}
	
	// On applique une éventuelle rotation des données
	if(data.angle==1) {
		map = rotate90(map);
	}
	else if(data.angle==2) {
		map = rotate180(map);
	}
	else if(data.angle==3) {
		map = rotate270(map);
	}

	// Enfin, on la transmet
	if(fallback==undefined) {
		// On conserve les perspectives par rapport aux bâtiments à l'affichage
		map = applyPerspective(map, data.angle);
		socket.emit('getMapAnswer', {'map':map});
	}
	else {
		fallback(socket, data, map);
	}
}

function refreshMap(socket) {
	// On vérifie que l'on dispose des bonnes informations utilisateur
	var user_id = socket.handshake.user_id;
	if(user_id==undefined || user_id==null || parseInt(user_id)!=user_id) {
		return;
	}
	
	// On rcupère les informations de la map du joueur
	var data = infos.getMapData(user_id);
	
	if(data==null) {
		return;
	}
	
	var formattedData = {};
	formattedData.depth_x = data.max_x-data.min_x;
	formattedData.depth_y = data.max_y-data.min_y;
	formattedData.x = data.min_x;
	formattedData.y = data.min_y;
	formattedData.angle = data.angle;
	
	// Puis on procède au traitement
	getMap(socket, formattedData);
}

function applyPerspective(map, angle) {
	for(var i=0; i<map.length; i++) {
		for(var j=0; j<map[i].length; j++) {
			if(map[i][j].element.type=='barn') {
				map[i][j].element.type = 'barn-part-0';

				if(angle%2==0) {
					if(map[i+1]!=undefined) {
						map[i+1][j].element.type = 'barn-part-1';
						if(map[i+1][j+1]!=undefined) {
							map[i+1][j+1].element.type = 'barn-part-3';
							if(map[i+1][j+2]!=undefined) {
								map[i+1][j+2].element.type = 'barn-part-5';
							}
						}
					}

					if(map[i][j+1]!=undefined) {
						map[i][j+1].element.type = 'barn-part-2';
						if(map[i][j+2]!=undefined) {
							map[i][j+2].element.type = 'barn-part-4';
						}
					}
				}
				else {
					if(map[i+1]!=undefined) {
						map[i+1][j].element.type = 'barn-part-2';
						if(map[i+2]!=undefined) {
							map[i+2][j].element.type = 'barn-part-4';
							if(map[i+2]!=undefined) {
								map[i+2][j+1].element.type = 'barn-part-5';
							}
						}

						if(map[i+1][j+1]!=undefined) {
							map[i+1][j+1].element.type = 'barn-part-3';
						}
					}

					if(map[i][j+1]!=undefined) {
						map[i][j+1].element.type = 'barn-part-1';
					}
				}
			}
			else if(map[i][j].element.type=='coldStorage') {
				map[i][j].element.type = 'coldStorage-part-0';

				if(map[i+1]!=undefined) {
					map[i+1][j].element.type = 'coldStorage-part-1';
					if(map[i+1][j+1]!=undefined) {
						map[i+1][j+1].element.type = 'coldStorage-part-3';
					}
				}

				if(map[i][j+1]!=undefined) {
					map[i][j+1].element.type = 'coldStorage-part-2';
				}
			}
		}
	}
	
	return map;
}

function declareOwnership(user_id, user_alliance_id, owner, alliance_id) {
	if(owner==null) {
		return 'neutral';
	}
	
	if(owner==user_id) {
		return 'own';
	}
	
	if(alliance_id==null) {
		return 'enemy';
	}
	
	if(alliance_id==user_alliance_id) {
		return 'allies';
	}
	
	return 'enemy';
}

function validateAngle(angle) {
	var regex = /^(0|1|2|3)$/;
	return regex.test(angle);
}

function rotate90(map) {
	var result = new Array();
	
	for(var i=0; i<map.length; i++) {
		var k = 0;
		for(var j=map[i].length-1; j>=0; j--) {
			if(result[k]==undefined) {
				result[k] = new Array();
			}
			
			result[k++][i] = map[i][j];
		}
	}
	
	return result;
}

function rotate180(map) {
	var result = new Array();
	
	var k = 0;
	for(var i=map.length-1; i>=0; i--) {
		result[k] = new Array();
		var l = 0;
		for(var j=map[i].length-1; j>=0; j--) {
			result[k][l++] = map[i][j];
		}
		k++;
	}
	
	return result;
}

function rotate270(map) {
	var result = new Array();
	
	var k = 0;
	for(var i=map.length-1; i>=0; i--) {
		var l = 0;
		for(var j=0; j<map[i].length; j++) {
			if(result[l]==undefined) {
				result[l] = new Array();
			}
			
			result[l++][k] = map[i][j];
		}
		k++;
	}
	
	return result;
}

function generateMap(mapX, mapY, map, toGenerate, callbackData) {
	// On va générer les données inexistantes
	for(i=0; i<toGenerate.length; i++) {
		// On procède à la génération de l'eau
		if(isWater(toGenerate[i].x-mapX, toGenerate[i].y-mapY, map)) {
			elementType = 'water';
		}
		else {
			elementType = 'ground';
		}
		
		// On initialise les données en local
		setMapData(toGenerate[i].x, toGenerate[i].y, {xpos:toGenerate[i].x,
											  		  ypos:toGenerate[i].y,
											  		  type:elementType,
											  		  humidity:null,
											  		  fertility:null,
											  		  maturity:0,
											  		  health:100,
											  		  maturated:null,
											  		  id_building:null,
											  		  owner:null,
											  		  id_alliance:null});
		
		map[toGenerate[i].x-mapX][toGenerate[i].y-mapY] = getMapData(toGenerate[i].x, toGenerate[i].y, {x:mapX, y:mapY});
	}
	
	// On répands correctement l'humidité et la fertilité du terrain
	if(toGenerate.length>0) {
		map = spreadHumidity(mapX, mapY, map, toGenerate);
		map = spreadFertility(mapX, mapY, map, toGenerate);
	}
	
	// On prépare l'insertion des données dans la base de données
	var values = new Array();
	for(i=0; i<toGenerate.length; i++) {
		var tmpMap = map[toGenerate[i].x-mapX][toGenerate[i].y-mapY];
		values.push('('+globalSettings.getTileTypeId(tmpMap.element.type)+', '+tmpMap.mapX+', '+tmpMap.mapY+', '+tmpMap.humidity+', '+tmpMap.fertility+')');
		
		// On en profite également pour enregistrer les données d'humidité et de fertilité en local
		setMapData(tmpMap.mapX, tmpMap.mapY, {humidity:tmpMap.humidity, fertility:tmpMap.fertility});
	}
	
	if(toGenerate.length>0) {
		// On insert ces données dans la base de données
		connection = db.getConnection();
		connection.query('INSERT INTO wof_tile(type, xpos, ypos, humidity, fertility) VALUES '+values.join(',')+' ON DUPLICATE KEY UPDATE id_tile=id_tile', function(error, rows, fields) {
			if(error) {
				console.log('Database error on inserting new tiles: '+error);
			}
			else if(callbackData!=undefined) {
				callbackData.callback(callbackData, map);
			}
		});
	}
	
	return map;
}

function isWater(i, j, map) {
	var x = Math.floor(Math.random()*100);

	var proba=0;
	var coefficient=30;
	
	var terre=1;
	var eau=0; 

	if(i>0 && map[i-1]!=undefined && map[i-1][j]!=null && map[i-1][j].element.type == 'water') {
		proba += coefficient;
	}
	
	if(j>=1 && map[i]!=undefined && map[i][j-1]!=null && map[i][j-1].element.type == 'water'){
		proba += coefficient;
	}
	
	if(i>=1 && j>=1 && map[i-1]!=undefined && map[i-1][j-1]!=null && map[i-1][j-1].element.type == 'water'){
		proba += coefficient/2;
	}

	x -= proba;  
	
	// Par défaut il y a 99/100 chance qu'un terrain soit de la terre
	if(x>=1) {
		return false;
	} 
	else {
		return true;
	}
}

function spreadFertility(mapX, mapY, map, valuesToAdd) {
	// On génère la fertilitié en fonction des données voisines
	for(var at=0; at<valuesToAdd.length; at++) {
		if(map[valuesToAdd[at].x-mapX][valuesToAdd[at].y-mapY].element.type == 'water') {
			map[valuesToAdd[at].x-mapX][valuesToAdd[at].y-mapY].fertility = 1.0;
		}
		else {
			var total = parseFloat(Math.ceil(Math.random()*100)/100);
			var count = 1;

			if(valuesToAdd[at].x-mapX>1) {
				total += map[valuesToAdd[at].x-mapX-2][valuesToAdd[at].y-mapY].fertility;
				count++;
			}
			if(valuesToAdd[at].x-mapX>0) {
				total += map[valuesToAdd[at].x-mapX-1][valuesToAdd[at].y-mapY].fertility;
				count++;
			}
			if(valuesToAdd[at].x-mapX<map.length-1) {
				total += map[valuesToAdd[at].x-mapX+1][valuesToAdd[at].y-mapY].fertility;
				count++;
			}
			if(valuesToAdd[at].x-mapX<map.length-2) {
				total += map[valuesToAdd[at].x-mapX+2][valuesToAdd[at].y-mapY].fertility;
				count++;
			}

			// Puis on fait la moyenne
			map[valuesToAdd[at].x-mapX][valuesToAdd[at].y-mapY].fertility = parseFloat(Math.ceil((total/count)*100)/100);
		}
	}
	
	return map;
}

function spreadHumidity(mapX, mapY, map, valuesToAdd) {
	
	// On génère l'humidité en fonction des données voisines
	for(var at=0; at<valuesToAdd.length; at++) {
		if(map[valuesToAdd[at].x-mapX][valuesToAdd[at].y-mapY].element.type == 'water') {
			map[valuesToAdd[at].x-mapX][valuesToAdd[at].y-mapY].humidity = 1.0;
		}
		else {
			// Si le terrain est près de l'eau, il devient très humide (>80%)
			if((valuesToAdd[at].x-mapX>=1 && map[valuesToAdd[at].x-mapX-1][valuesToAdd[at].y-mapY]!=undefined 
					&& (map[valuesToAdd[at].x-mapX-1][valuesToAdd[at].y-mapY].element.type=='water' 
						|| (valuesToAdd[at].y-mapY>=1 && map[valuesToAdd[at].x-mapX-1][valuesToAdd[at].y-mapY-1]!=undefined && map[valuesToAdd[at].x-mapX-1][valuesToAdd[at].y-mapY-1].element.type=='water')
						|| (valuesToAdd[at].y-mapY+1<map.length && map[valuesToAdd[at].x-mapX-1][valuesToAdd[at].y-mapY+1]!=undefined && map[valuesToAdd[at].x-mapX-1][valuesToAdd[at].y-mapY+1].element.type=='water')))
				|| (valuesToAdd[at].x-mapX+1<map.length && map[valuesToAdd[at].x-mapX+1][valuesToAdd[at].y-mapY]!=undefined 
					&& (map[valuesToAdd[at].x-mapX+1][valuesToAdd[at].y-mapY].element.type=='water'
						|| (valuesToAdd[at].y-mapY-1>=1 && map[valuesToAdd[at].x-mapX+1][valuesToAdd[at].y-mapY-1]!=undefined && map[valuesToAdd[at].x-mapX+1][valuesToAdd[at].y-mapY-1].element.type=='water')))
				|| (valuesToAdd[at].y-mapY>=1 && map[valuesToAdd[at].x-mapX][valuesToAdd[at].y-mapY-1]!=undefined && map[valuesToAdd[at].x-mapX][valuesToAdd[at].y-mapY-1].element.type=='water')
				|| (valuesToAdd[at].y-mapY+1<map.length && map[valuesToAdd[at].x-mapX][valuesToAdd[at].y-mapY+1]!=undefined 
					&& (map[valuesToAdd[at].x-mapX][valuesToAdd[at].y-mapY+1].element.type=='water'
						|| (valuesToAdd[at].x-mapX+1<map.length && valuesToAdd[at].y-mapY+1<map.length && map[valuesToAdd[at].x-mapX+1][valuesToAdd[at].y-mapY+1]!=undefined && map[valuesToAdd[at].x-mapX+1][valuesToAdd[at].y-mapY+1].element.type=='water')))) {

				map[valuesToAdd[at].x-mapX][valuesToAdd[at].y-mapY].humidity = parseFloat(Math.ceil((Math.random()*0.2 + 0.8)*100)/100);
			}
			else {
				map[valuesToAdd[at].x-mapX][valuesToAdd[at].y-mapY].humidity = parseFloat(Math.ceil(Math.random()*100)/100);
			}
		}
	}
	
	return map;
}

function getPosition(socket) {
	// On vérifie que l'on dispose des bonnes informations utilisateur
	var user_id = socket.handshake.user_id;
	if(user_id==undefined || user_id==null || parseInt(user_id)!=user_id) {
		socket.emit('error', {invalidSession: true});
		return;
	}
	
	// On essaye de récupérer sa position
	connection = db.getConnection();
	connection.query('SELECT map_x, map_y, user_x, user_y, angle FROM wof_user_position WHERE id_user='+user_id, function(error, rows, fields) {
		if(error) {
			console.log('Database error on retrieving position');
			console.log(error);

			// On envoi l'erreur
			socket.emit('getPositionAnswer', {error:'Database error on retrieving position'});
			return;
		}
		else if(rows.length==0) {
			console.log('No position available..');
			socket.emit('getPositionAnswer', {error:'No position available..'});
			return;
		}
		else {
			infos.setCharacterData(user_id, {x:rows[0].user_x, y:rows[0].user_y, previous_x:rows[0].user_x, previous_y:rows[0].user_y, 'angle':1});
			infos.setMapAngle(user_id, rows[0].angle);
			
			socket.emit('getPositionAnswer', {'map_x':rows[0].map_x, 'map_y':rows[0].map_y, 'user_x':rows[0].user_x, 'user_y':rows[0].user_y, 'angle':rows[0].angle});
			return;
		}
	});
}

function updateMapPosition(socket, data) {
	// On vérifie que l'on dispose des bonnes informations utilisateur
	var user_id = socket.handshake.user_id;
	if(user_id==undefined || user_id==null || parseInt(user_id)!=user_id) {
		socket.emit('error', {invalidSession: true});
		return;
	}
	
	// On vérifie que l'on a récupérer des coordonnées correctes
	if(data.x==undefined || data.y==undefined || parseInt(data.x)!=data.x || parseInt(data.y)!=data.y) {
		socket.emit('error', {error:'Invalid map position'});
	}
	
	// On modifie ses informations
	infos.updateMapPosition(user_id, {'x':data.x, 'y':data.y});
	
	// On modifie sa position
	connection = db.getConnection();
	connection.query('UPDATE wof_user_position SET map_x='+data.x+', map_y='+data.y+' WHERE id_user='+user_id, function(error, rows, fields) {
		if(error) {
			console.log('Database error on updating map position');
			console.log(error);

			// On envoi l'erreur
			socket.emit('error', {error:'Database error on updating map position'});
			return;
		}
	});
}

function allocateTerritory(user_id, res) {
	// On va devoir allouer du territoire à un utilisateur qui vient de créer son compte
	// Pour cela on va choisir aléatoirement un des 4 coins des zones exploitées puis, trouver un espace dans un radius pré-définit
	
	var corner = Math.floor(Math.random()*10)%4;
	
	switch(corner) {
		case 0: // coin suppérieur gauche
			var condition = "t.ypos ASC, t.xpos ASC";
			break;
		case 1: // coin suppérieur droit
			var condition = "t.ypos ASC, t.xpos DESC";
			break;
		case 2: // coin inférieur droit
			var condition = "t.ypos DESC, t.xpos DESC";
			break;
		case 3: // coin inférieur gauche
			var condition = "t.ypos DESC, t.xpos ASC";
			break;
	}
	
	connection = db.getConnection();
	connection.query('SELECT t.xpos, t.ypos FROM wof_tile t WHERE t.owner IS NOT NULL ORDER BY '+condition+' LIMIT 1', function(error, rows, fields) {
		if(error) {
			console.log('Database error on retrieving map\'s corner '+corner);
			console.log(error);
			
			// On redirige notre utilisateur vers la page de jeu
			res.writeHead(302, {'Location': '/play', 'Content-Type': 'text/html'});
			res.end('<a href="/play">Redirecting to the game...</a>');
		}
		else {
			var position = {};
			
			// On prends en compte le cas d'une map vierge
			if(rows.length==0) {
				position.x = 0;
				position.y = 0;
			}
			else {
				position.x = rows[0].xpos;
				position.y = rows[0].ypos;
			}
			
			// On récupère le radius de spawn pré-définit ainsi que la profondeur du champs alloué
			var radius = globalSettings.getSpawnRadius();
			var initialDepth = globalSettings.getInitialOwnedTilesDepth();
			
			// Puis, on récupère les cases se trouvant dans cet espace donné
			connection = db.getConnection();
			connection.query('SELECT * FROM wof_tile_informations WHERE xpos>='+(position.x-parseInt(radius))+' AND xpos<'+(parseInt(position.x)+parseInt(radius))+' AND ypos>='+(position.y-parseInt(radius))+' AND ypos<'+(parseInt(position.y)+parseInt(radius))+' ORDER BY xpos, ypos', function(error, rows, fields) {
				if(error) {
					console.log('Database error on retrieving available territories');
					console.log(error);
					
					// On redirige notre utilisateur vers la page de jeu
					res.writeHead(302, {'Location': '/play', 'Content-Type': 'text/html'});
					res.end('<a href="/play">Redirecting to the game...</a>');
				}
				else {
					// On initialise un tableau vide
					var map = new Array();
					var mapOwner = new Array();
					var depth = (radius*2)+1;
					
					for(var i=0; i<depth; i++) {
						map[i] = new Array();
						mapOwner[i] = new Array();
						for(var j=0; j<depth; j++) {
							// Que l'on remplis de valeurs négatives
							map[i][j] = null;
							mapOwner[i][j] = null;
						}
					}

					// Puis on récupère nos données
					for(var i=0; i<rows.length; i++) {
						mapOwner[rows[i].xpos-position.x+parseInt(radius)][rows[i].ypos-position.y+parseInt(radius)] = rows[i].owner;
						map[rows[i].xpos-position.x+parseInt(radius)][rows[i].ypos-position.y+parseInt(radius)]= new Tile(rows[i].xpos, 
																														  rows[i].ypos, 
																														  rows[i].xpos-position.x+parseInt(radius), 
																				 										  rows[i].ypos-position.y+parseInt(radius),
																														  rows[i].humidity, 
																														  rows[i].fertility, 
																														  eval('new '+rows[i].type.replace(/\b./g, function (f) {return f.toUpperCase()})+'({maturity:rows[i].maturity, health:rows[i].health, maturated:rows[i].maturated, id_building:rows[i].id_building})'),
																														  null);
					}
					
					
					// On va maintenant tenter de trouver un espace disponible en privilégiant les côtés opposés au coin choisit
					var leftOrRight = Math.floor(Math.random()*10)%2;
					
					var spawnPosition = null;
					var abstractPosition = {};
					
					outer: for(var i=0; i<3; i++) {
						var aborted = false;
						
						// On inverse le côté si la tentative précédente était un échec
						if(i==1) {
							leftOrRight = (leftOrRight+1)%2;
						}
						
						if((corner==0 && leftOrRight==0) || (corner==2 && leftOrRight==1) || (i==2 && corner==3)) {
							// Coin inférieur gauche
							inner: for(var j=depth-initialDepth-1; j<depth; j++) {
								for(var k=0; k<initialDepth; k++) {
									if(mapOwner[j][k]!=null) {
										aborted = true;
										break inner;
									}
								}
							}
							if(!aborted) {
								spawnPosition = {};
								spawnPosition.x = position.x-parseInt(radius);
								spawnPosition.y = position.y+parseInt(radius)-initialDepth;
								abstractPosition.x = 0;
								abstractPosition.y = depth-initialDepth;
								break outer;
							}
						}
						else if ((corner==1 && leftOrRight==0) || (corner==3 && leftOrRight==1) || (i==2 && corner==0)) {
							// Coin suppérieur gauche
							inner: for(var j=0; j<initialDepth; j++) {
								for(var k=0; k<initialDepth; k++) {
									if(mapOwner[j][k]!=null) {
										aborted = true;
										break inner;
									}
								}
							}
							if(!aborted) {
								spawnPosition = {};
								spawnPosition.x = position.x-parseInt(radius);
								spawnPosition.y = position.y-parseInt(radius);
								abstractPosition.x = 0;
								abstractPosition.y = 0;
								break outer;
							}
						}
						else if ((corner==2 && leftOrRight==0) || (corner==0 && leftOrRight==1) || (i==2 && corner==1)) {
							// Coin suppérieur droit
							inner: for(var j=0; j<initialDepth; j++) {
								for(var k=depth-initialDepth-1; k<depth; k++) {
									if(mapOwner[j][k]!=null) {
										aborted = true;
										break inner;
									}
								}
							}
							if(!aborted) {
								spawnPosition = {};
								spawnPosition.x = position.x+parseInt(radius)-initialDepth;
								spawnPosition.y = position.y-parseInt(radius);
								abstractPosition.x = depth-initialDepth;
								abstractPosition.y = 0;
								break outer;
							}
						}
						else if ((corner==3 && leftOrRight==0) || (corner==1 && leftOrRight==1) || (i==2 && corner==2)) {
							// Coin inférieur droit
							inner: for(var j=depth-initialDepth-1; j<depth; j++) {
								for(var k=depth-initialDepth-1; k<depth; k++) {
									if(mapOwner[j][k]!=null) {
										aborted = true;
										break inner;
									}
								}
							}
							if(!aborted) {
								spawnPosition = {};
								spawnPosition.x = position.x+parseInt(radius);
								spawnPosition.y = position.y+parseInt(radius);
								abstractPosition.x = depth-initialDepth;
								abstractPosition.y = depth-initialDepth;
								break outer;
							}
							break;
						}
					}
					
					
					// On vérifie que l'on possède bien les coordonnées de la zone de spawn
					if(spawnPosition==null) {
						return;
					}
					
					// On ne conserve que la map dont on a besoin
					var shortenedMap = new Array();
					var toGenerate = new Array();
					
					for(var i=0; i<initialDepth; i++) {
						shortenedMap[i] = new Array();
						for(var j=0; j<initialDepth; j++) {
							shortenedMap[i][j] = map[abstractPosition.x+i][abstractPosition.y+j];
							
							if(shortenedMap[i][j]==null) {
								toGenerate.push({x:i+spawnPosition.x, y:j+spawnPosition.y});
							}
						}
					}
					
					// Enfin génère éventuellement des cases non-existantes en précisant un callback pour terminer l'opération
					generateMap(spawnPosition.x, spawnPosition.y, shortenedMap, toGenerate, {'callback':allocateTerritoryFinalize, 'user_id':user_id, 'res':res, 'spawnPosition':spawnPosition, 'initialDepth':initialDepth});
				}
			});
		}
	});
}

function allocateTerritoryFinalize(data, map) {
	
	// On trouve une position de départ adéquate pour le joueur
	var spawnX = Math.floor(data.initialDepth/2);
	var spawnY = spawnX;
	var found = false;
	
	while(!found) {
		if(map[spawnX][spawnY].element.type=='ground') {
			found = true;
		}
		else {
			for(var i=0; i<map.length; i++) {
				for(var j=0; j<map.length; j++) {
					if(map[i][j].element.type=='ground') {
						found = true;
						spawnX = i;
						spawnY = j;
						break;
					}
				}
			}
		}
	}
	
	if(!found) {
		spawnX = -1;
		spawnY = -1;
	}
	
	
	// On place le joueur sur la map
	connection = db.getConnection();
	connection.query('INSERT INTO wof_user_position(id_user, map_x, map_y, user_x, user_y, angle) VALUES('+data.user_id+', '+(data.spawnPosition.x+parseInt(spawnX))+', '+(data.spawnPosition.y+parseInt(spawnY))+', '+(data.spawnPosition.x+parseInt(spawnX))+', '+(data.spawnPosition.y+parseInt(spawnY))+', 0)', function(error, rows, fields) {
		if(error) {
			console.log('Database error on initialize user '+data.user_id+' position');
		}
	});
	
	// On assigne le terrain à notre utilisateur en local
	for(i=data.spawnPosition.x; i<(data.spawnPosition.x+parseInt(data.initialDepth)); i++) {
		for(j=data.spawnPosition.y; j<(data.spawnPosition.y+parseInt(data.initialDepth)); j++) {
			setMapData(i, j, {owner:data.user_id});
		}
	}
	
	// Et enfin, on assigne le terrain à notre utilisateur
	for(i=data.spawnPosition.x; i<(data.spawnPosition.x+parseInt(data.initialDepth)); i++) {
		for(j=data.spawnPosition.y; j<(data.spawnPosition.y+parseInt(data.initialDepth)); j++) {
			setMapData(i, j, {owner:data.user_id});
		}
	}
	
	connection = db.getConnection();
	connection.query('UPDATE wof_tile SET owner='+data.user_id+' WHERE xpos>='+data.spawnPosition.x+' AND xpos<'+(data.spawnPosition.x+parseInt(data.initialDepth))+' AND ypos>='+data.spawnPosition.y+' AND ypos<'+(data.spawnPosition.y+parseInt(data.initialDepth)), function(error, rows, fields) {
		if(error) {
			console.log('Database error on allocating tiles for '+data.user_id);
			console.log(error);
		}
		
		// On redirige notre utilisateur vers la page de jeu
		data.res.writeHead(302, {'Location': '/play', 'Content-Type': 'text/html'});
		data.res.end('<a href="/play">Redirecting to the game...</a>');
	});
}

function getTilesData(socket, data, callback) {
	// On vérifie que l'on dispose des bonnes informations utilisateur
	data.user_id = socket.handshake.user_id;
	if(data.user_id==undefined || data.user_id==null || parseInt(data.user_id)!=data.user_id) {
		socket.emit('error', {invalidSession: true});
		return;
	}
	
	// On récupère l'angle de la map
	data.angle = infos.getMapAngle(data.user_id);
	data.condition = {};
	
	switch(data.angle) {
		case 0:
			data.condition.min_x = (data.x-(data.depth_x-1));
			data.condition.max_x = data.x+1;
			data.condition.min_y = (data.y-(data.depth_y-1));
			data.condition.max_y = data.y+1;
			break;
		case 1:
			data.condition.min_x = (data.x-(data.depth_x-1));
			data.condition.max_x = data.x+1;
			data.condition.min_y = data.y;
			data.condition.max_y = (data.y+(data.depth_y-1)+1);
			break;
		case 2:
			data.condition.min_x = data.x;
			data.condition.max_x = (data.x-(data.depth_x-1)+1);
			data.condition.min_y = data.y;
			data.condition.max_y = (data.y+(data.depth_y-1)+1);
			break;
		case 3:
			data.condition.min_x = data.x;
			data.condition.max_x = (data.x-(data.depth_x-1)+1);
			data.condition.min_y = (data.y-(data.depth_y-1));
			data.condition.max_y = data.y+1;
			break;
		default:
			data.condition.min_x = 0;
			data.condition.max_x = 0;
			data.condition.min_y = 0;
			data.condition.max_y = 0;
			return;
	}
	
	// Puis on récupère les propriété de ces cases
	data.map = new Array();
	
	for(i=data.condition.min_x; i<data.condition.max_x; i++) {
		for(j=data.condition.min_y; j<data.condition.max_y; j++) {
			data.map.push(getMapRawData(i, j));
		}
	}
	
	callback(socket, data);
}

function getTileInformations(socket, data) {
	// On vérifie que l'on dispose des bonnes informations utilisateur
	data.user_id = socket.handshake.user_id;
	if(data.user_id==undefined || data.user_id==null || parseInt(data.user_id)!=data.user_id) {
		socket.emit('error', {invalidSession: true});
		return;
	}
	
	// On vérifie que l'on a bien tranmis les coordonnées de la case
	if(data.x==undefined || data.y==undefined || parseInt(data.x)!=data.x || parseInt(data.y)!=data.y) {
		socket.emit('error', {error:'Server unable to find informations about this tile'});
		return;
	}
	
	var informations = getMapRawData(data.x, data.y);
	if(informations==null) {
		socket.emit('error', {error:'Server unable to find informations about this tile'});
	}
	else {
		socket.emit('getTileInformationsAnswer', informations);
	}
}


exports.init = init;
exports.getMap = getMap;
exports.refreshMap = refreshMap;
exports.getPosition = getPosition;
exports.updateMapPosition = updateMapPosition;
exports.allocateTerritory = allocateTerritory;
exports.getTilesData = getTilesData;
exports.setMapData = setMapData;
exports.getMapRawData = getMapRawData;
exports.getTileInformations = getTileInformations;