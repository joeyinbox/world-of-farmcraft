var db = require("./db");
var character = require('./character');
var plant = require('./plant');
var building = require('./building');
var map = require('./map');
var globalSettings = require('./settings');
var infos = require('./infos');
var broadcast = require('./broadcast');

var time = 0;
var microtime = 0;
var naturalEventTimer;

function init() {
	// On récupère l'heure actuelle
	connection = db.getConnection();
	connection.query('SELECT time FROM wof_environment WHERE id_environment=1', function(error, rows, fields) {
		if(error || rows.length==0) {
			console.log('Database error on retrieving environment time');
		}
		else {
			time = rows[0].time;
		}
	});
	
	// Puis on lance notre timer
	updateMicrotime();
	
	// On va également déterminer dans combien de temps le prochain évènement naturel va se produire
	//updateNaturalEventTimer();
}

function updateMicrotime() {
	// On incrémente le temps
	microtime++;
	
	// On vérifie si l'on a dépassé une heure
	if(microtime%60==0) {
		microtime = 0;
		time++;
		
		if(time%24==0) {
			time = 0;
		}
		
		// On met à jour l'heure
		saveTime();
		
		// Puis on syncronise les clients
		broadcast.updateTime({'hour':time, 'minute':microtime});
	}
	
	setTimeout(updateMicrotime, 1000);
}

function saveTime() {
	// On enregistre l'heure actuelle
	connection = db.getConnection();
	connection.query('UPDATE wof_environment SET time='+time+' WHERE id_environment=1', function(error, rows, fields) {
		if(error || rows.length==0) {
			console.log('Database error on saving environment time');
		}
	});
}

function getTime(socket) {
	socket.emit('updateTime', {'hour':time, 'minute':microtime});
}

function updateNaturalEventTimer() {
	// On executera le prochain évènement naturel dans un interval de temps inférieur à 1 heure
	naturalEventTimer = setTimeout(selectNaturalEvent, Math.floor(Math.random()*10000000000)%3600000);
}

function selectNaturalEvent() {
	// Certains évènements natuels sont plus probables que d'autres
	var probability = globalSettings.getNaturalEventProbabilities();
	
	var total = 0;
	for(i in probability) {
		total += probability[i];
	}
	
	var tmp = Math.floor(Math.random()*1000)%total;
	var inc = 0;
	
	for(i in probability) {
		inc += probability[i];
		
		if(tmp<inc) {
			switch(i) {
				case 'rain':
					makeItRain();
					break;
				case 'grasshoppers':
					spreadGrasshoppers();
					break;
				case 'tornado':
					rollTornado();
					break;
				case 'meteor':
					throwTheseMeteors();
					break;
			}
			break;
		}
	}
	
	// On re-programme le prochain évènement naturel
	updateNaturalEventTimer();
}

function getMapBoundaries(callback) {
	// On récupère les limites de la map
	connection.query('SELECT * FROM wof_map_boundaries', function(error, rows, fields) {
		if(error || rows.length!=1) {
			console.log('Database error on retrieving map boundaries');
			console.log(error);
		}
		else {
			callback(rows[0]);
		}
	});
}

function makeItRain(boundaries) {
	// On va déterminer une zone de la map sur laquelle la pluie va s'abattre
	if(boundaries==undefined) {
		getMapBoundaries(makeItRain);
		return;
	}
	
	// On définit la taille de la zone impactée
	var size = 32+Math.floor(Math.random()*100)%16;
	
	// TODO: continuer...
}

function spreadGrasshoppers(boundaries) {
	
}

function rollTornado(boundaries, data) {
	// On va déterminer une zone de la map sur laquelle la tornade va s'abattre
	if(boundaries==undefined) {
		getMapBoundaries(rollTornado);
		return;
	}
	
	// On va prendre un point aléatoire
	var totalX = parseInt(boundaries.max_x)-parseInt(boundaries.min_x);
	var totalY = parseInt(boundaries.max_y)-parseInt(boundaries.min_y);
	
	var x = (Math.floor(Math.random()*10000000000)%totalX)+boundaries.min_x;
	var y = (Math.floor(Math.random()*10000000000)%totalY)+boundaries.min_y;
	
	// Puis on lance l'animation pour les utilisateurs concernés
	animateTornado(x, y, 400, 16+(8*(Math.floor(Math.random()*1000)%4)), 0);
}

function animateTornado(x, y, iterationLeft, hop, sprite, direction, distance, angle, next) {
	// On décide arbitrairement que la tornade met 8 itérations pour changer de case
	if(direction==undefined || iterationLeft%8==0) {
		
		// On détruit l'élément se trouvant sur la case de la tornade
		destructTile(x, y);
		
		// On changera de direction de temps en temps
		if(iterationLeft%hop==0 || iterationLeft==400) {
			// On met à jour le hop
			hop = 16+(8*(Math.floor(Math.random()*1000)%4));
			
			var angle = Math.floor(Math.random()*1000)%8;
			var tmp = character.determineDirectionAndDistance(angle);
			direction = tmp.direction;
			distance = tmp.distance;
		}
		
		if(next!=undefined) {
			x = next.x;
			y = next.y;
		}
		
		// On déduit la prochaine case touchée
		switch(angle) {
			case 0:
				var next = {x:x+1, y:y+1};
				break;
			case 1:
				var next = {x:x+1, y:y};
				break;
			case 2:
				var next = {x:x+1, y:y-1};
				break;
			case 3:
				var next = {x:x, y:y-1};
				break;
			case 4:
				var next = {x:x-1, y:y-1};
				break;
			case 5:
				var next = {x:x-1, y:y};
				break;
			case 6:
				var next = {x:x-1, y:y+1};
				break;
			case 7:
				var next = {x:x, y:y+1};
				break;
		}
	}
	
	var movedLength = ((iterationLeft%8)>0)?(distance/8)*(8-(iterationLeft%8)):0;
	
	// On affiche la tornade aux joueurs concernés
	broadcast.showTornado(x, y, {x:x, y:y, shift_x:direction.x*movedLength, shift_y:direction.y*movedLength, sprite:sprite});
	
	if(iterationLeft>0) {
		iterationLeft--;
		sprite = (sprite+1)%5;
		setTimeout(function() {animateTornado(x, y, iterationLeft, hop, sprite, direction, distance, angle, next);}, 100);
	}
	else {
		// On indique que la tornade est terminée
		broadcast.showTornado(x, y, {stop:true});
	}
}

function throwTheseMeteors(boundaries) {
	
}

function destructTile(x, y) {
	// On va détruire un éventuel élément se trouvant à cette coordonnée
	// Pour cela, on va dans un premier temps regarder ce qui s'y trouve
	var tile = map.getMapRawData(x, y);
	
	if(tile==null) {
		return;
	}
	
	// On va agir différemment suivant le type
	if(tile.id_crop!=null) {
		// On supprime cette crop
		connection = db.getConnection();
		connection.query('DELETE FROM wof_crop WHERE id_crop='+tile.id_crop, function(error, rows, fields) {
			if(error) {
				console.log('Database error on destroying a crop after a natural event');
				console.log(error);
				return;
			}
			else {
				plant.destruct(tile.id_crop);
				broadcast.refreshViewerMap(x, y);
			}
		});
	}
	else if(tile.id_building!=null) {
		// On supprime ce building
		connection = db.getConnection();
		connection.query('DELETE FROM wof_building WHERE id_building='+tile.id_building, function(error, rows, fields) {
			if(error) {
				console.log('Database error on destroying a building after a natural event');
				console.log(error);
				return;
			}
			else {
				building.destruct(tile.id_building);
				broadcast.refreshViewerMap(x, y);
			}
		});
	}
}


exports.init = init;
exports.getTime = getTime;