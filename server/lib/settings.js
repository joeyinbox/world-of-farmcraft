var db = require("./db");
var settings = {};
var tileType = new Array();
var building = new Array();
var weaponType = new Array();
var marketPrice = new Array();
var naturalEvent = new Array();

function init() {
	// On récupère les réglages
	connection = db.getConnection();
	connection.query('SELECT * FROM wof_settings WHERE id_settings=1', function(error, rows, fields) {
		if(error || rows.length==0) {
			console.log('Database error on retrieving settings');
		}
		else {
			settings = rows[0];
		}
	});
	
	// On récupère les types de cases disponibles
	connection = db.getConnection();
	connection.query('SELECT id_tile_type id, name, price FROM wof_tile_type', function(error, rows, fields) {
		if(error || rows.length==0) {
			console.log('Database error on retrieving tile types');
		}
		else {
			for(var i=0; i<rows.length; i++) {
				tileType[rows[i].name] = rows[i];
			}
		}
	});
	
	// On récupère les prix du marché concernant les plantes
	connection = db.getConnection();
	connection.query('SELECT type, price FROM wof_market', function(error, rows, fields) {
		if(error || rows.length==0) {
			console.log('Database error on retrieving market prices');
		}
		else {
			for(var i=0; i<rows.length; i++) {
				marketPrice[rows[i].type] = rows[i].price;
			}
		}
	});
	
	// On récupère les informations concernant les bâtiments
	connection = db.getConnection();
	connection.query('SELECT type, running_cost, capacity, width, height FROM wof_building_settings', function(error, rows, fields) {
		if(error || rows.length==0) {
			console.log('Database error on retrieving tile types');
		}
		else {
			for(var i=0; i<rows.length; i++) {
				building[rows[i].type] = rows[i];
			}
		}
	});
	
	// On récupère les types d'armes disponibles
	connection = db.getConnection();
	connection.query('SELECT id_weapon_type id, name, price FROM wof_weapon_type', function(error, rows, fields) {
		if(error || rows.length==0) {
			console.log('Database error on retrieving weapon types');
		}
		else {
			for(var i=0; i<rows.length; i++) {
				weaponType[rows[i].name] = rows[i];
			}
		}
	});
	
	// On récupère les probabilités des évènements naturels
	connection = db.getConnection();
	connection.query('SELECT name, probability FROM wof_natural_event', function(error, rows, fields) {
		if(error || rows.length==0) {
			console.log('Database error on retrieving natural event probabilities');
		}
		else {
			for(var i=0; i<rows.length; i++) {
				naturalEvent[rows[i].name] = rows[i].probability;
			}
		}
	});
}

function getData() {
	return settings;
}

function getDisplayData(socket) {
	var tmp = {tileWidth:settings.tileWidth, tileHeight:settings.tileHeight, mapSpeed:settings.mapSpeed, characterSpeed:settings.characterSpeed};
	
	if(socket==undefined) {
		return tmp;
	}
	socket.emit('getDisplaySettingsAnswer', tmp);
}

function getInitialOwnedTilesDepth() {
	return settings.initial_owned_tiles_depth;
}

function getInitialMoneyByDifficulty(difficulty) {
	if(difficulty=='easy') {
		return settings.initial_money;
	}
	else if(difficulty=='medium') {
		return Math.ceil(0.5*settings.initial_money);
	}
	else {
		return Math.ceil(0.1*settings.initial_money);
	}
}

function getTileTypeId(name) {
	return (tileType[name]!=undefined)?tileType[name].id:null;
}

function getSpawnRadius() {
	return (settings.spawn_radius!=undefined)?settings.spawn_radius:null;
}

function getTilePrice(name) {
	return (tileType[name]!=undefined)?tileType[name].price:null;
}

function getPrices(socket) {
	// On envoi les prix réguliers des items
	var data = {};
	data.silo = tileType['silo'].price;
	data.barn = tileType['barn'].price;
	data.coldStorage = tileType['coldStorage'].price;
	data.waterize = 10;
	data.fertilize = 20;
	data.corn = tileType['corn'].price;
	data.tomato = tileType['tomato'].price;
	data.wheat = tileType['wheat'].price;
	data.baseballBat = weaponType['baseballBat'].price;
	data.chainsaw = weaponType['chainsaw'].price;
	data.ak47 = weaponType['ak47'].price;
	
	socket.emit('getPricesAnswer', data);
}

function getMarketPricesData() {
	return marketPrice;
}

function refreshMarketPrices(socket) {
	var data = {};
	data.corn = marketPrice[tileType['corn'].id];
	data.tomato = marketPrice[tileType['tomato'].id];
	data.wheat = marketPrice[tileType['wheat'].id];
	
	socket.emit('refreshMarketPrices', data);
}

function setTileMarketPrice(type, price) {
	if(marketPrice[type]!=undefined) {
		marketPrice[type] = price;
	}
}

function getBuildingRunningCost(name) {
	return (tileType[name]!=undefined && building[tileType[name].id]!=undefined)?building[tileType[name].id].running_cost:null;
}

function getBuildingCapacity(name) {
	return (tileType[name]!=undefined && building[tileType[name].id]!=undefined)?building[tileType[name].id].capacity:null;
}

function getBuildingSize(name) {
	return (tileType[name]!=undefined && building[tileType[name].id]!=undefined)?{width:building[tileType[name].id].width, height:building[tileType[name].id].height}:null;
}

function getBuildingSizeSocket(socket) {
	var data = {};
	data.silo = {width:building[tileType['silo'].id].width, height:building[tileType['silo'].id].height};
	data.barn = {width:building[tileType['barn'].id].width, height:building[tileType['barn'].id].height};
	data.coldStorage = {width:building[tileType['coldStorage'].id].width, height:building[tileType['coldStorage'].id].height};
	
	socket.emit('getBuildingSizeAnswer', data);
}

function getWeaponPrice(name) {
	return (weaponType[name]!=undefined)?weaponType[name].price:null;
}

function getInitialLife() {
	return (settings.initial_life!=undefined)?settings.initial_life:100;
}

function isBuilding(name) {
	if(tileType[name]==undefined) {
		return false;
	}
	if(building[tileType[name].id]!=undefined) {
		return true;
	}
	return false;
}

function getNaturalEventProbabilities() {
	return naturalEvent;
}


exports.init = init;
exports.getData = getData;
exports.getDisplayData = getDisplayData;
exports.getInitialOwnedTilesDepth = getInitialOwnedTilesDepth;
exports.getInitialMoneyByDifficulty = getInitialMoneyByDifficulty;
exports.getTileTypeId = getTileTypeId;
exports.getSpawnRadius = getSpawnRadius;
exports.getTilePrice = getTilePrice;
exports.getPrices = getPrices;
exports.getMarketPricesData = getMarketPricesData;
exports.setTileMarketPrice = setTileMarketPrice;
exports.refreshMarketPrices = refreshMarketPrices;
exports.getBuildingRunningCost = getBuildingRunningCost;
exports.getBuildingCapacity = getBuildingCapacity;
exports.getBuildingSize = getBuildingSize;
exports.getBuildingSizeSocket = getBuildingSizeSocket;
exports.getWeaponPrice = getWeaponPrice;
exports.getInitialLife = getInitialLife;
exports.isBuilding = isBuilding;
exports.getNaturalEventProbabilities = getNaturalEventProbabilities;