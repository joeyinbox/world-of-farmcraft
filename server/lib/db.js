var mysql = require('mysql');
var interactive_timeout = 30;
var wait_timeout = 30;

module.exports.getConnection = function() {
	// On vérifie si la connexion est toujours active
	if ((module.exports.connection) && (module.exports.connection._socket) && (module.exports.connection._socket.readable) && (module.exports.connection._socket.writable)) {
		return module.exports.connection;
	}
	
	// Sinon, on va re-créer une connection
	var connection = mysql.createConnection({
		host     : 'localhost',
		user     : 'root',
		password : 'root',
		database : 'databaseName'
	});
	
	// Puis se re-connecter
	connection.connect(function(err) {
		if (err) {
			console.log('SQL connect error: ' + err);
        }
	});
    module.exports.connection = connection;
    return module.exports.connection;
}

module.exports.getConnection();