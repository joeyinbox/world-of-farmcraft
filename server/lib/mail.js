var nodemailer = require('nodemailer');

// On crée un pool de connections SMTP
var smtpTransport = nodemailer.createTransport("SMTP", {
    service: "Gmail",
    auth: {
        user: "yourEmail@gmail.com",
        pass: "yourPassword"
    }
});

function send(to, subject, text, html) {
	// On indique les données de l'entête
	var mailOptions = {
	    from: "World of Farmcraft <yourEmail@gmail.com>",
	    to: to,
	    subject: subject,
	    text: text,
	    html: html
	}
	
	// Puis on envoi l'email
	smtpTransport.sendMail(mailOptions, function(error, response) {
		if(error) {
			console.log(error);
		}
		else {
			console.log("Message sent: " + response.message);
		}
	});
}

function passwordLost(email, token) {
	var text = "Hello Folks,\n\nIf you've recently lost your password, you can reset it by going to: http://localhost:1337/resetPassword?token="+token+" \nIf not, you can ignore this email.\n\n Have a nice day :)\nWorld of Farmcraft team.";
	var html = "Hello Folks,<br /><br />If you've recently lost your password, you can <a href='http://localhost:1337/resetPassword?token="+token+"'>reset it</a>.<br />If not, you can ignore this email.<br /><br />Have a nice day :)<br />World of Farmcraft team.";
	
	send(email, "Password recovery", text, html);
}

exports.passwordLost = passwordLost;