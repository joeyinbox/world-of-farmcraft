$(document).ready(function(){
	
	// On masque le message d'alerte concernant le chargement de javascript
	$('#warning').hide(0);
	
	// On affiche une légère animation du contenu
	$('#main').css({'margin-top':'0px', 'opacity':1});
	
	$('#resetPassword').click(function() {
		
		// On vérifie si l'email a bien été renseigné
		var regex = /^[-a-zA-Z0-9._+]+@[-a-zA-Z0-9._+]+$/;
		if(!regex.test($('#email').val())) {
			$('#error').text('Please specify a valid E-Mail address');
			return false;
		}
		else {
			// On vérifie maintenant si ce compte existe
			userExists($('#email').val());
		}
		
		return false;
	});
	
	function userExists(email) {
		$.post('userExists', { email: email})
		.done(function(data) {
			if(data=='true') {
				$('form').submit();
			}
			else {
				$('#error').html('This account is unknown..');
			}
		})
		.fail(function(data) { 
			$('#error').text('Unable to verify informations');
		});
	}
	
});