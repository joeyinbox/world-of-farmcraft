var db = require("./db");
var map = require('./map');
var infos = require('./infos');
var market = require('./market');
var building = require('./building');
var globalSettings = require("./settings");
var broadcast = require('./broadcast');

var plantData = new Array();

function init() {
	connection = db.getConnection();
	connection.query('SELECT c.id_crop, c.maturity, c.health, c.maturated, t.xpos, t.ypos, t.fertility, t.humidity FROM wof_crop c LEFT JOIN wof_tile t ON(c.id_crop=t.crop)', function(error, rows, fields) {
		if(error) {
			console.log('Database error on retrieving id_crop');
			console.log(error);
			return;
		}
		else {
			for(i in rows) {
				plantData[rows[i].id_crop] = {};
				plantData[rows[i].id_crop].fertility = rows[i].fertility;
				plantData[rows[i].id_crop].humidity = rows[i].humidity;
				plantData[rows[i].id_crop].maturity = rows[i].maturity;
				plantData[rows[i].id_crop].health = rows[i].health;
				plantData[rows[i].id_crop].maturated = rows[i].maturated;
				plantData[rows[i].id_crop].x = rows[i].xpos;
				plantData[rows[i].id_crop].y = rows[i].ypos;
				if(rows[i].health>0) {
					plantData[rows[i].id_crop].timer = doTimer(rows[i].id_crop, calculMaturation(rows[i].humidity, rows[i].fertility));
				}
				else {
					plantData[rows[i].id_crop].timer = null;
				}
			}
		}
	});
}

function doTimer(id, delay){
	return setTimeout(function(){updatePlant(id);}, delay);
}

function plantAdd(socket, data) {
	// On vérifie que l'on a bien reçu les données concernant la plante
	if(data.x==undefined || data.y==undefined || data.type==undefined) {
		socket.emit('error', {error:'Server unable to plant this plant'});
		return;
	}
	
	// Puis on récupère les données de l'emplacement
	map.getTilesData(socket, {x:data.x, y:data.y, depth_x:1, depth_y:1, type:data.type}, plantAddFinalize);
}

function plantAddFinalize(socket, data) {
	// On vérifie si le terrain appartient au joueur
	if(data.map.length==0) {
		socket.emit('error', {type:'plant', error:"You can't plant here"});
		return;
	}
	
	if(data.map[0].owner!=data.user_id) {
		socket.emit('error', {type:'plant', error:"This field doesn't belong to you"});
		return;
	}
	else if(data.map[0].type!='ground') {
		socket.emit('error', {type:'plant', error:"You can't plant here"});
		return;
	}
	
	// On vérifie maintenant si l'utilisateur a suffisemment d'argent
	var plantCost = globalSettings.getTilePrice(data.type);
	
	if(infos.getMoney(data.user_id)<plantCost) {
		socket.emit('error', {type:'money', error:"You don't have enough money to plant it"});
		return;
	}
	
	// On calcul la productivité de cette plante
	var productivity = ((Math.floor(Math.random()*1000)%30)+1);
	
	// On procède à la plantation
	connection = db.getConnection();
	connection.query('INSERT INTO wof_crop (type, productivity) VALUES ('+globalSettings.getTileTypeId(data.type)+', '+productivity+')', function(error, rows, fields) {
		if(error) {
			console.log('Database error on creating a crop');
			console.log(error);

			// On envoi l'erreur
			socket.emit('error', {type:'plant', error:"An error occured while planting it"});
			return;
		}
		else {
			var plantID = rows.insertId;
			
			// On ajoute cette plante sur la map
			map.setMapData(data.x, data.y, {type:data.type, id_crop:plantID, productivity:productivity});

			connection = db.getConnection();
			connection.query('UPDATE wof_tile SET type='+globalSettings.getTileTypeId(data.type)+', crop='+plantID+' WHERE xpos='+data.condition.min_x+' AND ypos='+data.condition.min_y, function(error, rows, fields) {
				if(error) {
					console.log('Database error on placing plant '+rows.insertId+' on the map');
					console.log(error);

					// On envoi l'erreur
					socket.emit('error', {type:'plant', error:"An error occured while planting it"});
				}
			});
			
			// On débite le joueur et on rafraichit sa map
			market.buy(socket, data.user_id, plantCost);
			map.refreshMap(socket);

			plantData[plantID] = {timer:setTimeout(function(){updatePlant(plantID);}, calculMaturation(data.map[0].humidity, data.map[0].fertility)),
			 							maturity:0, 
			 							fertility:data.map[0].fertility, 
			 							humidity:data.map[0].humidity, 
			 							health:100,
										maturated:null,
			 							x:data.map[0].xpos, 
			 							y:data.map[0].ypos};	

			// Puis on envoi l'information aux autres joueurs concernés
			broadcast.refreshViewerMap(data.x, data.y, data.user_id);
		}
	});
}

function calculMaturation(humidity,fertility) {
	var defaultTime = 10000;
	var average = Math.floor(((humidity+fertility)/2)*100);

	if(average>=80){
		return defaultTime;
	}
	else if(average>=60){
		return defaultTime+(defaultTime*0.2);
	}
	else if(average>=40){
		return defaultTime+(defaultTime*0.4);
	}
	else if(average>=20){
		return defaultTime+(defaultTime*0.6);
	}
	else{
		return defaultTime+(defaultTime*0.8);
	}
}

function updatePlant(plantID) {

	//On incrémente la maturité de la plante
	if(plantData[plantID].maturity<100){
		plantData[plantID].maturity++;
	}
	
	//On décrémente l'humidité
	if(plantData[plantID].humidity>0){
		plantData[plantID].humidity=((Math.round(plantData[plantID].humidity*100))-1)/100;
	}

	//On décrémente la fertilité
	if(plantData[plantID].fertility>0){
		plantData[plantID].fertility=((Math.round(plantData[plantID].fertility*100))-1)/100;
	}

	//Si la plante est sans eau et sans fertilité, elle pourrit
	if(plantData[plantID].humidity==0 && plantData[plantID].fertility==0 && plantData[plantID].health>0){
		plantData[plantID].health--;
	}
	
	// Si la plante n'a plus de vie ou qu'elle a attendu trop longtemps, elle meurt..
	if(plantData[plantID].maturity==100) {
		if(plantData[plantID].maturated==null) {
			plantData[plantID].maturated = new Date();
		}
		else {
			var delayBeforeWithering = 86400000; // 1 jour IRL
			var now = (new Date()).getTime();
			var delay = plantData[plantID].maturated.getTime()+delayBeforeWithering-now;

			if(delay<=0) {
				plantData[plantID].health = 0;
			}
		}
	}
	
	map.setMapData(plantData[plantID].x, plantData[plantID].y, {humidity:plantData[plantID].humidity, 
																fertility:plantData[plantID].fertility,
																maturity:plantData[plantID].maturity,
																health:plantData[plantID].health,
																maturated:plantData[plantID].maturated});
	
	
	// On formate si besoin est la date pour la base de donnée
	if(plantData[plantID].maturated!=null) {
		var db_maturated = '"'+plantData[plantID].maturated.getFullYear()+'-';
		db_maturated += (plantData[plantID].maturated.getMonth()<9?'0':'')+(plantData[plantID].maturated.getMonth()+1)+'-';
		db_maturated += (plantData[plantID].maturated.getDate()<10?'0':'')+plantData[plantID].maturated.getDate()+' ';
		db_maturated += (plantData[plantID].maturated.getHours()<10?'0':'')+plantData[plantID].maturated.getHours()+':';
		db_maturated += (plantData[plantID].maturated.getMinutes()<10?'0':'')+plantData[plantID].maturated.getMinutes()+':';
		db_maturated += (plantData[plantID].maturated.getSeconds()<10?'0':'')+plantData[plantID].maturated.getSeconds()+'"';
	}
	else {
		var db_maturated = null;
	}
	
	if(plantData[plantID].maturity==10 || plantData[plantID].maturity==30 || plantData[plantID].maturity==60 || plantData[plantID].maturity==80 || plantData[plantID].health==0) {
		// On envoie l'information aux joueurs concernés
		broadcast.refreshViewerMap(plantData[plantID].x, plantData[plantID].y);
	}
	
	if(plantData[plantID].health!=0) {
		plantData[plantID].timer = setTimeout(function(){updatePlant(plantID);}, calculMaturation(plantData[plantID].humidity, plantData[plantID].fertility));
	}

	connection = db.getConnection();
	connection.query('UPDATE wof_crop SET maturity='+plantData[plantID].maturity+', health='+plantData[plantID].health+', maturated='+db_maturated+' WHERE id_crop='+plantID, function(error, rows, fields) {
		if(error) {
			console.log('Database error on updating maturity and health for '+plantID);
			console.log(error);

			return;
		}
	});
	
	connection = db.getConnection();
	connection.query('UPDATE wof_tile SET humidity='+plantData[plantID].humidity+', fertility='+plantData[plantID].fertility+' WHERE xpos='+plantData[plantID].x+' AND ypos='+plantData[plantID].y, function(error, rows, fields) {
		if(error) {
			console.log('Database error on updating humidity and fertility for '+plantID);
			console.log(error);

			return;
		}
	});
}

function harvest(socket, data) {
	// On vérifie que l'on a bien reçu les données concernant la plante
	if(data.x==undefined || data.y==undefined) {
		socket.emit('error', {error:'Server unable to harvest this plant'});
		return;
	}

	map.getTilesData(socket, {x:data.x, y:data.y, depth_x:1, depth_y:1, type:data.type}, harvestAuthorization);
}

function harvestAuthorization(socket, data) {
	if(data.map[0].type!='tomato' && data.map[0].type!='corn' && data.map[0].type!='wheat') {
		socket.emit('error', {type:'plant', error:"You can't harvest this !"});
		return;
	}
	else if(data.map[0].owner!=data.user_id) {
		socket.emit('error', {type:'plant', error:"You don't have the right to harvest this plant"});
		return;
	}
	else if(data.map[0].maturity<=80) {
		socket.emit('error', {type:'plant', error:"This plant is not enough mature to be harvested"});
		return;
	}
	else if(data.map[0].health==0) {
		socket.emit('error', {type:'plant', error:"This plant is withered.. You should destruct it"});
		return;
	}
	
	building.getAvailableOwnedBuilding(socket, data, harvestFinalize);
}

function harvestFinalize(socket, data) {
	// On peut à présent envoyer la question à l'utilisateur pour savoir ce qu'il souhaite faire de ces récoltes
	globalSettings.refreshMarketPrices(socket);
	socket.emit('harvestQuestion', {building:data.building, amount:data.map[0].productivity, type:data.map[0].type, x:data.map[0].xpos, y:data.map[0].ypos});
}

function harvestDistribution(socket, data) {
	// On vérifie que l'on a bien reçu les données concernant la plante
	if(data.x==undefined || data.y==undefined) {
		socket.emit('error', {error:'Server unable to harvest this plant'});
		return;
	}
	else if(data.distribution==undefined || data.distribution.market==undefined || data.distribution.silo==undefined || data.distribution.barn==undefined || data.distribution.coldStorage==undefined) {
		socket.emit('error', {error:'Please choose correctly what to do with these crops'});
		return;
	}

	map.getTilesData(socket, {x:data.x, y:data.y, depth_x:1, depth_y:1, type:data.type, distribution:data.distribution}, harvestDistributionAuthorization);
}

function harvestDistributionAuthorization(socket, data) {
	if(data.map[0].type!='tomato' && data.map[0].type!='corn' && data.map[0].type!='wheat') {
		socket.emit('error', {type:'plant', error:"You can't harvest this !"});
		return;
	}
	else if(data.map[0].owner!=data.user_id) {
		socket.emit('error', {type:'plant', error:"You don't have the right to harvest this plant"});
		return;
	}
	else if(data.map[0].maturity<=80) {
		socket.emit('error', {type:'plant', error:"This plant is not enough mature to be harvested"});
		return;
	}
	else if(data.map[0].health==0) {
		socket.emit('error', {type:'plant', error:"This plant is withered.. You should destruct it"});
		return;
	}
	
	// On vérifie à présent la distribution souhaitée
	var total = 0;
	for(i in data.distribution) {
		total += data.distribution[i];
	}
	
	if(data.map[0].productivity!=total) {
		socket.emit('error', {error:'Please choose correctly what to do with these crops'});
		return;
	}
	
	building.getAvailableOwnedBuilding(socket, data, harvestDistributionFinalize);
}

function harvestDistributionFinalize(socket, data) {
	// On vérifie si les informations fournies par le joueur correspondent à ce qu'il possède
	for(i in data.building) {
		if(parseInt(data.distribution[i])>0 && (data.building[i]==null || data.building[i]<parseInt(data.distribution[i]))) {
			socket.emit('error', {error:'Please choose correctly what to do with these crops'});
			return;
		}
	}
	
	// Tout est bon, on applique donc le choix du joueur
	if(parseInt(data.distribution.market)>0) {
		// On appliquera les prix du marché
		var marketPrice = globalSettings.getMarketPricesData();
		market.sell(socket, data.user_id, data.distribution.market*marketPrice[globalSettings.getTileTypeId(data.map[0].type)]);
	}
	
	for(i in data.building) {
		if(parseInt(data.distribution[i])>0) {
			building.store(socket, {user_id:data.user_id, buildingType:i, cropType:globalSettings.getTileTypeId(data.map[0].type), amount:data.distribution[i]});
		}
	}
	
	// Puis on supprime cette plante
	connection = db.getConnection();
	connection.query('DELETE FROM wof_crop WHERE id_crop='+data.map[0].id_crop, function(error, rows, fields) {
		if(error) {
			console.log('Database error on deleting for '+data.map[0].id_crop);
			console.log(error);

			return;
		}
		else {
			destruct(data.map[0].id_crop);
			socket.emit('cropDistributed');
			map.refreshMap(socket);
			
			// Et enfin, on envoi l'information aux joueurs concernés
			broadcast.refreshViewerMap(data.x, data.y, data.user_id);
		}
	});
}

function deleteCrop(socket, data) {
	if(data.x==undefined || data.y==undefined) {
		socket.emit('error', {error:'Server unable to remove this plant'});
		return;
	}

	map.getTilesData(socket, {x:data.x, y:data.y, depth_x:1, depth_y:1}, deleteCropFinalize);
}

function deleteCropFinalize(socket, data) {
	if(data.map[0].type!='tomato' && data.map[0].type!='corn' && data.map[0].type!='wheat') {
		socket.emit('error', {type:'plant', error:"You can't remove this !"});
		return;
	}
	else if(data.map[0].owner!=data.user_id) {
		socket.emit('error', {type:'plant', error:"You don't have the right to remove this plant"});
		return;
	}

	connection = db.getConnection();
	connection.query('DELETE FROM wof_crop WHERE id_crop='+data.map[0].id_crop, function(error, rows, fields) {
		if(error) {
			console.log('Database error on deleting for '+data.map[0].id_crop);
			console.log(error);
			socket.emit('error', {type:'plant', error:"An error occured while removing this plant"});
			return;
		}
		else {
			destruct(data.map[0].id_crop);
			map.refreshMap(socket);
			
			// Puis on envoie l'information aux autres joueurs concernés
			broadcast.refreshViewerMap(data.x, data.y, data.user_id);
		}
	});
}

function destruct(cropId) {
	if(plantData[cropId]!=undefined) {
		clearTimeout(plantData[cropId].timer);
		map.setMapData(plantData[cropId].x, plantData[cropId].y, {type:'ground', 'id_crop':null, 'maturated':null, 'productivity':1, 'maturity':0, 'health':100});
		plantData[cropId] = undefined;
	}
}

function fertilize(socket, data) {
	if(data.x==undefined || data.y==undefined) {
		socket.emit('error', {error:'Server unable to fertilize this plant'});
		return;
	}
	map.getTilesData(socket, {x:data.x, y:data.y, depth_x:1, depth_y:1, type:data.type}, fertilizeFinalize);
}

function fertilizeFinalize(socket, data) {
	var fertilizeCost = 5;
	
	if(data.map[0].owner!=data.user_id && (infos.getAlliance(data.user_id)==null || (infos.getAlliance(data.user_id)!=null && infos.getAlliance(data.user_id)!=data.map[0].id_alliance))) {
		socket.emit('error', {type:'plant', error:"You don't have the right to fertilize this plant"});
		return;
	}
	else if(infos.getMoney(data.user_id)<fertilizeCost) {
		socket.emit('error', {type:'money', error:"You don't have enough money to fertilize it"});
		return;
	}

 	data.map[0].fertility=((Math.round(data.map[0].fertility*100))+20)/100;

	if(data.map[0].fertility>1){
		data.map[0].fertility=1;
	}
	
	
	// On enregistre les informations en local ainsi qu'en base de données
	map.setMapData(data.x, data.y, {fertility:data.map[0].fertility});
	if(data.map[0].id_crop!=null) {
		plantData[data.map[0].id_crop].fertility = data.map[0].fertility;
	}

	connection = db.getConnection();
	connection.query('UPDATE wof_tile SET fertility='+data.map[0].fertility+' WHERE xpos='+data.condition.min_x+' AND ypos='+data.condition.min_y, function(error, rows, fields) {
		if(error) {
			console.log('Database error on fertilizing plant '+rows.insertId);
			console.log(error);

			// On envoi l'erreur
			socket.emit('error', {type:'plant', error:"An error occured while fertilizing it"});
			return;
		}
		else{
			//On débite le joueur
			market.buy(socket, data.user_id, fertilizeCost);
		}
	});
}

function waterize(socket, data) {
	if(data.x==undefined || data.y==undefined) {
		socket.emit('error', {error:'Server unable to waterize this plant'});
		return;
	}
	map.getTilesData(socket, {x:data.x, y:data.y, depth_x:1, depth_y:1, type:data.type}, waterizeFinalize);
}

function waterizeFinalize(socket, data) {

	var waterizeCost = 5;

	if(data.map[0].owner!=data.user_id && (infos.getAlliance(data.user_id)==null || (infos.getAlliance(data.user_id)!=null && infos.getAlliance(data.user_id)!=data.map[0].id_alliance))) {
		socket.emit('error', {type:'plant', error:"You don't have the right to waterize this plant"});
		return;
	}
	else if(infos.getMoney(data.user_id)<waterizeCost) {
		socket.emit('error', {type:'money', error:"You don't have enough money to waterize it"});
		return;
	}

 	data.map[0].humidity=((Math.round(data.map[0].humidity*100))+20)/100;

	if(data.map[0].humidity>1){
		data.map[0].humidity=1;
	}
	
	
	// On enregistre les informations en local ainsi qu'en base de données
	map.setMapData(data.x, data.y, {humidity:data.map[0].humidity});
	if(data.map[0].id_crop!=null) {
		plantData[data.map[0].id_crop].humidity = data.map[0].humidity;
	}

	connection = db.getConnection();
	connection.query('UPDATE wof_tile SET humidity='+data.map[0].humidity+' WHERE xpos='+data.condition.min_x+' AND ypos='+data.condition.min_y, function(error, rows, fields) {
		if(error) {
			console.log('Database error while watering plant '+rows.insertId);
			console.log(error);

			// On envoi l'erreur
			socket.emit('error', {type:'plant', error:"An error occured while waterize it"});
			return;
		}
		else{
			//On débite le joueur
			market.buy(socket, data.user_id, waterizeCost);
		}
	});
}

exports.waterize=waterize;
exports.waterizeFinalize=waterizeFinalize;
exports.fertilize=fertilize;
exports.fertilizeFinalize=fertilizeFinalize;
exports.deleteCrop=deleteCrop;
exports.deleteCropFinalize=deleteCropFinalize;
exports.plantAdd=plantAdd;
exports.plantAddFinalize=plantAddFinalize;
exports.harvest = harvest;
exports.harvestAuthorization = harvestAuthorization;
exports.harvestFinalize = harvestFinalize;
exports.harvestDistribution = harvestDistribution;
exports.harvestDistributionFinalize = harvestDistributionFinalize;
exports.harvestDistributionAuthorization = harvestDistributionAuthorization;
exports.init=init;
exports.destruct = destruct;
