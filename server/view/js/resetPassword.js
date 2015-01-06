$(document).ready(function(){
	
	// On masque le message d'alerte concernant le chargement de javascript
	$('#warning').hide(0);
	
	// On affiche une légère animation du contenu
	$('#main').css({'margin-top':'0px', 'opacity':1});
	
	$('#resetPassword').click(function() {
		
		// On vérifie que le token a été transmit
		var token = decodeURIComponent((new RegExp('[?]token='+'([^&;]+?)(&|#|;|$)').exec(location.search)||[,""])[1].replace(/\+/g, '%20'))||null;
		if(token==null) {
			$('#error').text('The token provided is invalid');
			return false;
		}
		
		// On vérifie si le mot de passe a été renseigné
		else if($('#password').val().length==0) {
			$('#error').text('Please enter your password');
			return false;
		}
		
		// La confirmation du mot de pass est-elle correcte?
		else if($('#password').val()!=$('#confirmationPassword').val()) {
			$('#error').text('The two passwords doesn\'t match');
			return false;
		}
	});
	
});