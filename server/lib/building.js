var db = require("./db");
var map = require('./map');
var infos = require('./infos');
var market = require('./market');
var globalSettings = require("./settings");
var broadcast = require('./broadcast');

var buildingData = new Array();

function init() {
	connection = db.getConnection();
	connection.query('SELECT * FROM wof_building_informations ORDER BY id_building ASC', function(error, rows, fields) {
		if(error) {
			console.log('Database error on retrieving building informations while initializing it');
			console.log(error);
			return;
		}
		else {
			for(i in rows) {
				buildingData[rows[i].id_building] = {};
				buildingData[rows[i].id_building].type = rows[i].type;
				buildingData[rows[i].id_building].x = rows[i].x;
				buildingData[rows[i].id_building].y = rows[i].y;
				buildingData[rows[i].id_building].crop_stored = rows[i].crop_stored;
				buildingData[rows[i].id_building].capacity = rows[i].capacity;
				buildingData[rows[i].id_building].owner = rows[i].owner;
				buildingData[rows[i].id_building].crop = new Array();
				
				// Les cold storage coutent de l'argent toutes les 10min lorsqu'ils ne sont pas vide
				if(rows[i].type=='coldStorage' && rows[i].crop_stored>0) {
					buildingData[rows[i].id_building].timer = doColdStorageTimer(rows[i].owner);
				}
				else {
					buildingData[rows[i].id_building].timer = null;
				}
			}
			
			connection = db.getConnection();
			connection.query('SELECT * FROM wof_building_crop ORDER BY id_building ASC, stored ASC', function(error, rows, fields) {
				if(error) {
					console.log('Database error on retrieving building crop informations while initializing it');
					console.log(error);
					return;
				}
				else {
					for(i in rows) {
						// On vérifie le type du bâtiment
						if(buildingData[rows[i].id_building].type=='coldStorage') {
							continue;
						}
						
						doCropTimer(rows[i].id_building_crop, rows[i].id_building, rows[i].stored);
					}
				}
			});
		}
	});
}

function doColdStorageTimer(user_id) {
	return setInterval(function(){ market.buy(broadcast.getSocketByUserId(user_id), user_id, 2); }, 300000);
}

function doCropTimer(id_crop, id_building, stored) {
	var delayBeforeWithering = 259200000; // 3 jours IRL
	
	// On calcul le délai à la suite duquel la plante va mourir
	if(stored==undefined) {
		stored = new Date();
	}
	
	var now = (new Date()).getTime();
	var delay = stored.getTime()+delayBeforeWithering-now;
	
	if(delay<=0) {
		removeCrop(id_crop, id_building);
		return;
	}
	
	buildingData[id_building].crop.push(setTimeout(function(){removeCrop(id_crop, id_building);}, delay));
}

function buildingAdd(socket, data) {
	// On vérifie que l'on a bien reçu les données concernant le bâtiment
	if(data.x==undefined || data.y==undefined || data.type==undefined) {
		socket.emit('error', {error:'Server unable to construct this building'});
		return;
	}
	
	// On récupère maintenant les dimensions de ce bâtiment
	var size = globalSettings.getBuildingSize(data.type);
	
	// Puis on récupère les données de l'emplacement
	if(size!=null) {
		map.getTilesData(socket, {x:data.x, y:data.y, depth_x:size.width, depth_y:size.height, type:data.type}, buildingAddFinalize);
	}
	else {
		socket.emit('error', {error:'Server unable to construct this building'});
		return;
	}
}

function buildingAddFinalize(socket, data) {
	// On vérifie si le terrain appartient au joueur
	if(data.map.length<data.depth_x*data.depth_y) {
		socket.emit('error', {type:'building', error:"You can't build this building here"});
		return;
	}
	
	// On vérifie si le joueur ne se trouve pas sur le lieu de construction
	var position = infos.getCharacterData(data.user_id);
	
	if((data.angle==0 && position.x>=data.x-(data.depth_x-1) && position.x<=data.x && position.y>=data.y-(data.depth_y-1) && position.y<=data.y)
	|| (data.angle==1 && position.x>=data.x-(data.depth_x-1) && position.x<=data.x && position.y>=data.y && position.y<=data.y+(data.depth_y-1))
	|| (data.angle==2 && position.x>=data.x && position.x<=data.x+(data.depth_x-1) && position.y>=data.y && position.y<=data.y+(data.depth_y-1))
	|| (data.angle==3 && position.x>=data.x && position.x<=data.x+(data.depth_x-1) && position.y>=data.y-(data.depth_y-1) && position.y<=data.y)) {
		socket.emit('error', {type:'building', error:"You should move your character.<br /> You might get injured during the construction"});
		return;
	}
	
	for(i in data.map) {
		if(data.map[i]==null || data.map[i].type!='ground') {
			socket.emit('error', {type:'building', error:"The building won't fit here"});
			return;
		}
		else if(data.map[i].owner!=data.user_id) {
			socket.emit('error', {type:'building', error:"This field doesn't belong to you"});
			return;
		}
	}
	
	// On vérifie maintenant si l'utilisateur a suffisemment d'argent
	var buildingCost = globalSettings.getTilePrice(data.type);
	
	if(infos.getMoney(data.user_id)<buildingCost) {
		socket.emit('error', {type:'money', error:"You don't have enough money to build it"});
		return;
	}
	
	// On procède à la construction du bâtiment
	connection = db.getConnection();
	connection.query('INSERT INTO wof_building (id_building, x, y, type, owner) VALUES (NULL, '+data.x+', '+data.y+', '+globalSettings.getTileTypeId(data.type)+', '+data.user_id+')', function(error, rows, fields) {
		if(error) {
			console.log('Database error on creating a building');
			console.log(error);

			// On envoi l'erreur
			socket.emit('error', {type:'building', error:"An error occured while building it up"});
			return;
		}
		else {
			var id_building = rows.insertId;
			
			// On ajoute ce bâtiment sur la map
			for(i=data.condition.min_x; i<data.condition.max_x; i++) {
				for(j=data.condition.min_y; j<data.condition.max_y; j++) {
					map.setMapData(i, j, {type:data.type, id_building:id_building});
				}
			}
			
			connection = db.getConnection();
			connection.query('UPDATE wof_tile SET type='+globalSettings.getTileTypeId(data.type)+', building='+id_building+' WHERE xpos>='+data.condition.min_x+' AND xpos<'+data.condition.max_x+' AND ypos>='+data.condition.min_y+' AND ypos<'+data.condition.max_y, function(error, rows, fields) {
				if(error) {
					console.log('Database error on placing building '+id_building+' on the map');
					console.log(error);

					// On envoi l'erreur
					socket.emit('error', {type:'building', error:"An error occured while building it up"});
				}
			});
			
			// On débite le joueur et on rafraichit sa map
			market.buy(socket, data.user_id, buildingCost);
			map.refreshMap(socket);
			
			buildingData[id_building] = {};
			buildingData[id_building].x = data.x;
			buildingData[id_building].y = data.y;
			buildingData[id_building].type = data.type;
			buildingData[id_building].crop_stored = 0;
			buildingData[id_building].capacity = globalSettings.getBuildingCapacity(data.type);
			buildingData[id_building].owner = data.user_id;
			buildingData[id_building].crop = new Array();

			// Puis on envoi l'information aux autres joueurs concernés
			broadcast.refreshViewerMap(data.x, data.y, data.user_id);
		}
	});
}

function buildingRemove(socket, data) {
	// On vérifie que l'on a bien reçu les données concernant le bâtiment
	if(data.x==undefined || data.y==undefined) {
		socket.emit('error', {error:'Server unable to destruct this building'});
		return;
	}
	
	// Puis on récupère les données de l'emplacement
	map.getTilesData(socket, {x:data.x, y:data.y, depth_x:1, depth_y:1}, buildingRemoveFinalize);
}

function buildingRemoveFinalize(socket, data) {
	// On vérifie si le terrain appartient bien au joueur
	if(data.map[0].owner!=data.user_id) {
		socket.emit('error', {type:'building', error:"This field doesn't belong to you"});
		return;
	}
	
	// Puis on vérifie si un bâtiment se trouve bien à cet endroit
	if(data.map[0].id_building==null || !globalSettings.isBuilding(data.map[0].type)) {
		socket.emit('error', {error:"It looks like there's no building here"});
		return;
	}
	
	// On peux maintenant détruire le bâtiment en laissant les triggers supprimer son contenu
	connection = db.getConnection();
	connection.query('DELETE FROM wof_building WHERE id_building='+data.map[0].id_building, function(error, rows, fields) {
		if(error) {
			console.log('Database error on destructing a building');
			console.log(error);

			// On envoi l'erreur
			socket.emit('error', {type:'building', error:"An error occured while destructing it"});
			return;
		}
		else {
			// On supprime les données locales
			if(buildingData[data.map[0].id_building]!=undefined) {
				var x = buildingData[data.map[0].id_building].x;
				var y = buildingData[data.map[0].id_building].y;
				
				if(data.map[0].type=='silo') {
					map.setMapData(x, y, {type:'ground', id_building:null});
				}
				else if(data.map[0].type=='barn') {
					map.setMapData(x, y, {type:'ground', id_building:null});
					map.setMapData(x-1, y, {type:'ground', id_building:null});
					map.setMapData(x, y-1, {type:'ground', id_building:null});
					map.setMapData(x-1, y-1, {type:'ground', id_building:null});
					map.setMapData(x, y-2, {type:'ground', id_building:null});
					map.setMapData(x-1, y-2, {type:'ground', id_building:null});
				}
				else if(data.map[0].type=='coldStorage') {
					map.setMapData(x, y, {type:'ground', id_building:null});
					map.setMapData(x-1, y, {type:'ground', id_building:null});
					map.setMapData(x, y-1, {type:'ground', id_building:null});
					map.setMapData(x-1, y-1, {type:'ground', id_building:null});
					
					// On en profite également pour arrêter le timer de coûts de fonctionnement
					clearInterval(buildingData[data.map[0].id_building].timer);
				}
				
				buildingData[data.map[0].id_building] = null;
			}
			
			// On rafraichit la map du joueur
			map.refreshMap(socket);

			// Puis on envoi l'information aux autres joueurs concernés
			broadcast.refreshViewerMap(data.x, data.y, data.user_id);
		}
	});
	
}

function destruct(buildingId) {
	if(buildingData[buildingId]!=undefined) {
		clearTimeout(buildingData[buildingId].timer);
		buildingData[buildingId] = null;
	}
}

function removeCrop(cropId, buildingId) {
	connection = db.getConnection();
	connection.query('DELETE FROM wof_building_crop WHERE id_building_crop='+cropId, function(error, rows, fields) {
		if(error) {
			console.log('Database error on removing crops '+cropId+' from building '+buildingId);
			console.log(error);
			return;
		}
		else {
			if(buildingData[buildingId]!=undefined && buildingData[buildingId].crop[cropId]!=undefined) {
				clearTimeout(buildingData[buildingId].crop[cropId].timer);
				buildingData[buildingId].crop[cropId] = null;
			}
		}
	});
}

function getAvailableOwnedBuilding(socket, data, callback) {
	// On vérifie que l'on dispose des bonnes informations utilisateur
	var user_id = socket.handshake.user_id;
	if(user_id==undefined || user_id==null || parseInt(user_id)!=user_id) {
		socket.emit('error', {invalidSession: true});
		return;
	}
	
	// On récupère les bâtiments disponibles de cet utilisateur
	connection = db.getConnection();
	connection.query('SELECT type, SUM(capacity-crop_stored) space_left FROM wof_building_informations WHERE capacity-crop_stored>0 AND owner='+user_id+' GROUP BY type ASC', function(error, rows, fields) {
		if(error) {
			console.log('Database error on retrieving building informations while finding available space');
			console.log(error);
			return;
		}
		else {
			data.user_id = user_id;
			
			data.building = {};
			data.building.silo = null;
			data.building.barn = null;
			data.building.coldStorage = null;
			
			for(i in rows) {
				data.building[rows[i].type] = rows[i].space_left;
			}
			callback(socket, data);
		}
	});
}

function store(socket, data) {
	// On va récupérer l'ensemble des buildings de ce type appartenant à cet utilisateur afin de répartir les crops à entreposer
	connection = db.getConnection();
	connection.query('SELECT id_building, SUM(capacity-crop_stored) space_left FROM wof_building_informations WHERE capacity-crop_stored>0 AND owner='+data.user_id+' AND type="'+data.buildingType+'"', function(error, rows, fields) {
		if(error) {
			console.log('Database error on retrieving building informations while finding available space in a '+data.buildingType);
			console.log(error);
			return;
		}
		else {
			for(i in rows) {
				// On entreprose autant de crops que possible dans ce bâtiment
				if(rows[i].space_left==0 || rows[i].space_left==null) {
					continue;
				}
				
				var buildingId = rows[i].id_building;
				
				if(rows[i].space_left>=data.amount) {
					connection = db.getConnection();
					connection.query('INSERT INTO wof_building_crop (id_building, type, amount) VALUES ('+buildingId+', '+data.cropType+', '+data.amount+')', function(error, rows, fields) {
						if(error) {
							console.log('Database error on storing crops into building '+buildingId);
							console.log(error);
						}
						else {
							buildingData[buildingId].crop_stored += data.amount;
							
							if(data.buildingType=='coldStorage' && buildingData[buildingId].timer==null) {
								buildingData[buildingId].timer = doColdStorageTimer(data.user_id);
							}
							else {
								doCropTimer(rows.insertId, buildingId);
							}
						}
					});
					return;
				}
				else {
					data.amount -= rows[i].space_left;
					var number = rows[i].space_left;
					
					connection = db.getConnection();
					connection.query('INSERT INTO wof_building_crop (id_building, type, amount) VALUES ('+buildingId+', '+data.cropType+', '+number+')', function(error, rows, fields) {
						if(error) {
							console.log('Database error on storing crops into building '+buildingId);
							console.log(error);
							return;
						}
						else {
							buildingData[buildingId].crop_stored += number;
							
							if(data.buildingType=='coldStorage' && buildingData[buildingId].timer==null) {
								buildingData[buildingId].timer = doColdStorageTimer(data.user_id);
							}
							else {
								doCropTimer(rows.insertId, buildingId);
							}
						}
					});
				}
			}
		}
	});
}


exports.init = init;
exports.buildingAdd = buildingAdd;
exports.buildingAddFinalize = buildingAddFinalize;
exports.buildingRemove = buildingRemove;
exports.buildingRemoveFinalize = buildingRemoveFinalize;
exports.destruct = destruct;
exports.getAvailableOwnedBuilding = getAvailableOwnedBuilding;
exports.store = store;