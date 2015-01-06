var db = require("./db");
var globalSettings = require("./settings");

var data = new Array();


function initData(user_id, email) {
	data[user_id] = {};
	data[user_id].id = user_id;
	data[user_id].email = email;
	data[user_id].life = null;
	data[user_id].life_max = null;
	data[user_id].money = null;
	data[user_id].tiles_owned = null;
	data[user_id].level = null;
	data[user_id].alliance = null;
	
	data[user_id].map = {};
	data[user_id].map.min_x = null;
	data[user_id].map.min_y = null;
	data[user_id].map.max_x = null;
	data[user_id].map.max_y = null;
	data[user_id].map.angle = null;
	
	data[user_id].character = {};
	data[user_id].character.x = null;
	data[user_id].character.y = null;
	data[user_id].character.previous_x = null;
	data[user_id].character.previous_y = null;
	data[user_id].character.shift_x = 0;
	data[user_id].character.shift_y = 0;
	data[user_id].character.angle = 0;
	data[user_id].character.leg = 1;
	
	data[user_id].weapon = {};
	data[user_id].weapon.fork = false;
	data[user_id].weapon.baseballBat = false;
	data[user_id].weapon.chainsaw = false;
	data[user_id].weapon.ak47 = false;
}

function setMapData(user_id, mapData) {
	if(data[user_id]==undefined) {
		return;
	}
	
	data[user_id].map.min_x = mapData.min_x;
	data[user_id].map.min_y = mapData.min_y;
	data[user_id].map.max_x = mapData.max_x;
	data[user_id].map.max_y = mapData.max_y;
	data[user_id].map.angle = mapData.angle;
}

function updateMapPosition(user_id, mapData) {
	if(data[user_id]==undefined) {
		return;
	}
	
	data[user_id].map.max_x = mapData.x+(data[user_id].map.max_x-data[user_id].map.min_x);
	data[user_id].map.max_y = mapData.y+(data[user_id].map.max_y-data[user_id].map.min_y);
	data[user_id].map.min_x = mapData.x;
	data[user_id].map.min_y = mapData.y;
}

function setMapAngle(user_id, angle) {
	if(data[user_id]==undefined) {
		return;
	}
	
	data[user_id].map.angle = angle;
}

function setCharacterData(user_id, characterData) {
	if(data[user_id]==undefined) {
		return;
	}
	
	data[user_id].character.x = characterData.x;
	data[user_id].character.y = characterData.y;
	data[user_id].character.previous_x = characterData.previous_x;
	data[user_id].character.previous_y = characterData.previous_y;

	data[user_id].character.shift_x = (characterData.shift_x!=undefined)?characterData.shift_x:0;
	data[user_id].character.shift_y = (characterData.shift_y!=undefined)?characterData.shift_y:0;
	
	data[user_id].character.angle = (characterData.angle!=undefined)?characterData.angle:1;
	data[user_id].character.leg = (characterData.leg!=undefined)?characterData.leg:1;
}

function setCharacterPosition(user_id, x, y) {
	if(data[user_id]==undefined) {
		return;
	}
	
	data[user_id].character.x = x;
	data[user_id].character.y = y;
	
	this.resetCharacterShift(user_id);
}

function resetCharacterShift(user_id) {
	if(data[user_id]==undefined) {
		return;
	}
	
	data[user_id].character.shift_x = 0;
	data[user_id].character.shift_y = 0;
}

function updateCharacterShift(user_id, x, y) {
	if(data[user_id]==undefined) {
		return;
	}
	
	data[user_id].character.shift_x += x;
	data[user_id].character.shift_y += y;
}

function setCharacterLeg(user_id, leg) {
	if(data[user_id]==undefined) {
		return;
	}
	
	data[user_id].character.leg = leg;
}

function updateCharacterLeg(user_id) {
	if(data[user_id]==undefined) {
		return;
	}
	
	data[user_id].character.leg = (data[user_id].character.leg+1)%4;
}

function setCharacterAngle(user_id, angle) {
	if(data[user_id]==undefined) {
		return;
	}
	
	data[user_id].character.angle = angle;
}

function getData(user_id) {
	return (data[user_id]!=undefined)?data[user_id]:null;
}

function getMapData(user_id) {
	if(data[user_id]==undefined) {
		return null;
	}
	
	return data[user_id].map;
}

function getMapAngle(user_id) {
	if(data[user_id]==undefined) {
		return null;
	}
	
	return data[user_id].map.angle;
}

function getCharacterData(user_id) {
	if(data[user_id]==undefined) {
		return null;
	}
	
	return data[user_id].character;
}

function getEmail(user_id) {
	if(data[user_id]==undefined) {
		return null;
	}
	
	return data[user_id].email;
}

function getInformations(socket) {
	// On vérifie que l'on dispose des bonnes informations utilisateur
	var user_id = socket.handshake.user_id;
	if(user_id==undefined || user_id==null || parseInt(user_id)!=user_id) {
		socket.emit('error', {invalidSession: true});
		return;
	}
	
	// On essaye de récupérer sa position
	connection = db.getConnection();
	connection.query('SELECT * FROM wof_user_informations WHERE id_user='+user_id, function(error, rows, fields) {
		if(error) {
			console.log('Database error on retrieving informations');
			console.log(error);

			// On envoi l'erreur
			socket.emit('getInformationsAnswer', {error:'Database error on retrieving informations'});
			return;
		}
		else if(rows.length==0) {
			console.log('No informations available..');
			socket.emit('getInformationsAnswer', {error:'No informations available..'});
			return;
		}
		else if(data[user_id]!=undefined) {
			data[user_id].life = rows[0].life;
			data[user_id].money = rows[0].money;
			data[user_id].tiles_owned = rows[0].tiles_owned;
			determineLevel(user_id, rows[0].tiles_owned);
			data[user_id].alliance = rows[0].id_alliance;
			
			socket.emit('getInformationsAnswer', {'life_max':data[user_id].life_max, 'life':rows[0].life, 'money':rows[0].money, 'level':data[user_id].level});
			return;
		}
	});
}

function getOwnedWeapon(socket) {
	// On vérifie que l'on dispose des bonnes informations utilisateur
	var user_id = socket.handshake.user_id;
	if(user_id==undefined || user_id==null || parseInt(user_id)!=user_id) {
		socket.emit('error', {invalidSession: true});
		return;
	}
	
	// On essaye de récupérer ses possessions d'arme
	connection = db.getConnection();
	connection.query('SELECT w.name FROM wof_user_weapon uw LEFT JOIN wof_weapon_type w ON(uw.id_weapon_type=w.id_weapon_type) WHERE uw.id_user='+user_id, function(error, rows, fields) {
		if(error) {
			console.log('Database error on retrieving owned weapons');
			console.log(error);

			// On envoi l'erreur
			socket.emit('getOwnedWeaponAnswer', {error:'Database error on retrieving owned weapons'});
			return;
		}
		else if(data[user_id]!=undefined) {
			for(i in rows) {
				data[user_id].weapon[rows[i].name] = true;
			}
			
			socket.emit('getOwnedWeaponAnswer', data[user_id].weapon);
			return;
		}
	});
}

function determineLevel(user_id, total) {
	// On va répartir les niveaux par tranches de 20 cases possédées
	var initialOwnedTilesDepth = globalSettings.getInitialOwnedTilesDepth();
	var tmp = Math.ceil((total-(initialOwnedTilesDepth*initialOwnedTilesDepth))/20)+1;
	
	if(tmp<1) {
		data[user_id].level = 1;
	}
	else {
		data[user_id].level = tmp;
	}
	
	// On en profite pour re-calculer le nombre de points de vie maximum
	data[user_id].life_max = data[user_id].level*globalSettings.getInitialLife();
}

function getAlliance(user_id) {
	if(data[user_id]==undefined) {
		return null;
	}
	
	return data[user_id].alliance;
}

function getMoney(user_id) {
	if(data[user_id]==undefined) {
		return 0;
	}
	
	return data[user_id].money;
}

function decreaseMoney(socket, user_id, amount) {
	if(data[user_id]==undefined) {
		return;
	}
	
	data[user_id].money -= amount;
	
	// On envoi l'information uniquement si le joueur est connecté
	if(socket!=null) {
		socket.emit('getInformationsAnswer', {'life_max':data[user_id].life_max, 'life':data[user_id].life, 'money':data[user_id].money, 'level':data[user_id].level});
	}
}

function increaseMoney(socket, user_id, amount) {
	if(data[user_id]==undefined) {
		return;
	}
	
	data[user_id].money += amount;
	
	// On envoi l'information uniquement si le joueur est connecté
	if(socket!=null) {
		socket.emit('getInformationsAnswer', {'life_max':data[user_id].life_max, 'life':data[user_id].life, 'money':data[user_id].money, 'level':data[user_id].level});
	}
}


exports.initData = initData;
exports.setMapData = setMapData;
exports.setMapAngle = setMapAngle;
exports.setCharacterData = setCharacterData;
exports.setCharacterPosition = setCharacterPosition;
exports.resetCharacterShift = resetCharacterShift;
exports.updateCharacterShift = updateCharacterShift;
exports.setCharacterLeg = setCharacterLeg;
exports.updateCharacterLeg = updateCharacterLeg;
exports.setCharacterAngle = setCharacterAngle;
exports.getData = getData;
exports.getMapData = getMapData;
exports.getMapAngle = getMapAngle;
exports.getCharacterData = getCharacterData;
exports.getEmail = getEmail;
exports.getInformations = getInformations;
exports.getAlliance = getAlliance;
exports.getMoney = getMoney;
exports.decreaseMoney = decreaseMoney;
exports.increaseMoney = increaseMoney;
exports.getOwnedWeapon = getOwnedWeapon;
exports.updateMapPosition = updateMapPosition;