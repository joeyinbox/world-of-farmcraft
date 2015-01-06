var db = require('./db');
var infos = require('./infos');
var globalSettings = require('./settings');
var broadcast = require('./broadcast');

var timer;

function init() {
	// On va lancer notre timer qui se chargera de faire fluctuer les prix des plantes
	updateTimer();
}

function buy(socket, user_id, cost) {
	// On procède à la transaction
	connection = db.getConnection();
	connection.query('UPDATE wof_user SET money=money-'+cost+' WHERE id_user='+user_id, function(error, rows, fields) {
		if(error) {
			console.log('Database error for '+user_id+' while buying '+cost);
			console.log(error);
			return;
		}
		else {
			// On met à jour les informations locales
			infos.decreaseMoney(socket, user_id, cost);
		}
	});
}

function sell(socket, user_id, price) {
	// On procède à la transaction
	connection = db.getConnection();
	connection.query('UPDATE wof_user SET money=money+'+price+' WHERE id_user='+user_id, function(error, rows, fields) {
		if(error) {
			console.log('Database error for '+user_id+' while selling '+price);
			console.log(error);
			return;
		}
		else {
			// On met à jour les informations locales
			infos.increaseMoney(socket, user_id, price);
		}
	});
}

function updateTimer() {
	// On executera la mise à jour des prix dans un interval de temps inférieur à 2 minute
	timer = setTimeout(updateMarketPrices, Math.floor(Math.random()*10000000000)%180000);
}

function updateMarketPrices() {
	// On récupère les prix actuels du marché
	var market = globalSettings.getMarketPricesData();
	
	for(i in market) {
		var diff = Math.floor(Math.random()*1337)%5;
		if(Math.floor(Math.random()*100)%2==1) {
			diff *= -1;
		}
		
		if(market[i]+diff<=0) {
			diff *= -1;
		}
		var price = market[i]+diff;
		
		globalSettings.setTileMarketPrice(i, price);
		
		// Puis on met à jour la base
		connection = db.getConnection();
		connection.query('UPDATE wof_market SET price='+price+' WHERE type='+i, function(error, rows, fields) {
			if(error) {
				console.log('Database error on updating tile '+i+' market price');
				console.log('error');
			}
		});
	}
	
	// On envoi la mise à jour à titre indicatif pour tous les joueurs connectés
	broadcast.refreshMarketPrices();
	
	// Enfin, on relance un nouveau timer
	updateTimer();
}

exports.init = init;
exports.buy = buy;
exports.sell = sell;