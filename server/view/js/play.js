$(document).ready(function(){
	
	
	/********************
	*	Initialisation 	*
	*********************/
	
	
	
	// On masque le message d'alerte concernant le chargement de javascript
	$('#warning, footer').hide(0);
	
	// Puis on récupère notre canvas que l'on redimmensionne au format de la fenête
	var canvas = $('#canvas');
	canvas.attr('width', $('body').width());
	canvas.attr('height', $('body').height());
	
	// On récupère le context de notre canvas
	var ctx = document.getElementById('canvas').getContext('2d');
	
	// On initialise le chemin où charger les différentes ressources
	var scriptPath = '/view/js/lib/';
	var imgPath = '/view/img/';
	
	// On permet d'afficher des notifications ainsi que des informations
	var notification = $('#notification');
	var informationsPanel = $('#informations');
	
	// On initialise les réglages
	var settings = {};
	
	// On initialise les informations de cet utilisateur ainsi que leurs affichages
	var informations = {};
	var life = $('#life progress');
	var lifePoints = $('#life p');
	var level = $('#level');
	var money = $('#money');
	
	// On initialise les variables de temps
	var time = {};
	var timeInterval = null;
	var brightness = 0;
	
	// On initialise les variables relatives à l'affichage des chargements
	var progress = $('#loading progress');
	progress.show(0);
	var progressValue = $('#loading p');
	var progressVal = 0;
	var progressInc = 0;
	var progressCount = 0;
	var progressTotal = 0;
	var progressError = false;
	
	// Puis celles relatives aux chargements eux-mêmes
	var loaded = 0;
	var loadTimer;
	
	// On récupèrera les dimensions de l'écran
	var screenWidth;
	var screenHeight;
	
	// On utilisera ces variables pour stocker la map ainsi que des informations d'affichage
	var map;
	var mapDisplay = {};
	mapDisplay.moveX = 0;
	mapDisplay.moveY = 0;
	mapDisplay.tmpMoveX = 0;
	mapDisplay.tmpMoveY = 0;
	mapDisplay.focusTmpMoveX = 0;
	mapDisplay.focusTmpMoveY = 0;
	
	// On initialise une variable gérant le chargement des données de la map
	var mapRended = false;
	var mapRendering = false;
	var mapLoading = true;
	
	// On initialise les variables de position du personnage
	var characterDisplay = {};
	var otherCharacterDisplay = new Array();
	
	// On permettra de centrer la map sur le personnage
	var focusOnCharacter = false;
	
	// On permettra de changer le mode de vision pour afficher les propriétés
	var ownerVision = true;
	
	// On initialise les variables de position de la souris
	var mouse = {};
	mouse.hoverX = 0;
	mouse.hoverY = 0;
	mouse.x = 0;
	mouse.y = 0;
	
	// On récupère l'élément indiquant l'heure
	var daytime = $('#header time');
	
	// On déclare les ressources pour la vision et le son
	var soundRes = {on:'/view/img/menu/sound-on.png', off:'/view/img/menu/sound-off.png'};
	
	// On permettra de désactiver les sons
	var mute = true;
	
	// On permettra d'afficher la taille d'un bâtiment
	var buildingSize;
	var highlightedTile = null;
	
	// On permettra de selectionner des actions et des options à effectuer
	var actionSelected = 'move';
	var optionSelected = null;
	var optionDesc = $('#optionDesc span');
	var optionDescVisible = false;
	
	// On initialise le tableau contenant les ressources à télécharger
	var resDict = new Array();
	var resDictTotal = 0;
	var resAdditional = new Array();
	var resAdditionalTotal = 0;
	var soundsTotal = 0;
	var ressource = new Array();
	
	// On permettra de connaitre les armes possédées
	var ownedWeapon = null;
	
	// On permettra d'afficher des tornades
	var tornado = null;
	
	// On permettra d'afficher les prix du marché
	var marketPrice = null;
	
	// On permettra d'afficher les espaces restants disponibles dans les buildings
	var marketCropAmount = null;
	var harvestingData = null;
	var buildingAvailability = null;
	
	// On établit une connexion grace aux web sockets
	var socket = io.connect('http://j.local');
	
	
	
	
	
	/************************
	*	Amorcement de l'app	*
	*************************/
	
	
	
	// On s'adapte à la taille de la fenêtre
	adaptSize();
	
	// On déclare nos ressources
	declareRessources();
	
	// On récupère les réglages dont dépends le calcul des dimensions de la map à charger
	socket.emit('getDisplaySettings');

	// On récupère l'heure actuelle
	socket.emit('getTime');
	
	// On récupère les informations additionnelles de l'utilisateur
	socket.emit('getInformations');

	// On récupère la position de l'environnement
	socket.emit('getPosition');
	
	// On récupère les dimensions des bâtiments
	socket.emit('getBuildingSize');
	
	// On récupère les armes possédées
	socket.emit('getOwnedWeapon');
	
	// Puis on initialise notre barre de progression en rajoutant le chargement des réglages ainsi que de la position, l'heure, ses informations, les dimensions des bâtiments, les prix et les posséssions d'arme
	initializeProgress(resDictTotal+resAdditionalTotal+soundsTotal+7);
	
	// Et on lance le chargement des images et des sons
	loadGraphicalRessources();
	loadSoundRessources();
	
	
	
	
	/********************************************
	*	Gestion des ressources à télécharger	*
	********************************************/
	
	
	
	// Nous permettra de déclarer les différentes ressources graphiques à télécharger
	function declareRessources() {
		
		resDict['tile'] = new Array();
		resDict['tile']['ground'] = 'ground.png';
		resDict['tile']['ground-neutral'] = 'ground-neutral.png';
		resDict['tile']['ground-allies'] = 'ground-allies.png';
		resDict['tile']['ground-enemy'] = 'ground-enemy.png';
		resDict['tile']['ground-hover-ok'] = 'ground-hover-ok.png';
		resDict['tile']['ground-hover-bad'] = 'ground-hover-bad.png';
		
		resDict['tile']['water'] = 'water.png';
		resDict['tile']['water-neutral'] = 'water-neutral.png';
		resDict['tile']['water-allies'] = 'water-allies.png';
		resDict['tile']['water-enemy'] = 'water-enemy.png';
		
		resDict['tile']['corn'] = new Array();
		resDict['tile']['corn'].push('corn/level1.png');
		resDict['tile']['corn'].push('corn/level2.png');
		resDict['tile']['corn'].push('corn/level3.png');
		resDict['tile']['corn'].push('corn/level4.png');
		resDict['tile']['corn'].push('corn/level5.png');
		resDict['tile']['corn'].push('corn/level6.png');
		resDict['tile']['corn-allies'] = new Array();
		resDict['tile']['corn-allies'].push('corn/level1-allies.png');
		resDict['tile']['corn-allies'].push('corn/level2-allies.png');
		resDict['tile']['corn-allies'].push('corn/level3-allies.png');
		resDict['tile']['corn-allies'].push('corn/level4-allies.png');
		resDict['tile']['corn-allies'].push('corn/level5-allies.png');
		resDict['tile']['corn-allies'].push('corn/level6-allies.png');
		resDict['tile']['corn-enemy'] = new Array();
		resDict['tile']['corn-enemy'].push('corn/level1-enemy.png');
		resDict['tile']['corn-enemy'].push('corn/level2-enemy.png');
		resDict['tile']['corn-enemy'].push('corn/level3-enemy.png');
		resDict['tile']['corn-enemy'].push('corn/level4-enemy.png');
		resDict['tile']['corn-enemy'].push('corn/level5-enemy.png');
		resDict['tile']['corn-enemy'].push('corn/level6-enemy.png');
		
		resDict['tile']['tomato'] = new Array();
		resDict['tile']['tomato'].push('tomato/level1.png');
		resDict['tile']['tomato'].push('tomato/level2.png');
		resDict['tile']['tomato'].push('tomato/level3.png');
		resDict['tile']['tomato'].push('tomato/level4.png');
		resDict['tile']['tomato'].push('tomato/level5.png');
		resDict['tile']['tomato'].push('tomato/level6.png');
		resDict['tile']['tomato-allies'] = new Array();
		resDict['tile']['tomato-allies'].push('tomato/level1-allies.png');
		resDict['tile']['tomato-allies'].push('tomato/level2-allies.png');
		resDict['tile']['tomato-allies'].push('tomato/level3-allies.png');
		resDict['tile']['tomato-allies'].push('tomato/level4-allies.png');
		resDict['tile']['tomato-allies'].push('tomato/level5-allies.png');
		resDict['tile']['tomato-allies'].push('tomato/level6-allies.png');
		resDict['tile']['tomato-enemy'] = new Array();
		resDict['tile']['tomato-enemy'].push('tomato/level1-enemy.png');
		resDict['tile']['tomato-enemy'].push('tomato/level2-enemy.png');
		resDict['tile']['tomato-enemy'].push('tomato/level3-enemy.png');
		resDict['tile']['tomato-enemy'].push('tomato/level4-enemy.png');
		resDict['tile']['tomato-enemy'].push('tomato/level5-enemy.png');
		resDict['tile']['tomato-enemy'].push('tomato/level6-enemy.png');
		
		resDict['tile']['wheat'] = new Array();
		resDict['tile']['wheat'].push('wheat/level1.png');
		resDict['tile']['wheat'].push('wheat/level2.png');
		resDict['tile']['wheat'].push('wheat/level3.png');
		resDict['tile']['wheat'].push('wheat/level4.png');
		resDict['tile']['wheat'].push('wheat/level5.png');
		resDict['tile']['wheat'].push('wheat/level6.png');
		resDict['tile']['wheat-allies'] = new Array();
		resDict['tile']['wheat-allies'].push('wheat/level1-allies.png');
		resDict['tile']['wheat-allies'].push('wheat/level2-allies.png');
		resDict['tile']['wheat-allies'].push('wheat/level3-allies.png');
		resDict['tile']['wheat-allies'].push('wheat/level4-allies.png');
		resDict['tile']['wheat-allies'].push('wheat/level5-allies.png');
		resDict['tile']['wheat-allies'].push('wheat/level6-allies.png');
		resDict['tile']['wheat-enemy'] = new Array();
		resDict['tile']['wheat-enemy'].push('wheat/level1-enemy.png');
		resDict['tile']['wheat-enemy'].push('wheat/level2-enemy.png');
		resDict['tile']['wheat-enemy'].push('wheat/level3-enemy.png');
		resDict['tile']['wheat-enemy'].push('wheat/level4-enemy.png');
		resDict['tile']['wheat-enemy'].push('wheat/level5-enemy.png');
		resDict['tile']['wheat-enemy'].push('wheat/level6-enemy.png');
		
		resDict['building'] = new Array();
		resDict['building']['barn-0'] = 'building/barn/0.png';
		resDict['building']['barn-0-allies'] = 'building/barn/0-allies.png';
		resDict['building']['barn-0-enemy'] = 'building/barn/0-enemy.png';
		resDict['building']['barn-1'] = new Array();
		resDict['building']['barn-1'].push('building/barn/1-0.png');
		resDict['building']['barn-1'].push('building/barn/1-1.png');
		resDict['building']['barn-1'].push('building/barn/1-2.png');
		resDict['building']['barn-1-allies'] = new Array();
		resDict['building']['barn-1-allies'].push('building/barn/1-0-allies.png');
		resDict['building']['barn-1-allies'].push('building/barn/1-1-allies.png');
		resDict['building']['barn-1-allies'].push('building/barn/1-2-allies.png');
		resDict['building']['barn-1-enemy'] = new Array();
		resDict['building']['barn-1-enemy'].push('building/barn/1-0-enemy.png');
		resDict['building']['barn-1-enemy'].push('building/barn/1-1-enemy.png');
		resDict['building']['barn-1-enemy'].push('building/barn/1-2-enemy.png');
		resDict['building']['barn-2'] = 'building/barn/2.png';
		resDict['building']['barn-2-allies'] = 'building/barn/2-allies.png';
		resDict['building']['barn-2-enemy'] = 'building/barn/2-enemy.png';
		resDict['building']['barn-3'] = new Array();
		resDict['building']['barn-3'].push('building/barn/3-0.png');
		resDict['building']['barn-3'].push('building/barn/3-1.png');
		resDict['building']['barn-3'].push('building/barn/3-2.png');
		resDict['building']['barn-3-allies'] = new Array();
		resDict['building']['barn-3-allies'].push('building/barn/3-0-allies.png');
		resDict['building']['barn-3-allies'].push('building/barn/3-1-allies.png');
		resDict['building']['barn-3-allies'].push('building/barn/3-2-allies.png');
		resDict['building']['barn-3-enemy'] = new Array();
		resDict['building']['barn-3-enemy'].push('building/barn/3-0-enemy.png');
		resDict['building']['barn-3-enemy'].push('building/barn/3-1-enemy.png');
		resDict['building']['barn-3-enemy'].push('building/barn/3-2-enemy.png');
		
		resDict['building']['coldStorage'] = new Array();
		resDict['building']['coldStorage'].push('building/coldStorage/0.png');
		resDict['building']['coldStorage'].push('building/coldStorage/1.png');
		resDict['building']['coldStorage'].push('building/coldStorage/2.png');
		resDict['building']['coldStorage'].push('building/coldStorage/3.png');
		resDict['building']['coldStorage-allies'] = new Array();
		resDict['building']['coldStorage-allies'].push('building/coldStorage/0-allies.png');
		resDict['building']['coldStorage-allies'].push('building/coldStorage/1-allies.png');
		resDict['building']['coldStorage-allies'].push('building/coldStorage/2-allies.png');
		resDict['building']['coldStorage-allies'].push('building/coldStorage/3-allies.png');
		resDict['building']['coldStorage-enemy'] = new Array();
		resDict['building']['coldStorage-enemy'].push('building/coldStorage/0-enemy.png');
		resDict['building']['coldStorage-enemy'].push('building/coldStorage/1-enemy.png');
		resDict['building']['coldStorage-enemy'].push('building/coldStorage/2-enemy.png');
		resDict['building']['coldStorage-enemy'].push('building/coldStorage/3-enemy.png');
		
		resDict['building']['silo'] = 'building/silo/silo.png';
		resDict['building']['silo-allies'] = 'building/silo/silo-allies.png';
		resDict['building']['silo-enemy'] = 'building/silo/silo-enemy.png';
		
		resDict['character'] = new Array();
		resDict['character'][0] = new Array();
		resDict['character'][0].push('character/0-0.png');
		resDict['character'][0].push('character/0-1.png');
		resDict['character'][0].push('character/0-2.png');
		resDict['character'][0].push('character/0-1.png');
		resDict['character'][1] = new Array();
		resDict['character'][1].push('character/1-0.png');
		resDict['character'][1].push('character/1-1.png');
		resDict['character'][1].push('character/1-2.png');
		resDict['character'][1].push('character/1-1.png');
		resDict['character'][2] = new Array();
		resDict['character'][2].push('character/2-0.png');
		resDict['character'][2].push('character/2-1.png');
		resDict['character'][2].push('character/2-2.png');
		resDict['character'][2].push('character/2-1.png');
		resDict['character'][3] = new Array();
		resDict['character'][3].push('character/3-0.png');
		resDict['character'][3].push('character/3-1.png');
		resDict['character'][3].push('character/3-2.png');
		resDict['character'][3].push('character/3-1.png');
		resDict['character'][4] = new Array();
		resDict['character'][4].push('character/4-0.png');
		resDict['character'][4].push('character/4-1.png');
		resDict['character'][4].push('character/4-2.png');
		resDict['character'][4].push('character/4-1.png');
		resDict['character'][5] = new Array();
		resDict['character'][5].push('character/5-0.png');
		resDict['character'][5].push('character/5-1.png');
		resDict['character'][5].push('character/5-2.png');
		resDict['character'][5].push('character/5-1.png');
		resDict['character'][6] = new Array();
		resDict['character'][6].push('character/6-0.png');
		resDict['character'][6].push('character/6-1.png');
		resDict['character'][6].push('character/6-2.png');
		resDict['character'][6].push('character/6-1.png');
		resDict['character'][7] = new Array();
		resDict['character'][7].push('character/7-0.png');
		resDict['character'][7].push('character/7-1.png');
		resDict['character'][7].push('character/7-2.png');
		resDict['character'][7].push('character/7-1.png');
		
		resDict['tornado'] = new Array();
		resDict['tornado'].push('natural-event/tornado-0.png');
		resDict['tornado'].push('natural-event/tornado-1.png');
		resDict['tornado'].push('natural-event/tornado-2.png');
		resDict['tornado'].push('natural-event/tornado-3.png');
		resDict['tornado'].push('natural-event/tornado-4.png');

		// Puis on compte le nombre d'éléments à charger
		for(i in resDict) {
			if(typeof resDict[i] == 'object') {
				for(j in resDict[i]) {
					if(typeof resDict[i][j] == 'object') {
						resDictTotal += resDict[i][j].length;
					}
					else {
						resDictTotal++;
					}
				}
			}
		}
		
		// On ajoute également les bandes son
		ressource['sound'] = new Array();
		ressource['sound']['roaster'] = {file:'roaster.wav', duration:2000};
		
		// Que l'on ajoutera au nombre d'éléments à charger
		for(i in ressource['sound']) {
			soundsTotal++;
		}
		
		// Enfin, on ajoutera les images des menus
		resAdditional.push('menu/background-top.png');
		resAdditional.push('menu/background-left.png');
		resAdditional.push('menu/background-corner.png');
		resAdditional.push('menu/background.png');
		resAdditional.push('menu/logo.png');
		resAdditional.push('menu/life.png');
		resAdditional.push('menu/level.png');
		resAdditional.push('menu/money.png');
		resAdditional.push('menu/owner-vision.png');
		resAdditional.push('menu/left.png');
		resAdditional.push('menu/right.png');
		resAdditional.push('menu/sound-on.png');
		resAdditional.push('menu/sound-off.png');
		resAdditional.push('action/move.png');
		resAdditional.push('action/information.png');
		resAdditional.push('action/plant.png');
		resAdditional.push('action/building.png');
		resAdditional.push('action/alliance.png');
		resAdditional.push('action/battle.png');
		resAdditional.push('option/remove.png');
		resAdditional.push('option/harvest.png');
		resAdditional.push('option/waterize.png');
		resAdditional.push('option/fertilize.png');
		resAdditional.push('option/corn.png');
		resAdditional.push('option/tomato.png');
		resAdditional.push('option/wheat.png');
		resAdditional.push('option/silo.png');
		resAdditional.push('option/barn.png');
		resAdditional.push('option/cold-storage.png');
		resAdditional.push('option/attack.png');
		resAdditional.push('option/fork.png');
		resAdditional.push('option/baseball-bat.png');
		resAdditional.push('option/chainsaw.png');
		resAdditional.push('option/ak-47.png');
		
		// Que l'on ajoutera aussi au nombre d'éléments à charger
		for(i in resAdditional) {
			resAdditionalTotal++;
		}
	}
	
	// Nous permettra d'initialiser la barre de progression en fonction du nombre d'éléments à charger
	function initializeProgress(total) {
		progressTotal = total;
		progressInc = 100/progressTotal;
		progressVal = 0;
		progressCount = 0;
		progress.val(0);
	}
	
	// Nous permettra de charger les ressources graphiques
	function loadGraphicalRessources() {
		for(i in resDict) {
			if(typeof resDict[i] == 'object') {
				ressource[i] = new Array();
				for(j in resDict[i]) {
					if(typeof resDict[i][j] == 'object') {
						ressource[i][j] = new Array();
						for(k in resDict[i][j]) {
							ressource[i][j][k] = new Image();
							ressource[i][j][k].onerror = function() {
								$('#warning p').html('An error occured while loading ressources..<br />Please try again.');
								resDict = null;
								errorOnProgress();
							}
							ressource[i][j][k].src = imgPath+resDict[i][j][k];
							ressource[i][j][k].onload = function() {
								updateProgress();
							}
						}
					}
					else {
						ressource[i][j] = new Image();
						ressource[i][j].onerror = function() {
							$('#warning p').html('An error occured while loading ressources..<br />Please try again.');
							resDict = null;
							errorOnProgress();
						}
						ressource[i][j].src = imgPath+resDict[i][j];
						ressource[i][j].onload = function() {
							updateProgress();
						}

					}
				}
			}
		}
		
		ressource['additional'] = new Array();
		for(i in resAdditional) {
			ressource['additional'][i] = new Image();
			ressource['additional'][i].onerror = function() {
				$('#warning p').html('An error occured while loading ressources..<br />Please try again.');
				resDict = null;
				errorOnProgress();
			}
			ressource['additional'][i].src = imgPath+resAdditional[i];
			ressource['additional'][i].onload = function() {
				updateProgress();
			}
		}
	}
	
	// Nous permettra de charger les ressources sonores
	function loadSoundRessources() {
		for(i in ressource['sound']) {
			$.ajax({
				url: '/view/sound/'+ressource['sound'][i].file,
				success: function() {
					updateProgress();
				}
			});
		}
	}
	
	// On déclare notre fonction qui va mettre à jour la barre de chargement
	function updateProgress() {
		if(!progressError) {
			progressVal += progressInc;
			progress.val(progressVal);
			progressCount++;

			progressValue.html(Math.round(progressVal)+'%');

			if(progressCount==progressTotal) {
				progressValue.html('100%');
				
				// On anime l'arrivée de nos boutons
				$('#loading').fadeOut(750);
				$('header h1').animate({'margin-top': '20px'}, 500, function() {
					$(this).animate({'margin-top': '-300px'}, 750);
					$('#canvas').delay(550).fadeIn(500, function() {
						$('body').css({'background-image': 'none'});
						$('#logo').fadeIn(750);
						$('#top-bar').delay(500).animate({left: '0px'}, 1500);
						$('#action').delay(500).animate({top: '0px'}, 1500);
						$('#corner-bar').delay(1000).animate({top: '54px', left:'59px'}, 1000, function() {
							$(this).css({'z-index':2});
							$('#ownerVision').delay(250).fadeIn(750);
							$('#refocus').delay(500).fadeIn(750);
							$('#sound').delay(750).fadeIn(750);
							$('#left').delay(1000).fadeIn(750);
							$('#right').delay(1250).fadeIn(750);
							$('#option ul.current').delay(1750).show(0).animate({bottom:'-10px'}, 500);
						});
					});
				});
				
				// On peut à présent charger la map
				loadMap(true);
			}
		}
	}
	
	// Cette fonction est appelé lors d'une error de chargement
	function errorOnProgress() {
		if(!progressError) {
			progressError = true;
			$('#loading').hide(0);
			$('#warning').show(0);
		}
	}
	
	
	
	
	/************************
	*	Gestion de la map	*
	************************/
	
	
	
	function adaptSize() {
		// On récupère les dimensions de l'écran
		screenWidth = $('body').width();
		screenHeight = $('body').height();

		// On adapte la taille du canvas à la fenêtre
		canvas.attr('width', screenWidth);
		canvas.attr('height', screenHeight);
	}

	function getMapDisplayInformations() {
		// On divise les dimensions de l'écran en 2 pour obtenir le milieu
		var center = (screenWidth/2);
		var b2 = (screenHeight/2);

		var alpha = 30*Math.PI/180;

		// On calcul le décalage de l'ordonnée du point d'origine
		var y = Math.atan(alpha)*center;

		// On rajoute une marge de 1 case pour masquer les angles entre deux déplacements
		y += settings.tileWidth;

		// On obtient la moitié de la hauteur du losange
		var h = y+b2;

		// On obtient donc la profondeur du tableau
		var depth = Math.ceil(h/(settings.tileHeight/2));

		// On se doit d'obtenir une profondeur impaire pour situer précisemment la map
		if(depth%2==0) {
			depth++;
		}

		// On calcul le décalage de l'abscisse du cadrillage
		var x = (h/Math.atan(alpha))-center;
		
		mapDisplay.x = x;
		mapDisplay.y = y;
		mapDisplay.decalageX = center;
		mapDisplay.decalageY = y;
		mapDisplay.depth = depth;
	}

	function getPositionOnMap() {
		y = ((2*(mouse.y+mapDisplay.decalageY+11)-mouse.x+mapDisplay.decalageX)/2);
		x = (mouse.x+y-mapDisplay.decalageX-(settings.tileWidth/2))-7;
		y = Math.round(y/settings.tileHeight);
		x = Math.round(x/(settings.tileWidth/2))+1;

		return {'x': x, 'y': y};
	}

	function loadMap(handshake) {
		// On indique que la map est en chargement
		mapLoading = true;
		
		if(handshake==undefined) {
			var msg = 'getMap';
		}
		else {
			var msg = 'getMapHandshake';
		}

		// Puis on la récupère depuis le serveur
		socket.emit(msg, {'angle':mapDisplay.angle, 'depth_x':mapDisplay.depth, 'depth_y':mapDisplay.depth, 'x':mapDisplay.mapX, 'y':mapDisplay.mapY});
	}
	
	function turnMapLeft() {
		mapDisplay.angle = (mapDisplay.angle+1)%4;
		loadMap();
	}

	function turnMapRight() {
		mapDisplay.angle--;
		if(mapDisplay.angle==-1) {
			mapDisplay.angle = 3;
		}
		loadMap();
	}
	
	function moveMap(x, y) {
		var refreshMap = false
		// Flèche de gauche
		if(x==1) {
			mapDisplay.moveX += settings.mapSpeed;
			if(mapDisplay.moveX>=settings.tileWidth) {
				refreshMap = true;
				if(mapDisplay.angle==1) {
					mapDisplay.mapX++;
					mapDisplay.mapY++;
				}
				else if(mapDisplay.angle==2) {
					mapDisplay.mapX++;
					mapDisplay.mapY--;
				}
				else if(mapDisplay.angle==3) {
					mapDisplay.mapX--;
					mapDisplay.mapY--;
				}
				else {
					mapDisplay.mapX--;
					mapDisplay.mapY++;
				}
				
				mapDisplay.tmpMoveX += mapDisplay.moveX;
				mapDisplay.moveX = mapDisplay.moveX%settings.tileWidth;
			}
		}
		// Flèche de droite
		else if(x==-1) {
			mapDisplay.moveX -= settings.mapSpeed;
			if(mapDisplay.moveX<=(0-settings.tileWidth)) {
				refreshMap = true;
				if(mapDisplay.angle==1) {
					mapDisplay.mapX--;
					mapDisplay.mapY--;
				}
				else if(mapDisplay.angle==2) {
					mapDisplay.mapX--;
					mapDisplay.mapY++;
				}
				else if(mapDisplay.angle==3) {
					mapDisplay.mapX++;
					mapDisplay.mapY++;
				}
				else {
					mapDisplay.mapX++;
					mapDisplay.mapY--;
				}
				
				mapDisplay.tmpMoveX += mapDisplay.moveX;
				mapDisplay.moveX = mapDisplay.moveX%(0-settings.tileWidth);
			}
		}
		// Flèche du haut
		else if(y==1) {
			mapDisplay.moveY -= settings.mapSpeed;
			if(mapDisplay.moveY<=(0-settings.tileHeight)) {
				refreshMap = true;
				if(mapDisplay.angle==1) {
					mapDisplay.mapX++;
					mapDisplay.mapY--;
				}
				else if(mapDisplay.angle==2) {
					mapDisplay.mapX--;
					mapDisplay.mapY--;
				}
				else if(mapDisplay.angle==3) {
					mapDisplay.mapX--;
					mapDisplay.mapY++;
				}
				else {
					mapDisplay.mapX++;
					mapDisplay.mapY++;
				}
				
				mapDisplay.tmpMoveY += mapDisplay.moveY;
				mapDisplay.moveY = mapDisplay.moveY%(0-settings.tileHeight);
			}
		}
		// Flèche du bas
		else if(y==-1) {
			mapDisplay.moveY += settings.mapSpeed;
			if(mapDisplay.moveY>=settings.tileHeight) {
				refreshMap = true;
				if(mapDisplay.angle==1) {
					mapDisplay.mapX--;
					mapDisplay.mapY++;
				}
				else if(mapDisplay.angle==2) {
					mapDisplay.mapX++;
					mapDisplay.mapY++;
				}
				else if(mapDisplay.angle==3) {
					mapDisplay.mapX++;
					mapDisplay.mapY--;
				}
				else {
					mapDisplay.mapX--;
					mapDisplay.mapY--;
				}
				
				mapDisplay.tmpMoveY += mapDisplay.moveY;
				mapDisplay.moveY = mapDisplay.moveY%settings.tileHeight;
			}
		}
		
		// On recharge si besoin est la map
		if(refreshMap && !mapLoading) {
			socket.emit('updateMapPosition', {'x':mapDisplay.mapX, 'y':mapDisplay.mapY});
			loadMap();
		}
		else if(!mapLoading) {
			// On redessine simplement la map
			draw();
		}
		
	}
	
	function applyOwnerVision(type, ownership) {
		if(!ownerVision || ownership==undefined || ownership==null || ownership=='own') {
			return type;
		}
		
		return type+'-'+ownership;
	}
	
	function draw() {
		if(mapRended && !mapLoading && !mapRendering) {
			mapRendering = true;
			ctx.clearRect(0, 0, screenWidth, screenHeight);
			
			// On applique un décalage local de la map pour compenser la latence de rafraichissement de cette dernière
			if(mapDisplay.tmpMoveX!=0) {
				var moveX = mapDisplay.tmpMoveX;
			}
			else {
				var moveX = mapDisplay.moveX;
			}
			
			if(mapDisplay.tmpMoveY!=0) {
				var moveY = mapDisplay.tmpMoveY;
			}
			else {
				var moveY = mapDisplay.moveY;
			}
			
			// On dessine le sol
			for(i=0; i<mapDisplay.depth; i++) {
				for(j=0; j<mapDisplay.depth; j++) {
					if(map[i]==undefined || map[i][j]==undefined) {
						return;
					}

					var xpos = (i-j-1)*settings.tileWidth/2 + mapDisplay.decalageX + moveX;
					var ypos = (i+j-1)*settings.tileHeight/2 - mapDisplay.decalageY + moveY;
					
					if(map[i][j].element.type=='water') {
						ctx.drawImage(ressource['tile'][applyOwnerVision('water', map[i][j].ownership)], xpos+map[i][j].element.drawX, ypos+map[i][j].element.drawY);
					}
					else {
						ctx.drawImage(ressource['tile'][applyOwnerVision('ground', map[i][j].ownership)], xpos, ypos-6);
					}
				}
			}

			// Puis on dessine les éléments en relief
			for(i=0; i<mapDisplay.depth; i++) {
				for(j=0; j<mapDisplay.depth; j++) {
					if(map[i]==undefined || map[i][j]==undefined) {
						return;
					}

					var xpos = (i-j-1)*settings.tileWidth/2 + mapDisplay.decalageX + moveX;
					var ypos = (i+j-1)*settings.tileHeight/2 - mapDisplay.decalageY + moveY;
					
					
					// On vérifie si l'on doit afficher les dimensions d'un éventuel bâtiment
					if(actionSelected=='building' && (optionSelected=='silo' || optionSelected=='barn' || optionSelected=='coldStorage') 
					&& i>=mouse.hoverX-(((mapDisplay.angle%2==0)?buildingSize[optionSelected].width:buildingSize[optionSelected].height)-1) && i<=mouse.hoverX 
					&& j>=mouse.hoverY-(((mapDisplay.angle%2==0)?buildingSize[optionSelected].height:buildingSize[optionSelected].width)-1) && j<=mouse.hoverY) {
						if(map[i][j].element.type=='ground' && map[i][j].ownership=='own') {
							ctx.drawImage(ressource['tile']['ground-hover-ok'], xpos, ypos-6);
						}
						else {
							ctx.drawImage(ressource['tile']['ground-hover-bad'], xpos, ypos-6);
						}
					}
					else if(highlightedTile!=null && map[i][j].element.id_building!=undefined && map[i][j].element.id_building==highlightedTile) {
						ctx.drawImage(ressource['tile']['ground-hover-bad'], xpos, ypos-6);
					}
					

					// On dessine l'élément
					if(map[i][j].element.type=='corn' || map[i][j].element.type=='tomato' || map[i][j].element.type=='wheat') {
						ctx.drawImage(ressource['tile'][applyOwnerVision(map[i][j].element.type, map[i][j].ownership)][map[i][j].element.level], xpos+map[i][j].element.drawX, ypos+map[i][j].element.drawY);
					}
					else if(mapDisplay.angle%2==1 && map[i][j].element.type=='barn-part-1') {
						ctx.drawImage(ressource['building'][applyOwnerVision('barn-'+mapDisplay.angle, map[i][j].ownership)][0], xpos+map[i][j].element.drawX0, ypos+map[i][j].element.drawY0);
					}
					else if(mapDisplay.angle%2==1 && map[i][j].element.type=='barn-part-3') {
						ctx.drawImage(ressource['building'][applyOwnerVision('barn-'+mapDisplay.angle, map[i][j].ownership)][1], xpos+map[i][j].element.drawX1, ypos+map[i][j].element.drawY1);
					}
					else if(mapDisplay.angle%2==1 && map[i][j].element.type=='barn-part-5') {
						ctx.drawImage(ressource['building'][applyOwnerVision('barn-'+mapDisplay.angle, map[i][j].ownership)][2], xpos+map[i][j].element.drawX2, ypos+map[i][j].element.drawY2);
					}
					else if(mapDisplay.angle%2==0 && map[i][j].element.type=='barn-part-5') {
						ctx.drawImage(ressource['building'][applyOwnerVision('barn-'+mapDisplay.angle, map[i][j].ownership)], xpos+map[i][j].element.drawX, ypos+map[i][j].element.drawY);
					}
					else if(map[i][j].element.type=='coldStorage-part-3') {
						ctx.drawImage(ressource['building'][applyOwnerVision('coldStorage', map[i][j].ownership)][mapDisplay.angle], xpos+map[i][j].element.drawX, ypos+map[i][j].element.drawY);
					}
					else if(map[i][j].element.type=='silo') {
						ctx.drawImage(ressource['building'][applyOwnerVision('silo', map[i][j].ownership)], xpos+map[i][j].element.drawX, ypos+map[i][j].element.drawY);
					}

					// On vérifie si l'on doit également dessiner le personnage
					drawCharacter(characterDisplay, map[i][j], xpos, ypos, false);
					
					// Enfin, on affiche d'éventuels autres personnages
					for(o in otherCharacterDisplay) {
						drawCharacter(otherCharacterDisplay[o], map[i][j], xpos, ypos, true);
					}
					
					// On affiche éventuellement des évènements naturels
					if(tornado!=null && tornado.x==map[i][j].mapX && tornado.y==map[i][j].mapY) {
						ctx.drawImage(ressource['tornado'][tornado.sprite], xpos-70+tornado.shift_x, ypos-246+tornado.shift_y);
					}
				}
			}


			// On applique la luminosité ambiante dûe à l'heure
			//ctx.fillStyle = 'rgba(0, 0, 0, '+brightness+')';
			//ctx.fillRect (0, 0, screenWidth, screenHeight);
		}
		mapRendering = false;
	}
	
	function drawCharacter(display, tile, xpos, ypos, showEmail) {
		if((mapDisplay.angle==0 && display.x==tile.mapX-1 && display.y==tile.mapY)
		|| (mapDisplay.angle==1 && display.x==tile.mapX && display.y==tile.mapY+1)
		|| (mapDisplay.angle==2 && display.x==tile.mapX+1 && display.y==tile.mapY)
		|| (mapDisplay.angle==3 && display.x==tile.mapX && display.y==tile.mapY-1)) {
			ctx.drawImage(ressource['character'][display.angle][display.leg], xpos-12+display.shift_x, ypos-50+display.shift_y);
			
			if(showEmail==true && display.email!=undefined) {
				ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
				ctx.fillText(display.email, xpos-12+display.shift_x-(display.email.length*1.7), ypos-50+display.shift_y-10);
			}
		}
	}
	
	
	
	
	/****************************
	*	Gestion du personnage	*
	****************************/
	
	
	
	function turnCharacterLeft() {
		characterDisplay.angle -= 2;
		if(characterDisplay.angle<0) {
			characterDisplay.angle = 8+characterDisplay.angle;
		}
	}
	
	function turnCharacterRight() {
		characterDisplay.angle = (characterDisplay.angle+2)%8;
	}
	
	function moveCharacterTo(x, y) {
		// On va récupérer le chemin que ce dernier doit parcourir
		socket.emit('moveCharacter', {'map_x':x, 'map_y':y});
	}
	
	function moveCharacterFor(x, y) {
		// On va récupérer le chemin que ce dernier doit parcourir pour effectuer une action
		socket.emit('moveCharacter', {'map_x':x, 'map_y':y, 'action':true});
	}
	
	function keepPerspective(display, other) {
		// On modifie éventuellement et localement les propriétés du personnage pour conserver une cohérence de perspective
		
		if(display.shift_y<0 && display.shift_x!=0) {
			if(display.shift_x<0) {
				switch(mapDisplay.angle) {
					case 0:
						display.x--;
						break;
					case 1:
						display.y++;
						break;
					case 2:
						display.x++;
						break;
					case 3:
						display.y--;
						break;
				}
				
				display.shift_x = (settings.tileWidth*0.5)+display.shift_x;
				display.shift_y = (settings.tileHeight*0.5)+display.shift_y;
			}
			else {
				switch(mapDisplay.angle) {
					case 0:
						display.y--;
						break;
					case 1:
						display.x--;
						break;
					case 2:
						display.y++;
						break;
					case 3:
						display.x++;
						break;
				}
				
				display.shift_x = display.shift_x-(settings.tileWidth*0.5);
				display.shift_y = (settings.tileHeight*0.5)+display.shift_y;
			}
		}
		else if(display.shift_y==0 && display.shift_x!=0) {
			if(display.shift_x<0) {
				switch(mapDisplay.angle) {
					case 0:
						display.x--;
						display.y++;
						break;
					case 1:
						display.x++;
						display.y++;
						break;
					case 2:
						display.x++;
						display.y--;
						break;
					case 3:
						display.x--;
						display.y--;
						break;
				}
				
				display.shift_x = settings.tileWidth+display.shift_x;
			}
			else {
				switch(mapDisplay.angle) {
					case 0:
						display.x++;
						display.y--;
						break;
					case 1:
						display.x--;
						display.y--;
						break;
					case 2:
						display.x--;
						display.y++;
						break;
					case 3:
						display.x++;
						display.y++;
						break;
				}
				
				display.shift_x = display.shift_x-settings.tileWidth;
			}
		}
		
		
		return display;
	}
	
	
	
	
	/************************
	*	Gestion des sockets	*
	*************************/
	

	
	socket.on('error', function(data) {
		if(data.error!=undefined) {
			showNotification(data.error, (data.type!=undefined)?data.type:'error');
		}
		// Si c'est un problème de session, on demande une re-connection
		else if(data.invalidSession!=undefined) {
			document.location.href='/logout';
		}
	});
	
	socket.on('getMapAnswer', function (data) {
		if(data.error==undefined) {
			map = data.map;
			mapLoading = false;
			mapRended = true;
			
			if(!focusOnCharacter && mapDisplay.tmpMoveX!=0) {
				mapDisplay.tmpMoveX = 0;
			}
			if(!focusOnCharacter && mapDisplay.tmpMoveY!=0) {
				mapDisplay.tmpMoveY = 0;
			}
			
			if(focusOnCharacter && mapDisplay.focusTmpMoveX!=0) {
				mapDisplay.tmpMoveX = 0;
			}
			if(focusOnCharacter && mapDisplay.focusTmpMoveY!=0) {
				mapDisplay.tmpMoveY = 0;
			}

			// On redessine la map
			draw();
		}
		else {
			showNotification(data.error, 'error');
			mapLoading = false;
			mapRended = true;
		}
	});
	
	socket.on('getPositionAnswer', function (data) {
		if(data.error!=undefined || data.map_x==undefined || data.map_y==undefined || data.user_x==undefined || data.user_y==undefined || data.angle==undefined) {
			$('#warning p').html('An error occured while retrieving positions..<br />Please try again.');
			errorOnProgress();
		}
		else {
			characterDisplay.x = data.user_x;
			characterDisplay.y = data.user_y;
			characterDisplay.leg = 1;
			characterDisplay.angle = 0;
			characterDisplay.shift_x = 0;
			characterDisplay.shift_y = 0;
			
			mapDisplay.mapX = data.map_x;
			mapDisplay.mapY = data.map_y;
			mapDisplay.angle = data.angle;
			
			updateProgress();
		}
	});
	
	socket.on('getInformationsAnswer', function (data) {
		if(data.error!=undefined || data.life_max==undefined || data.life==undefined || data.money==undefined || data.level==undefined) {
			$('#warning p').html('An error occured while retrieving informations..<br />Please try again.');
			errorOnProgress();
		}
		else {
			informations = data;
			
			life.attr('max', data.life_max);
			life.val(data.life);
			lifePoints.html(data.life);
			level.html(data.level);
			money.html(data.money);
			
			updateProgress();
		}
	});
	
	socket.on('getDisplaySettingsAnswer', function (data) {
		if(data.error!=undefined || data.tileWidth==undefined || data.tileHeight==undefined || data.mapSpeed==undefined) {
			$('#warning p').html('An error occured while retrieving settings..<br />Please try again.');
			errorOnProgress();
		}
		else {
			settings = data;
			updateProgress();
			
			// On calcule les dimmensions de la map à charger
			getMapDisplayInformations();
		}
	});
	
	socket.on('refreshCharacterDisplay', function(data) {
		characterDisplay = data.user;
		
		if(focusOnCharacter) {
			var refresh = true;
			
			if(mapDisplay.mapX!=characterDisplay.x) {
				refresh = false;
			}
			if(mapDisplay.mapY!=characterDisplay.y) {
				refresh = false;
			}
			
			mapDisplay.mapX = characterDisplay.x;
			mapDisplay.mapY = characterDisplay.y;
			mapDisplay.moveX = 0;
			mapDisplay.moveY = 0;
			mapDisplay.tmpMoveX = -1*characterDisplay.shift_x;
			mapDisplay.tmpMoveY = -1*characterDisplay.shift_y;
			
			if(mapDisplay.tmpMoveX==0 && mapDisplay.tmpMoveY==0) {
				if(!mapLoading) {
					loadMap();
					socket.emit('updateMapPosition', {'x':mapDisplay.mapX, 'y':mapDisplay.mapY});
				}
			}
			else if(refresh) {
				characterDisplay = keepPerspective(characterDisplay);
				draw();
			}
		}
		else {
			characterDisplay = keepPerspective(characterDisplay);
			draw();
		}
	});
	
	socket.on('refreshOtherCharactersDisplay', function(data) {
		otherCharacterDisplay[data.user_id] = keepPerspective(data.infos);
		otherCharacterDisplay[data.user_id].email = data.email;
		if(!mapLoading && !mapRendering) {
			draw();
		}
	});
	
	socket.on('moveCharacterForAnswer', function(data) {
		// Le personnage vient de terminer de se déplacer pour effectuer une action
		if(data.x==undefined || data.y==undefined) {
			return;
		}
		
		switch(actionSelected) {
			case 'plant':
				switch(optionSelected) {
					case 'remove':
						socket.emit('plantRemove', {'x':data.x, 'y':data.y});
						break;
					case 'harvest':
						socket.emit('plantHarvest', {'x':data.x, 'y':data.y});
						break;
					case 'waterize':
						socket.emit('plantWaterize', {'x':data.x, 'y':data.y});
						break;
					case 'fertilize':
						socket.emit('plantFertilize', {'x':data.x, 'y':data.y});
						break;
					case 'corn':
					case 'tomato':
					case 'wheat':
						socket.emit('plantAdd', {'x':data.x, 'y':data.y, 'type':optionSelected});
						break;
				}
				break;
			case 'battle':
				socket.emit('getAttackableTileAmount');
				break;
		}
	});
	
	socket.on('updateTime', function (data) {
		if(data.hour!=undefined || data.minute!=undefined) {
			time = data;
			if(timeInterval==null) {
				timeInterval = setInterval(updateTime, 1000);
				updateProgress();
			}
		}
		else if(timeInterval==null) {
			$('#warning p').html('An error occured while retrieving environment time..<br />Please try again.');
			errorOnProgress();
		}
	});
	
	socket.on('characterDisconnected', function(data) {
		if(otherCharacterDisplay[data.user_id]!=undefined) {
			otherCharacterDisplay.splice(data.user_id, 1);
			if(!mapRendering) {
				draw();
			}
		}
	});
	
	socket.on('getBuildingSizeAnswer', function(data) {
		buildingSize = data;
		updateProgress();
	});
	
	socket.on('buildingAddAnswer', function(data) {
		if(data.error!=undefined) {
			showNotification(data.error, 'building');
		}
	})
	
	socket.on('refreshMarketPrices', function(data) {
		marketPrice = data;
		
		if(harvestingData!=null) {
			$('#cropMarketPrice').html(marketPrice[harvestingData.type]);
		}
	});
	
	socket.on('getPricesAnswer', function(data) {
		if(data.error!=undefined) {
			$('#warning p').html('An error occured while retrieving prices..<br />Please try again.');
			errorOnProgress();
		}
		else {
			updateProgress();
			
			$('#option li a').each(function() {
				for(i in data) {
					if($(this).attr('data-name')==i && (ownedWeapon[i]==undefined || ownedWeapon[i]==false)) {
						$(this).attr('data-price', data[i]);
						break;
					}
				}
			});
		}
	});
	
	socket.on('getOwnedWeaponAnswer', function(data) {
		if(data.error!=undefined) {
			$('#warning p').html('An error occured while retrieving owned weapons..<br />Please try again.');
			errorOnProgress();
		}
		else {
			ownedWeapon = data;
			updateProgress();
			
			// On récupère les prix des items
			socket.emit('getPrices');
		}
	});
	
	socket.on('tornado', function(data) {
		if(data.stop!=undefined) {
			tornado = null;
		}
		else {
			tornado = data;
		}
		draw();
	});
	
	socket.on('harvestQuestion', function(data) {
		marketCropAmount = data.amount;
		buildingAvailability = data.building;
		harvestingData = {};
		harvestingData.type = data.type;
		harvestingData.x = data.x;
		harvestingData.y = data.y;
		
		distributeAvailability();
		$('#cropProductivity').html(marketCropAmount);
		if(marketPrice!=null) {
			$('#cropMarketPrice').html(marketPrice[harvestingData.type]);
		}
		
		showModal('harvestQuestion');
	});
	
	socket.on('cropDistributed', function() {
		hideModal();
		
		$('#marketAmount').html(0);
		$('#siloAmount').html(0);
		$('#barnAmount').html(0);
		$('#coldStorageAmount').html(0);
	})
	
	socket.on('getTileInformationsAnswer', function(data) {
		showInformations(data);
	});
	
	
	
	/********************************************
	*	Gestion des menus actions et options	*
	********************************************/
	
	
	
	$('#action').on('click', 'li a', function() {
		// On récupère l'action choisie et on affiche si besoin est les options correspondantes
		if(actionSelected!=$(this).attr('id')) {
			var changed = true;
		}
		else {
			var changed = false;
		}
		
		if(actionSelected=='information' && changed) {
			informationsPanel.animate({opacity: 0, 'margin-bottom':'-35px'}, 1000);
		}
		
		actionSelected = $(this).attr('id');
		optionSelected = null;
		
		if(changed) {
			highlightedTile = null;
			if($('#option ul.current').length==0) {
				$('#option ul#'+actionSelected+'Options').addClass('current').show(0);
				$('#option ul.current').animate({bottom:'-10px'}, 500);
			}
			else {
				$('#option ul.current').animate({bottom:0}, 250, function() {
					$('#option ul.current').animate({bottom:'-94px'}, 500, function() {
						$('#option ul.current').removeClass('current').hide(0);
						$('#option ul#'+actionSelected+'Options').addClass('current').show(0);
						$('#option ul.current').animate({bottom:'-10px'}, 500);
					});
				});
			}
			draw();
		}
		
		// On vérifie si l'on doit effectuer directement quelque chose
		if(actionSelected=='alliance') {
			// TODO: UI Alliances
		}
		else if(actionSelected==undefined) {
			window.location('/logout');
		}
		
		return false;
	})
	
	$('#option').on('click', 'li a', function() {
		// On vérifie si l'on arrête d'utiliser certaines options
		if(actionSelected=='building' && optionSelected=='remove') {
			highlightedTile = null;
		}
		
		// On récupère l'option choisie
		optionSelected = $(this).attr('data-name');
		
		// On vérifie si l'on doit effectuer directement quelque chose
		if(actionSelected=='battle' && (optionSelected=='baseballBat' || optionSelected=='chainsaw' || optionSelected=='ak47')) {
			// TODO: vérifier si l'on possède cette arme
		}
		
		return false;
	})
	.on('mouseenter', 'li a ', function() {
		if($(this).attr('data-price')!=undefined) {
			optionDesc.html($(this).attr('data-desc')+' ($'+$(this).attr('data-price')+')');
		}
		else {
			optionDesc.html($(this).attr('data-desc'));
		}
		optionDesc.parent().stop().animate({opacity:1}, 300);
	})
	.on('mouseleave', 'li a ', function() {
		optionDesc.parent().stop().animate({opacity:0}, 300);
	});
	
	
	
	
	/****************************************
	*	Gestion des entrées utilisateurs	*
	****************************************/
	
	
	
	// L'utilisateur souhaite faire une rotation de la map à gauche
	$('#left').click(function() {
		if(mapRended) {
			turnCharacterLeft();
			turnMapLeft();
			socket.emit('updateAngle', {'angle':mapDisplay.angle});
		}
		return false;
	});
	
	// L'utilisateur souhaite faire une rotation de la map à droite
	$('#right').click(function() {
		if(mapRended) {
			turnCharacterRight();
			turnMapRight();
			socket.emit('updateAngle', {'angle':mapDisplay.angle});
		}
		return false;
	});
	
	// L'utilisateur souhaite (dés)activer le focus sur le personnage
	$('#refocus').click(function() {
		if(!focusOnCharacter) {
			focusOnCharacter = true;
			
			mapDisplay.mapX = characterDisplay.x;
			mapDisplay.mapY = characterDisplay.y;
			mapDisplay.moveX = 0;
			mapDisplay.moveY = 0;
			mapDisplay.tmpMoveX = 0;
			mapDisplay.tmpMoveY = 0;
			
			loadMap();
			socket.emit('updateMapPosition', {'x':mapDisplay.mapX, 'y':mapDisplay.mapY});
			
			draw();
		}
		else {
			focusOnCharacter = false;
		}
		
		return false;
	});
	
	// L'utilisateur souhaite changer la vision pour afficher/masquer les propriétés
	$('#ownerVision').click(function() {
		if(!ownerVision) {
			ownerVision = true;
		}
		else {
			ownerVision = false;
		}
		
		draw();
		
		return false;
	});
	
	// Lorsque l'utilisateur appuis sur une touche clavier
	$(window).keydown(function(e) {
		if(mapRended) {
			if(e.keyCode==37) {
				moveMap(1, 0);
			}
			else if(e.keyCode==38) {
				moveMap(0, -1);
			}
			else if(e.keyCode==39) {
				moveMap(-1, 0);
			}
			else if(e.keyCode==40) {
				moveMap(0, 1);
			}
		}
	});
	
	// L'utilisateur a cliqué sur la map
	canvas.click(function() {
		if(mapRended) {
			var pos = getPositionOnMap();
			
			waitForFinalEvent(function(){
				// On agira suivant l'action sélectionnée
				if(actionSelected=='move') {
					moveCharacterTo(map[pos.x][pos.y].mapX, map[pos.x][pos.y].mapY);
				}
				else if(actionSelected=='information') {
					socket.emit('getTileInformations', {'x':map[pos.x][pos.y].mapX, 'y':map[pos.x][pos.y].mapY});
				}
				else if(actionSelected=='building' && optionSelected=='remove') {
					socket.emit('buildingRemove', {'x':map[pos.x][pos.y].mapX, 'y':map[pos.x][pos.y].mapY});
				}
				else if(actionSelected=='building' && (optionSelected=='remove' || optionSelected=='silo' || optionSelected=='barn' || optionSelected=='coldStorage')) {
					socket.emit('buildingAdd', {'x':map[pos.x][pos.y].mapX, 'y':map[pos.x][pos.y].mapY, 'type':optionSelected});
				}
				else if((actionSelected=='plant' 
						&& (optionSelected=='remove' 
							|| optionSelected=='harvest' 
							|| optionSelected=='waterize' 
							|| optionSelected=='fertilize' 
							|| optionSelected=='corn' 
							|| optionSelected=='tomato' 
							|| optionSelected=='wheat'))
						|| (actionSelected=='battle' 
						&& optionSelected=='attack')) {
					moveCharacterFor(map[pos.x][pos.y].mapX, map[pos.x][pos.y].mapY);
				}
				else {
					showNotification('Please select a proper option to perform', 'error');
				}
			}, 200, 'clickOnCanvas');
		}
	});
	
	// L'utilisateur déplace sa souris sur la map
	canvas.mousemove(function(e) {
		if(mapRended) {
			mouse.x = e.pageX;
			mouse.y = e.pageY;

			// On modifie les coordonnées de la sourie en fonction du déplacement effectué sur la map
			mouse.x -= mapDisplay.moveX;
			mouse.y -= mapDisplay.moveY;

			// On récupère la position sur la map
			position = getPositionOnMap();
			
			if(actionSelected=='building' && optionSelected=='remove') {
				if(map[x][y].element.type.match(/^(silo|barn|coldStorage)(-part-(0|1|2|3|4|5))?$/)) {
					highlightedTile = map[x][y].element.id_building;
				}
				else {
					highlightedTile = null;
				}
			}

			mouse.hoverX = position.x;
			mouse.hoverY = position.y;
			
			if(actionSelected=='building' && optionSelected!=null && !mapLoading && !mapRendering) {
				draw();
			}
		}
	});
	
	// L'utilisateur a redimmensionné la fenêtre
	$(window).resize(function() {
		waitForFinalEvent(function(){
			if(mapRended) {
				// On re-adapte le canvas à la taille de la fenêtre
				adaptSize();

				// On re-calcule la taille de la map à charger
				getMapDisplayInformations();

				// Puis on la recharge
				loadMap();
			}
		}, 500, 'refresh');
	});
	
	
	
	
	/************************
	*	Gestion des sons	*
	************************/
	
	
	
	function playSound(name) {
		// On vérifie que l'on a pas désactiver les sons
		if(!mute) {
			$('<audio class="'+name+'" src="/view/sound/'+ressource['sound'][name].file+'" preload="auto" autoplay="true"></audio>').appendTo($('footer'));
			setTimeout(function(){removeSound(name);}, ressource['sound'][name].duration);
		}
	}
	
	function removeSound(name) {
		// On supprime un élément audio précédemment joué
		$('footer audio.'+name).first().remove();
	}
	
	$('#sound').click(function() {
		if(!mute) {
			mute = true;
			$('#sound img').attr('src', soundRes.off).attr('title', 'Un-mute sounds');
		}
		else {
			mute = false;
			$('#sound img').attr('src', soundRes.on).attr('title', 'Mute sounds');
		}
		return false;
	})
	
	
	
	
	/****************************
	*	Gestion du harvesting	*
	****************************/
	
	
	
	// Lorsque l'utilisateur augmente ou diminue le nombre
	$('.arrows').on('click', 'a', function() {
		var link = $(this).parent().attr('data-link');
		if($(this).hasClass('more')) {
			if(canStore(link) && cropLeft()) {
				$('#'+link+"Amount").html(parseInt($('#'+link+"Amount").html())+1);
			}
		}
		else if(parseInt($('#'+link+"Amount").html())>0) {
			$('#'+link+"Amount").html(parseInt($('#'+link+"Amount").html())-1);
		}
		
		return false;
	});
	
	// Lorsque l'utilisateur confirme
	$('#submitHarvestQuestion').click(function() {
		if(cropLeft()) {
			showNotification('Please spare all the crops to proceed', 'error');
		}
		else {
			// On récupère les données saisies
			var data = {};
			data.distribution = {};
			data.distribution.market = parseInt($('#marketAmount').html());
			data.distribution.silo = parseInt($('#siloAmount').html());
			data.distribution.barn = parseInt($('#barnAmount').html());
			data.distribution.coldStorage = parseInt($('#coldStorageAmount').html());
			data.x = harvestingData.x;
			data.y = harvestingData.y;
			
			socket.emit('plantHarvestDistribution', data);
		}
		
		return false;
	});
	
	// Lorsque l'utilisateur annule
	$('#cancelHarvestQuestion').click(function() {
		hideModal();
		
		$('#marketAmount').html(0);
		$('#siloAmount').html(0);
		$('#barnAmount').html(0);
		$('#coldStorageAmount').html(0);
	})
	
	// On vérifie s'il reste des crops à placer
	function cropLeft() {
		return parseInt($('#marketAmount').html())+parseInt($('#siloAmount').html())+parseInt($('#barnAmount').html())+parseInt($('#coldStorageAmount').html())<marketCropAmount
	}
	
	// On vérifie si l'on pourra placer des éléments dans un type de building
	function canStore(type) {
		return (type=='market' || (buildingAvailability[type]!=null 
			&& buildingAvailability[type]-parseInt($('#'+type+"Amount").html()))>0);
	}
	
	// On affiche les disponibilité des différents bâtiments
	function distributeAvailability() {
		$('.availability').each(function() {
			var link = $(this).prev().attr('data-link');
			if(canStore(link)) {
				$('#'+link+'Availability').html(buildingAvailability[link]);
			}
			else {
				$('#'+link+'Availability').html('no');
			}
		});
	}
	
	
	
	
	/************
	*	Divers	*
	************/
	
	
	
	var waitForFinalEvent = (function () {
		var timers = {};
		return function (callback, ms, uniqueId) {
			if (!uniqueId) {
				uniqueId = 'World of Farmcraft';
			}
			if (timers[uniqueId]) {
				clearTimeout (timers[uniqueId]);
			}
			timers[uniqueId] = setTimeout(callback, ms);
		};
	})();
	
	function showInformations(data) {
		
		if(data.type=='coldStorage') {
			var type = 'Cold Storage';
		}
		else {
			var type = data.type.replace(/\b./g, function (f) {return f.toUpperCase()});
		}
		
		var infoData = '<li><span>Type:</span> '+type+'</li>';
		
		infoData += '<li><span>Fertility:</span> '+Math.ceil(data.fertility*100)+' %</li>';
		infoData += '<li><span>Humidity:</span> '+Math.ceil(data.humidity*100)+' %</li>';
		infoData += '<li><span>Health:</span> '+data.health+' %</li>';
		infoData += '<li><span>Maturity:</span> '+data.maturity+' %</li>';
		
		informationsPanel.html(infoData);
		
		if(informationsPanel.css('opacity')!=1) {
			informationsPanel.css({'margin-bottom':'-20px'}).animate({opacity: 1, 'margin-bottom': '10px'}, 500);
		}
	}
	
	function showNotification(msg, type, fixed) {
		if(type!=undefined) {
			var type = ' class="'+type+'"';
		}
		else {
			var type = '';
		}
		
		var content = '<li'+type+'>'+msg;
		if(fixed!=undefined) {
			content += '<a href="#" class="dismiss-notification">x</a>';
		}
		content += '</li>';
		
		notification.prepend(content);
		notification.find(':first-child').css({'margin-bottom':'-20px'}).animate({opacity: 1, 'margin-bottom': '10px'}, 500, function() {
			if(fixed==undefined) {
				$(this).animate({opacity: 1}, 10000, function() {
					dismissNotification(this);
				});
			}
			else {
				$(this).find('a.dismiss-notification').click(function() {
					dismissNotification($(this).parent());
				})
			}
		});
	}
	
	function dismissNotification(element) {
		$(element).animate({opacity: 0, 'margin-bottom':'-35px'}, 1000, function() {
			$(this).remove();
		});
	}
	
	function updateTime() {
		// On met à jour l'heure
		time.minute++;
		
		// On vérifie si l'on a dépassé une heure
		if(time.minute%60==0) {
			time.minute = 0;
			time.hour++;

			if(time.hour%24==0) {
				time.hour = 0;
			}
		}
		
		// S'il est 6h30 du matin, le coq chantera
		if(time.hour==5 && time.minute==45) {
			 playSound('roaster');
		}
		
		// On vérifie si l'on doit modifier la luminosité
		adjustBrightness();
		
		// On affiche l'heure
		renderTime();
	}
	
	function renderTime() {
		// On formatte l'affichage de l'heure
		if(time.hour<10) {
			show_hour = '0'+time.hour;
		}
		else {
			show_hour = time.hour;
		}
		
		if(time.minute<10) {
			show_minute = '0'+time.minute;
		}
		else {
			show_minute = time.minute;
		}
		
		// Puis on l'affiche, ici pour le debug
		daytime.text(show_hour+':'+show_minute);
	}
	
	function adjustBrightness() {
		// On ajuste la luminosité en fonction de l'heure
		
		if((time.hour>=0 && time.hour<4) || time.hour>=22) {
			// nuit
			if(brightness!=0.8) {
				brightness = 0.8;
				draw();
			}
		}
		else if(time.hour>=4 && time.hour<6) {
			// aube
			brightness = 0.8-(((time.hour-4)*60+time.minute)*0.006666667);
			draw();
		}
		else if(time.hour>=20 && time.hour<22) {
			// couché de soleil
			brightness = ((time.hour-20)*60+time.minute)*0.006666667;
			draw();
		}
		else if(brightness!=0) {
			// jour
			brightness = 0;
			draw();
		}
	}
	
	function showModal(element) {
		$('#shadow').fadeIn(500);
		$('#'+element).fadeIn(500);
	}
	
	function hideModal() {
		$('#shadow').fadeOut(500);
	}
	
	
	
	
});