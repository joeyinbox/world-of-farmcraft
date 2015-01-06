var url = require('url');
var db = require("./db");
var map = require('./map');
var infos = require("./infos");
var globalSettings = require("./settings");

var Tile = require('./class/tile');

var socketio;

// On initialise le tableau contenant les chemins en cours
var currentPath = new Array();
var currentPathId = new Array();

function init(io) {
	socketio = io;
}

function validateEmail(email) {
	var regex = /^[-a-zA-Z0-9._+]+@[-a-zA-Z0-9._+]+$/;
	return regex.test(email);
}

function moveCharacter(socket, data) {
	// On vérifie que l'on dispose des bonnes informations utilisateur
	var user_id = socket.handshake.user_id;
	if(user_id==undefined || user_id==null || parseInt(user_id)!=user_id) {
		socket.emit('error', {invalidSession: true});
		return;
	}
	
	// On vérifie que l'on dispose bien des coordonnées de destination
	if(data.map_x==undefined || data.map_y==undefined || parseInt(data.map_x)!=data.map_x || parseInt(data.map_y)!=data.map_y) {
		socket.emit('error', {error:'Invalid destination'});
		return;
	}
	
	// On re-initialise l'entrée utilisateur dans le tableau des chemins en cours
	currentPath[user_id] = new Array();
	
	// On récupère les informations concernant le joueur
	var userData = infos.getData(user_id);
	
	currentPath[user_id] = new Array();
	currentPathId[user_id] = Math.random();
	
	// On Vérifie si l'on ne souhaite pas se déplacer sur la même case
	if(data.map_x==userData.character.x && data.map_y==userData.character.y) {
		socket.emit('error', {'path':new Array()});
		return;
	}
	
	// On va récupérer une portion de map incluant la position initiale et celle d'arrivée avec une marge de 2 cases
	// On calcul donc la taille de cette map
	
	// On récupère une éventuelle marge majorée ainsi qu'un précédent résultat
	if(data.margin==undefined) {
		data.margin = 2;
	}
	if(data.exploredLastly==undefined) {
		data.exploredLastly = -1;
	}
	
	// On détermine les indexs de la position de départ
	var initial = {}, destination = {};
	
	if(userData.character.x<data.map_x) {
		var depth_x = parseInt(data.map_x-userData.character.x+(data.margin*2)+1);
		var start_x = parseInt(userData.character.x-data.margin);
		initial.i = data.margin;
		destination.i = parseInt(data.map_x-userData.character.x+data.margin);
	}
	else if(userData.character.x==data.map_x) {
		var depth_x = (data.margin*2)+1;
		var start_x = parseInt(data.map_x-data.margin);
		initial.i = data.margin;
		destination.i = data.margin;
	}
	else {
		var depth_x = parseInt(userData.character.x-data.map_x+(data.margin*2)+1);
		var start_x = parseInt(data.map_x-data.margin);
		initial.i = parseInt(userData.character.x-data.map_x+data.margin);
		destination.i = data.margin;
	}
	
	if(userData.character.y<data.map_y) {
		var depth_y = parseInt(data.map_y-userData.character.y+(data.margin*2)+1);
		var start_y = parseInt(userData.character.y-data.margin);
		initial.j = data.margin;
		destination.j = parseInt(data.map_y-userData.character.y+data.margin);
	}
	else if(userData.character.y==data.map_y) {
		var depth_y = (data.margin*2)+1;
		var start_y = parseInt(data.map_y-data.margin);
		initial.j = data.margin;
		destination.j = data.margin;
	}
	else {
		var depth_y = parseInt(userData.character.y-data.map_y+(data.margin*2)+1);
		var start_y = parseInt(data.map_y-data.margin);
		initial.j = parseInt(userData.character.y-data.map_y+data.margin);
		destination.j = data.margin;
	}
	
	var mapData = map.getMap(socket, {'angle':0, 
									  'depth_x':depth_x, 
									  'depth_y':depth_y, 
									  'x':start_x, 
									  'y':start_y, 
									  'map_x':data.map_x, 
									  'map_y':data.map_y, 
									  'user_x':userData.character.x, 
									  'user_y':userData.character.y, 
									  'initial':initial, 
									  'destination':destination, 
									  'margin':data.margin, 
									  'action':(data.action!=undefined)?true:false,
									  'exploredLastly':data.exploredLastly,
									  'pathId':currentPathId[user_id]}, moveCharacterFinalize);
}

function setCharacterPosition(socket, user_id, x, y) {
	// On essaye de modifier sa position
	connection = db.getConnection();
	connection.query('UPDATE wof_user_position SET user_x='+x+', user_y='+y+' WHERE id_user='+parseInt(user_id), function(error, rows, fields) {
		if(error) {
			console.log('Database error on setting position for user '+user_id);
			console.log(error);

			// On envoi l'erreur
			socket.emit('error', {error:'Database error on setting position'});
			return;
		}
	});
	
	// Puis on enregistre les données de façon globale
	infos.setCharacterPosition(user_id, x, y);
}

function moveCharacterFinalize(socket, data, map) {
	
	// On vérifie que l'on dispose des bonnes informations utilisateur
	var user_id = socket.handshake.user_id;
	if(user_id==undefined || user_id==null || parseInt(user_id)!=user_id) {
		socket.emit('error', {invalidSession: true});
		return;
	}
	
	if(map.error!=undefined) {
		socket.emit('error', map);
		return;
	}
	
	// On vérifie que la case de destination est bien accessible
	if(!isWalkable(map[data.destination.i][data.destination.j])) {
		socket.emit('error', {'error':'Unable to reach this tile'});
		finishMovement(socket, user_id);
		return;
	}
	
	// On initialise nos tableaux de résultat
	var toExplore = new Array();
	var explored = new Array();
	
	// Puis on commence notre recherche du meilleur chemin grâce à l'algorithme A*
	map[data.initial.i][data.initial.j].g = 0;
	map[data.initial.i][data.initial.j].h = 0;
	map[data.initial.i][data.initial.j].f = 0;
	map[data.initial.i][data.initial.j].parent = null;
	toExplore.push(map[data.initial.i][data.initial.j]);
	
	while(toExplore.length>0) {
		// On s'occupera de la case dont le coût est le plus faible
		var smaller = null;
		for(var i=0; i<toExplore.length; i++) {
			if(smaller==null || toExplore[i].f<toExplore[smaller].f) {
				smaller = i;
			}
		}
		
		// On retire cette case de notre tableau
		var current = toExplore[smaller];
		toExplore.splice(smaller, 1);
		
		
		if(haveALook(current, {'x':-1, 'y':0}, map, data, explored, toExplore)) { // gauche
			break;
		}
		else if(haveALook(current, {'x':-1, 'y':-1}, map, data, explored, toExplore)) { // haut gauche
			break;
		}
		else if(haveALook(current, {'x':0, 'y':-1}, map, data, explored, toExplore)) { // haut
			break;
		}
		else if(haveALook(current, {'x':1, 'y':-1}, map, data, explored, toExplore)) { // haut droite
			break;
		}
		else if(haveALook(current, {'x':1, 'y':0}, map, data, explored, toExplore)) { // droite
			break;
		}
		else if(haveALook(current, {'x':1, 'y':1}, map, data, explored, toExplore)) { // bas droite
			break;
		}
		else if(haveALook(current, {'x':0, 'y':1}, map, data, explored, toExplore)) { // bas
			break;
		}
		else if(haveALook(current, {'x':-1, 'y':1}, map, data, explored, toExplore)) { // bas gauche
			break;
		}
		
		// Puis on place cette case dans notre tableau des cases explorées
		explored.push(current);
	}
	
	// On vérifie si l'on a trouvé la bonne case
	var last = explored.pop();
	var actual = last;
	
	if(actual.final!=undefined) {
		var path = new Array();
		
		while(actual.parent!=null) {
			path.push({'mapX':actual.mapX, 'mapY':actual.mapY});
			actual = actual.parent;
		}
		
		// On renvoit notre chemin si ce dernier est correct
		if(last.mapX==data.map_x && last.mapY==data.map_y) {
			currentPath[user_id] = path;
			followPath(socket, user_id, data.pathId, data.action);
		}
		else {
			socket.emit('error', {'error':'Unable to find a path...'});
			finishMovement(socket, user_id);
		}
	}
	else {
		// Nous n'avons pas trouvé de chemin..
		// On détermine si le personnage est encerclé
		if(data.margin==7 && data.exploredLastly==explored.length) {
			socket.emit('error', {'error':'The farmer looks surrounded'});
			finishMovement(socket, user_id);
		}
		// On élargie la marge pour tenter de découvrir un chemin dans des limites raisonnables
		else if(data.margin<22) {
			data.margin += 5;
			data.exploredLastly = explored.length;
			moveCharacter(socket, data);
		}
		else {
			socket.emit('error', {'error':'Unable to find a path...'});
			finishMovement(socket, user_id);
		}
	}
}

function haveALook(current, shift, map, data, explored, toExplore) {
	
	var next = {};
	next.x = parseInt(current.x+shift.x);
	next.y = parseInt(current.y+shift.y);
	
	if (((shift.x==-1 && current.x>0 && current.x<=data.depth_x-1 && shift.y==0 && current.y>=0 && current.y<=data.depth_y-1) || 	// gauche
		(shift.y==-1 && current.y>0 && current.y<=data.depth_y-1 && shift.x==0 && current.x>=0 && current.x<=data.depth_x-1) || 	// haut
		(shift.x==1 && current.x>=0 && current.x<data.depth_x-1 && shift.y==0 && current.y>=0 && current.y<=data.depth_y-1) || 		// droite
		(shift.y==1 && current.y>=0 && current.y<data.depth_y-1 && shift.x==0 && current.x>=0 && current.x<=data.depth_x-1) || 		// bas
		(shift.x==-1 && current.x>0 && current.x<=data.depth_x-1 && shift.y==-1 && current.y>0 && current.y<=data.depth_y-1 && isWalkable(map[current.x-1][current.y]) && isWalkable(map[current.x][current.y-1])) || 	// haut gauche
		(shift.x==1 && current.x>=0 && current.x<data.depth_x-1 && shift.y==-1 && current.y>0 && current.y<=data.depth_y-1 && isWalkable(map[current.x+1][current.y]) && isWalkable(map[current.x][current.y-1])) || 		// haut droite
		(shift.x==1 && current.x>=0 && current.x<data.depth_x-1 && shift.y==1 && current.y>=0 && current.y<data.depth_y-1 && isWalkable(map[current.x+1][current.y]) && isWalkable(map[current.x][current.y+1])) || 		// bas droite
		(shift.x==-1 && current.x>0 && current.x<=data.depth_x-1 && shift.y==1 && current.y>=0 && current.y<data.depth_y-1 && isWalkable(map[current.x-1][current.y]) && isWalkable(map[current.x][current.y+1]))) && 	// bas gauche
		isWalkable(map[next.x][next.y])) {
		
		// On vérifie si ce n'est pas la case de destination
		if(next.x==data.destination.i && next.y==data.destination.j) {
			// W00T !!1
			
			explored.push(current);
			var weight = calculateWeight(map, current, shift, data.initial, data.destination);
			map[next.x][next.y].parent = weight.parent;
			map[next.x][next.y].h = weight.h;
			map[next.x][next.y].g = weight.g;
			map[next.x][next.y].f = weight.f;
			map[next.x][next.y].final = true;
			explored.push(map[next.x][next.y]);
			
			return true;
		}
		
		var index = hasBeenExplored(map[next.x][next.y].x, map[next.x][next.y].y, explored);
		if(index===false) {
			index = hasBeenDiscovered(map[next.x][next.y].x, map[next.x][next.y].y, toExplore);
			if(index===false) {
				// On calcule le coût de ce chemin
				var weight = calculateWeight(map, current, shift, data.initial, data.destination);
				
				map[next.x][next.y].parent = weight.parent;
				map[next.x][next.y].h = weight.h;
				map[next.x][next.y].g = weight.g;
				map[next.x][next.y].f = weight.f;
				
				toExplore.push(map[next.x][next.y]);
			}
			else {
				// On vérifie si le chemin qu'on a pris ici n'est pas plus interressant
				var weight = calculateWeight(map, current, shift, data.initial, data.destination);
				
				if(toExplore[index].g>weight.g) {
					toExplore[index].parent = weight.parent;
					toExplore[index].h = weight.h;
					toExplore[index].g = weight.g;
					toExplore[index].f = weight.f;
				}
			}
		}
	}
}

function calculateWeight(map, current, shift, initial, destination) {
	var result = {};
	result.parent = map[current.x][current.y];
	
	// On ajoute un coût de déplacement différent si ce dernier est en diagonale
	if((shift.x==-1 && shift.y==-1) || (shift.x==1 && shift.y==-1) || (shift.x==1 && shift.y==1) || (shift.x==1 && shift.y==1)) {
		result.g = 14;
	}
	else {
		result.g = 10;
	}
	
	if(result.parent.parent!=null) {
		result.g += result.parent.parent.g;
	}
	
	// On calcul la distance par rapport au point de destination
	var horizontal = (destination.i-initial.i-shift.x)*10;
	var vertical = (destination.j-initial.j-shift.y)*10;
	if(horizontal<0) {
		horizontal *= -1;
	}
	if(vertical<0) {
		vertical *= -1;
	}
	
	result.h = parseInt(horizontal+vertical);
	result.f = parseInt(result.g+result.h);
	
	return result;
}

function isWalkable(tile) {
	if(tile.element.type == 'ground' || tile.element.type == 'corn' || tile.element.type == 'tomato' || tile.element.type == 'wheat') {
		return true;
	}
	return false;
}

function hasBeenExplored(x, y, explored) {
	// On vérifie si une case a été exploré
	for(var i=0; i<explored.length; i++) {
		if(explored[i].x==x && explored[i].y==y) {
			return i;
		}
		else {
		}
	}
	return false;
}

function hasBeenDiscovered(x, y, toExplore) {
	// On vérifie si une case a été découverte
	for(var i=0; i<toExplore.length; i++) {
		if(toExplore[i].x==x && toExplore[i].y==y) {
			return i;
		}
	}
	return false;
}

function updateAngle(socket, data) {
	// On vérifie que l'on dispose des bonnes informations utilisateur
	var user_id = socket.handshake.user_id;
	if(user_id==undefined || user_id==null || parseInt(user_id)!=user_id) {
		socket.emit('error', {invalidSession: true});
		return;
	}
	
	// On vérifie que l'on a bien transmit un angle valide
	if(data.angle==undefined || parseInt(data.angle)!=data.angle || data.angle<0 || data.angle>3) {
		socket.emit('error', {error:'Invalid angle'});
		return;
	}
	
	// On essaye de modifier l'angle de vue
	connection = db.getConnection();
	connection.query('UPDATE wof_user_position SET angle='+parseInt(data.angle)+' WHERE id_user='+user_id, function(error, rows, fields) {
		if(error) {
			console.log('Database error while updating angle for user '+user_id);
			console.log(error);

			// On envoi l'erreur
			socket.emit('error', {error:'Database error while updating angle'});
			return;
		}
	});
	
	// On modifie l'angle du personnage
	infos.setMapAngle(user_id, data.angle);
}

function followPath(socket, user_id, pathId, action) {
	// On souhaite déplacer le personnage vers une destination suivant un chemin
	// Si ce dernier est vide, on s'arrête
	if(currentPath[user_id].length==0 || pathId!=currentPathId[user_id]) {
		finishMovement(socket, user_id);
		return;
	}
	
	
	var current = currentPath[user_id].pop();
	var data = infos.getData(user_id);
	
	data.character.previous_x = data.character.x;
	data.character.previous_y = data.character.y;
	
	// On calcul l'angle du personnage à ajuster
	
	// gauche
	if(data.character.previous_x<current.mapX && data.character.previous_y==current.mapY) {
		turnCharacterTo(user_id, 1-(data.map.angle*2));
	}
	// haut
	else if(data.character.previous_x==current.mapX && data.character.previous_y<current.mapY) {
		turnCharacterTo(user_id, 7-(data.map.angle*2));
	}
	// droite
	else if(data.character.previous_x>current.mapX && data.character.previous_y==current.mapY) {
		turnCharacterTo(user_id, 5-(data.map.angle*2));
	}
	// bas
	else if(data.character.previous_x==current.mapX && data.character.previous_y>current.mapY) {
		turnCharacterTo(user_id, 3-(data.map.angle*2));
	}
	// haut droite
	else if(data.character.previous_x>current.mapX && data.character.previous_y<current.mapY) {
		turnCharacterTo(user_id, 6-(data.map.angle*2));
	}
	// bas gauche
	else if(data.character.previous_x<current.mapX && data.character.previous_y>current.mapY) {
		turnCharacterTo(user_id, 2-(data.map.angle*2));
	}
	// haut gauche
	else if(data.character.previous_x<current.mapX && data.character.previous_y<current.mapY) {
		turnCharacterTo(user_id, 0-(data.map.angle*2));
	}
	// bas droite
	else if(data.character.previous_x>current.mapX && data.character.previous_y>current.mapY) {
		turnCharacterTo(user_id, 4-(data.map.angle*2));
	}
	
	
	// On vérifie si l'on souhaitait se déplacer pour effectuer une action; auquel cas il faut alors s'arrêter
	if(currentPath[user_id].length==0 && action==true) {
		finishMovement(socket, user_id);
		socket.emit('moveCharacterForAnswer', {x:current.mapX, y:current.mapY});
		return;
	}
	
	
	var tmp = determineDirectionAndDistance(data.character.angle);
	
	
	// Puis on anime notre personnage
	animateMovingCharacter(socket, user_id, current, tmp.distance, tmp.direction, 0, currentPathId[user_id], action);
}

function determineDirectionAndDistance(angle) {
	// On récupère les réglages
	var settings = globalSettings.getDisplayData();
	
	// On récupère la distance ainsi que la direction à suivre grâce à l'orientation du personnage
	var direction = {};
	var distance = 0;
	
	switch(angle) {
		case 0:
			direction.x = 0;
			direction.y = 1;
			distance = settings.tileHeight+(settings.tileHeight*0.1);
			break;
		case 1:
			direction.x = 1;
			direction.y = 0.5;
			distance = settings.tileHeight+(settings.tileHeight*0.1);
			break;
		case 2:
			direction.x = 1;
			direction.y = 0;
			distance = settings.tileWidth+(settings.tileHeight*0.1);
			break;
		case 3:
			direction.x = 1;
			direction.y = -0.5;
			distance = settings.tileHeight+(settings.tileHeight*0.1);
			break;
		case 4:
			direction.x = 0;
			direction.y = -1;
			distance = settings.tileHeight+(settings.tileHeight*0.1);
			break;
		case 5:
			direction.x = -1;
			direction.y = -0.5;
			distance = settings.tileHeight+(settings.tileHeight*0.1);
			break;
		case 6:
			direction.x = -1;
			direction.y = 0;
			distance = settings.tileWidth+(settings.tileHeight*0.1);
			break;
		case 7:
			direction.x = -1;
			direction.y = 0.5;
			distance = settings.tileHeight+(settings.tileHeight*0.1);
			break;
	}
	
	return {direction:direction, distance:distance};
}

function animateMovingCharacter(socket, user_id, to, distance, direction, footstep, pathId, action) {
	// On vérifie si le chemin est toujours d'actualité
	if(pathId!=currentPathId[user_id]) {
		infos.resetCharacterShift(user_id);
		
		// On envoi le signal
		sendCharacterDisplay(socket, user_id);
		return;
	}
	
	// On déplace notre personnage
	footstep++;
	
	// On récupère les réglages
	var settings = globalSettings.getDisplayData();
	
	var moveLength = settings.characterSpeed;
	var movedLength = settings.characterSpeed*footstep;
	
	// On ajuste la distance à avancer
	if(movedLength>distance) {
		moveLength = distance-((distance/settings.characterSpeed)*(footstep-1));
	}
	
	infos.updateCharacterShift(user_id, direction.x*moveLength, direction.y*moveLength);
	
	// On alterne le mouvement de jambes
	if(footstep%2==1) {
		infos.updateCharacterLeg(user_id);
	}
	
	// On vérifie si l'on doit encore avancer
	if(movedLength<distance) {
		// On envoi le signal
		sendCharacterDisplay(socket, user_id);
		
		setTimeout(function(){animateMovingCharacter(socket, user_id, to, distance, direction, footstep, pathId, action);}, 75);
	}
	else if(pathId==currentPathId[user_id]) {
		// On enregistre la position
		setCharacterPosition(socket, user_id, to.mapX, to.mapY);
		
		// On envoi le signal
		sendCharacterDisplay(socket, user_id);
		
		followPath(socket, user_id, pathId, action);
	}
}

function turnCharacterTo(user_id, turn) {
	if(turn>=0) {
		infos.setCharacterAngle(user_id, turn%8);
	}
	else {
		infos.setCharacterAngle(user_id, 8+turn);
	}
}

function sendCharacterDisplay(socket, user_id) {
	// On récupère les informations sur la nouvelle position du joueur
	var userData = infos.getData(user_id);
	
	// On envoi la nouvelle position du joueur
	socket.emit('refreshCharacterDisplay', {user:userData.character});
	
	// Puis on envoi l'information aux autres joueurs concernés
	for(s in socketio.handshaken) {
		if(socketio.handshaken[s].user_id!=undefined && user_id!=socketio.handshaken[s].user_id && socketio.sockets.sockets[s]!=undefined) {
			// On récupère les informations de ce spectateur
			var viewerData = infos.getMapData(socketio.handshaken[s].user_id);
			
			if(userData.character.x>=viewerData.min_x-((viewerData.max_x-viewerData.min_x-1)/2) && userData.character.x<=viewerData.max_x && userData.character.y>=viewerData.min_y-((viewerData.max_y-viewerData.min_y-1)/2) && userData.character.y<=viewerData.max_y) {
				
				// On va appliquer une éventuelle rotation pour correspondre à la vue de l'utilisateur concerné
				if(viewerData.angle==userData.map.angle) {
					socketio.sockets.sockets[s].emit('refreshOtherCharactersDisplay', {'user_id':user_id, email:userData.email, infos:userData.character});
				}
				else {
					socketio.sockets.sockets[s].emit('refreshOtherCharactersDisplay', {'user_id':user_id, email:userData.email, infos:adjustCharacterDisplayAngle(userData.character.x, userData.character.y, userData.character.shift_x, userData.character.shift_y, userData.character.leg, userData.character.angle, userData.map.angle, viewerData.angle)});
				}
			}
		}
	}
}

function adjustCharacterDisplayAngle(x, y, shift_x, shift_y, leg, characterAngle, mapAngle, wantedAngle) {
	
	// On récupère les réglages
	var settings = globalSettings.getDisplayData();
	
	if((mapAngle+2)%4==wantedAngle) {
		shift_x *= -1;
		shift_y *= -1;
		characterAngle = (characterAngle+2)%8;
	}
	else if((mapAngle==0 && wantedAngle==1) || (mapAngle==1 && wantedAngle==0)) {
		if(characterAngle==7 || characterAngle==3) {
			shift_x *= -1;
		}
		else if(characterAngle==5 || characterAngle==1) {
			shift_y *= -1;
		}
		else if(characterAngle==6 || characterAngle==2) {
			var tmp = shift_y;
			shift_y = -1*shift_x*(settings.tileHeight/settings.tileWidth);
			shift_x = tmp;
		}
		else {
			var tmp = shift_x;
			shift_x = shift_y*(settings.tileWidth/settings.tileHeight);
			shift_y = tmp;
		}
		
		if((mapAngle==0 && wantedAngle==1)) {
			shift_x *= -1;
			shift_y *= -1;
		}
	}
	else if((mapAngle==2 && wantedAngle==3) || (mapAngle==3 && wantedAngle==2)) {
		if(characterAngle==7 || characterAngle==3) {
			shift_y *= -1;
		}
		else if(characterAngle==5 || characterAngle==1) {
			shift_x *= -1;
		}
		else if(characterAngle==6 || characterAngle==2) {
			var tmp = shift_y;
			shift_y = shift_x/(settings.tileWidth/settings.tileHeight);
			shift_x = tmp;
		}
		else {
			var tmp = shift_x;
			shift_x = -1*shift_y*(settings.tileWidth/settings.tileHeight);
			shift_y = tmp;
		}
		
		if((mapAngle==3 && wantedAngle==2)) {
			shift_x *= -1;
			shift_y *= -1;
		}
	}
	else if((mapAngle==0 && wantedAngle==3) || (mapAngle==3 && wantedAngle==0)) {
		if(characterAngle==7 || characterAngle==3) {
			shift_x *= -1;
		}
		else if(characterAngle==5 || characterAngle==1) {
			shift_y *= -1;
		}
		else if(characterAngle==6 || characterAngle==2) {
			var tmp = shift_y;
			shift_y = -1*shift_x/(settings.tileWidth/settings.tileHeight);
			shift_x = tmp;
		}
		else {
			var tmp = shift_x;
			shift_x = shift_y*(settings.tileWidth/settings.tileHeight);
			shift_y = tmp;
		}
		
		if((mapAngle==3 && wantedAngle==0)) {
			shift_x *= -1;
			shift_y *= -1;
		}
	}
	else {
		if(characterAngle==7 || characterAngle==3) {
			shift_y *= -1;
		}
		else if(characterAngle==5 || characterAngle==1) {
			shift_x *= -1;
		}
		else if(characterAngle==6 || characterAngle==2) {
			var tmp = shift_y;
			shift_y = shift_x*(settings.tileHeight/settings.tileWidth);
			shift_x = tmp;
		}
		else {
			var tmp = shift_x;
			shift_x = -1*shift_y*(settings.tileWidth/settings.tileHeight);
			shift_y = tmp;
		}
		
		if((mapAngle==0 && wantedAngle==3) || (mapAngle==2 && wantedAngle==1)) {
			shift_x *= -1;
			shift_y *= -1;
		}
	}
	
	if((mapAngle+1)%4==wantedAngle) {
		characterAngle = (characterAngle+6)%8;
	}
	else {
		characterAngle = (characterAngle+2)%8;
	}
	
	// Puis on retourne les données
	return {x:x, 
			y:y,
			shift_x:shift_x, 
			shift_y:shift_y,
			angle:characterAngle, 
			leg:leg};
}

function finishMovement(socket, user_id) {
	infos.setCharacterLeg(user_id, 1);
	sendCharacterDisplay(socket, user_id);
}

function getOtherCharacterDisplay(socket, user_id, viewerData) {
	// On récupère la position des joueurs présent dans notre vue
	for(s in socketio.handshaken) {
		if(socketio.handshaken[s].user_id!=undefined && user_id!=socketio.handshaken[s].user_id) {
			// On récupère les informations de cet utilisateur
			var userData = infos.getData(socketio.handshaken[s].user_id);
			
			if(userData.character.x>=viewerData.min_x-((viewerData.max_x-viewerData.min_x-1)/2) && userData.character.x<=viewerData.max_x && userData.character.y>=viewerData.min_y-((viewerData.max_y-viewerData.min_y-1)/2) && userData.character.y<=viewerData.max_y) {
				
				// On va appliquer une éventuelle rotation pour correspondre à la vue de l'utilisateur concerné
				if(viewerData.angle==userData.map.angle) {
					socket.emit('refreshOtherCharactersDisplay', {'user_id':socketio.handshaken[s].user_id, email:userData.email, infos:userData.character});
				}
				else {
					socket.emit('refreshOtherCharactersDisplay', {'user_id':socketio.handshaken[s].user_id, email:userData.email, infos:adjustCharacterDisplayAngle(userData.character.x, userData.character.y, userData.character.shift_x, userData.character.shift_y, userData.character.leg, userData.character.angle, userData.map.angle, viewerData.angle)});
				}
			}
		}
	}
}


exports.init = init;
exports.moveCharacter = moveCharacter;
exports.moveCharacterFinalize = moveCharacterFinalize;
exports.updateAngle = updateAngle;
exports.getOtherCharacterDisplay = getOtherCharacterDisplay;
exports.sendCharacterDisplay = sendCharacterDisplay;
exports.determineDirectionAndDistance = determineDirectionAndDistance;