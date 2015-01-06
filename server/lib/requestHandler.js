var crypto = require('crypto');
var path = require('path');
var fs = require('fs');
var mail = require('./mail');
var db = require('./db');
var settings = require('./settings');
var map = require('./map');
var connection = null;

function start(req, res, postData) {
	
	// On vérifie si l'utilisateur n'est pas déjà connecté
	if(validateEmail(req.session.data.user) && parseInt(req.session.data.id)==req.session.data.id) {
		// On redirige notre utilisateur vers la page de jeu
		res.writeHead(302, {'Location': '/play', 'Content-Type': 'text/html'});
		res.end('<a href="/play">Redirecting to the game...</a>');
		return;
	}
	
	// On vérifie si l'on a transmit des données correctes depuis le formulaire
	if (postData.email===undefined || postData.email===null || postData.password===undefined || postData.password===null || !validateEmail(postData.email)) {
		// Il manque des données ou l'email est invalide
		removePrivileges(req, res);
	}
	else {
		// Enfin, on interroge la base de données pour savoir si cet utilisateur existe
		connection = db.getConnection();
		connection.query('SELECT * FROM wof_user WHERE email="'+postData.email+'" AND password="'+hash(postData.password)+'"', function(error, rows, fields) {
			if(error) {
				console.log('Database error on login');
				removePrivileges(req, res);
			}

			if(rows.length==0) {
				console.log('Bad auth..');
				removePrivileges(req, res);
			}
			else {
				// Notre utilisateur est valide!
				console.log('Connection: '+rows[0].email+' is now logged.');
				
				// On retient ses identifiants
				req.session.data.user = rows[0].email;
				req.session.data.id = rows[0].id_user;

				// On redirige notre utilisateur vers la page de jeu
				res.writeHead(302, {'Location': '/play', 'Content-Type': 'text/html'});
				res.end('<a href="/play">Redirecting to the game...</a>');
			}
		});
	}
}

function userExists(req, res, postData) {
	// On vérifie si l'on a transmit des données correctes depuis le formulaire
	if (postData.email===undefined || postData.email===null || !validateEmail(postData.email)) {
		// Il manque des données
		res.writeHead(200, {"Content-Type": "text/plain"});
		res.end('false');
	}
	else {
		// Enfin, on interroge la base de données pour savoir si cet utilisateur existe
		connection = db.getConnection();
		connection.query('SELECT id_user FROM wof_user WHERE email="'+postData.email+'"', function(error, rows, fields) {
			if (error || rows.length==0) {
				res.writeHead(200, {"Content-Type": "text/plain"});
				res.end('false');
			}
			else {
				res.writeHead(200, {"Content-Type": "text/plain"});
				res.end('true');
			}
		});
	}
}

function userCredentials(req, res, postData) {
	// On vérifie si l'on a transmit des données correctes depuis le formulaire
	if (postData.email===undefined || postData.email===null || !validateEmail(postData.email) || postData.password===undefined || postData.password===null) {
		// Il manque des données
		res.writeHead(200, {"Content-Type": "text/plain"});
		res.end('false');
	}
	else {
		// Enfin, on interroge la base de données pour savoir si cet utilisateur existe
		connection = db.getConnection();
		connection.query('SELECT id_user FROM wof_user WHERE email="'+postData.email+'" AND password="'+hash(postData.password)+'"', function(error, rows, fields) {
			if (error || rows.length==0) {
				res.writeHead(200, {"Content-Type": "text/plain"});
				res.end('false');
			}
			else {
				res.writeHead(200, {"Content-Type": "text/plain"});
				res.end('true');
			}
		});
	}
}

function register(req, res, postData) {
	
	// On vérifie si l'on a transmit des données correctes depuis le formulaire
	if (postData.email===undefined || postData.email===null || postData.password===undefined || postData.password===null || postData.confirmationPassword===undefined || 
	postData.confirmationPassword===null || postData.difficulty===undefined || postData.difficulty===null) {
		
		// On redirige l'utilisateur sur le formulaire de connexion
		res.writeHead(302, {'Location': '/', 'Content-Type': 'text/html'});
		res.end('<a href="/">Redirecting to the register form...</a>');
	}
	
	// On vérifie à présent si l'adresse email ne contient pas de caractères interdits
	else if(!validateEmail(postData.email)) {
		// L'email est invalide
		removePrivileges(req, res);
	}
	
	// Le mot de pass est-il vide?
	else if(postData.password=='') {
		// Oui...
		removePrivileges(req, res);
	}
	
	// Les mots de pass correspondent-ils?
	else if(postData.password!=postData.confirmationPassword) {
		// Non...
		removePrivileges(req, res);
	}
	
	// La difficulté choisie est-elle connue?
	else if(postData.difficulty!='easy' && postData.difficulty!='medium' && postData.difficulty!='hard') {
		// Non...
		removePrivileges(req, res);
	}
	
	// Tout semble correct
	// On vérifie à présent si cet utilisateur possède déjà un compte en base de données
	else {
		var connection = db.getConnection();
		connection.query('SELECT id_user FROM wof_user WHERE email="'+postData.email+'"', function(error, rows, fields) {
			if(error) {
				console.log('Database error on checking registration');
				removePrivileges(req, res);
			}

			if(rows.length>0) {
				// Cet utlisateur possède déjà un compte..
				console.log('Error: '+postData.email+' is already a member and therefore cannot register again..');

				removePrivileges(req, res);
			}
			else {
				// On peut à présent enregistrer notre utilisateur
				connection = db.getConnection();
				connection.query('INSERT INTO wof_user(email, password, difficulty, life, money) VALUES("'+postData.email+'", "'+hash(postData.password)+'", "'+postData.difficulty+'", '+settings.getInitialLife()+', '+settings.getInitialMoneyByDifficulty(postData.difficulty)+')', function(error, rows, fields) {
					if(error) {
						console.log('Database error on register');
						removePrivileges(req, res);
					}
					else {
						console.log('Register: '+postData.email+' is now registered!');
						
						// On identifie l'utilisateur
						req.session.data.user = postData.email;
						req.session.data.id = rows.insertId;
						
						// On va allouer un territoire à cet utilisateur
						map.allocateTerritory(rows.insertId, res);
					}
				});
			}
		});
	}
}

function validateEmail(email) {
	var regex = /^[-a-zA-Z0-9._+]+@[-a-zA-Z0-9._+]+$/;
	return regex.test(email);
}

function validateToken(token) {
	var regex = /^[a-z0-9]{32}$/;
	return regex.test(token);
}

function hash(data) {
	var salt = 'J01n U5 n0w 4n|} 5H4|23 7H3 50f7w4|23; Y0U w1LL 83 f|233, H4CK3|25, y0U w1LL 83 f|233.';
	return crypto.createHash('md5').update(data+salt).digest('hex');
}

function play(req, res, postData) {
	
	// On vérifie que l'utilisateur est bien connecté
	if(req.session.data.user=='anonymous' || req.session.data.id==undefined) {
		// On redirige l'utilisateur sur le formulaire de connexion
		res.writeHead(302, {'Location': '/', 'Content-Type': 'text/html'});
		res.end('<a href="/">Redirecting to the login form...</a>');
	}
	else if(!validateEmail(req.session.data.user) || parseInt(req.session.data.id)!=req.session.data.id) {
		removePrivileges(req, res, true);
		
		// On redirige l'utilisateur sur le formulaire de connexion
		res.writeHead(302, {'Location': '/', 'Content-Type': 'text/html'});
		res.end('<a href="/">Redirecting to the login form...</a>');
	}
	else {
		// On affiche la page de jeu
		renderView(res, 'play');
	}
}

function passwordLost(req, res, postData) {
	// On vérifie si l'on a correctement remplis le formulaire de re-initialisation de mot de passe
	if(postData.email===undefined || postData.email===null || !validateEmail(postData.email)) {
		// On affiche la page de récupération de mot de passe
		renderView(res, 'passwordLost');
	}
	else {
		// On génère un token aléatoire
		var token = hash(postData.email+Math.random());
		
		// On enregistre ce dernier en base de donnée
		var connection = db.getConnection();
		connection.query('UPDATE wof_user SET recovery="'+token+'" WHERE email="'+postData.email+'"', function(error, rows, fields) {
			if(error) {
				console.log('Database error on updating recovery token');
			}
			else {
				console.log('Password recovery: '+postData.email);
			}
		});
		
		mail.passwordLost(postData.email, token);
		
		// On affiche la page de succès d'envoi de mail
		renderView(res, 'passwordLostSent');
	}
}

function resetPassword(req, res, postData) {
	// On vérifie que l'on a transmit un token correct
	var urlParams = require('url').parse(req.url, true).query || {};
	
	if(typeof urlParams.token=='undefined' || !validateToken(urlParams.token)) {
		console.log('Invalid token provided.. Can\'t show reset password form');

		// On redirige notre utilisateur vers la page de re-initialisation de mot de passe
		res.writeHead(302, {'Location': '/passwordLost', 'Content-Type': 'text/html'});
		res.end('<a href="/play">Redirecting to the lost password form...</a>');
	}
	else {
		// On vérifie que ce token est connu
		var connection = db.getConnection();
		connection.query('SELECT id_user, email FROM wof_user WHERE recovery="'+urlParams.token+'"', function(error, rows, fields) {
			if(error) {
				console.log('Database error on checking recovery token');
				removePrivileges(req, res);
			}
			else if(rows.length==0) {
				console.log('Bad token provided..');
				
				// On redirige l'utilisateur sur le formulaire de demande de re-initialisation
				res.writeHead(302, {'Location': '/passwordLost', 'Content-Type': 'text/html'});
				res.end('<a href="/">Redirecting to the lost password form...</a>');
			}
			
			// On vérifie à présent si l'on a déjà remplis le formulaire
			else if(postData.password!=undefined && postData.password!=null && postData.confirmationPassword!=undefined && postData.confirmationPassword!=null 
					&& postData.password.length>0 && postData.password==postData.confirmationPassword) {
				
				// On récupère l'email de cet utilisateur
				var email = rows[0].email;
				var user_id = rows[0].id_user;
				
				// On peut à présent enregistrer notre utilisateur
				connection = db.getConnection();
				connection.query('UPDATE wof_user SET password="'+hash(postData.password)+'", recovery=NULL WHERE recovery="'+urlParams.token+'"', function(error, rows, fields) {
					if(error) {
						console.log('Database error on updating password');
						removePrivileges(req, res);
					}
					else {
						console.log('Password successfully reset for '+email);
						
						// On connecte notre utilisateur
						req.session.data.user = email;
						req.session.data.id = user_id;

						// On redirige notre utilisateur vers la page de jeu
						res.writeHead(302, {'Location': '/play', 'Content-Type': 'text/html'});
						res.end('<a href="/play">Redirecting to the game...</a>');
					}
				});
			}
			else {
				// On affiche le formulaire de re-initialisation de mot de passe
				renderView(res, 'resetPassword');
			}
		});
	}
}

function logout(req, res, postData) {
	// On supprime les privilèges
	removePrivileges(req, res, true);
	
	// Puis on redirige vers l'accueil
	console.log('Logout: '+postData.email+' has just logout');
	
	res.writeHead(302, {'Location': '/', 'Content-Type': 'text/html'});
	res.end('<a href="/play">Redirecting to the index...</a>');
}

function removePrivileges(req, res, doNotRender) {
	// On repasse notre utilisateur en anonyme si ce n'est déjà fait
	req.session.data.user = "anonymous";
	
	if(doNotRender==undefined || doNotRender!=true) {
		// Puis on affiche le formulaire de connexion
		renderView(res, 'sign');
	}
}

function renderView(res, file) {
	var filename = path.join(process.cwd(), '/view/'+file+'.html');
	fs.exists(filename, function(exists) {
		if(!exists) {
			console.log("Doesn't exist: " + filename);
			res.writeHead(404, {'Content-Type': 'text/plain'});
			res.write('404 not found..\n');
			res.end();
			return;
		}
		
		res.writeHead(200, {'Content-Type': 'text/html'});
		var fileStream = fs.createReadStream(filename);
		fileStream.pipe(res);
	});
}

exports.start = start;
exports.register = register;
exports.passwordLost = passwordLost;
exports.resetPassword = resetPassword;
exports.play = play;
exports.userExists = userExists;
exports.userCredentials = userCredentials;
exports.logout = logout;