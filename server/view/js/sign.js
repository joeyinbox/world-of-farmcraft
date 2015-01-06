$(document).ready(function(){
	
	$('#warning').hide(0);
	
	var global = $('#global');
	global.attr('width', $('body').width());
	global.attr('height', $('body').height());
	
	var action = 0;
	var title = $('#main h2');
	var create = $('#create');
	var form = $('#main form');
	
	$('#main').css({'margin-top':'0px', 'opacity':1});
	
	create.click(function() {
		$('#register').slideToggle(500);
		
		if(action==0) {
			title.text('Register');
			create.val('Cancel');
			form.attr('action', '/register');
			action = 1;
		}
		else {
			title.text('Log in');
			create.val('Register');
			form.attr('action', '');
			action = 0;
		}
		
		return false;
	});
	
	$('#sign').click(function() {
		
		// On vérifie si l'email a bien été renseigné
		var regex = /^[-a-zA-Z0-9._+]+@[-a-zA-Z0-9._+]+$/;
		if(!regex.test($('#email').val())) {
			$('#error').text('Please specify a valid E-Mail address');
			return false;
		}
		
		// Quand est-il du mot de pass?
		if($('#password').val().length==0) {
			$('#error').text('Please enter your password');
			return false;
		}
		
		// Souhaite-t-on s'enregistrer?
		if(action==1) {
			// La confirmation du mot de pass est-elle correcte?
			if($('#password').val()!=$('#confirmationPassword').val()) {
				$('#error').text('The two passwords doesn\'t match');
				return false;
			}
			
			// La difficulté est-elle connue?
			if($('#difficulty').val()!='easy' && $('#difficulty').val()!='medium' && $('#difficulty').val()!='hard') {
				$('#error').text('Please select a valid difficulty');
				return false;
			}
			
			// On vérifie maintenant si l'utilisateur ne possède pas déjà un compte
			userExists($('#email').val());
		}
		else {
			// On vérifie si les informations sont correctes
			userCredentials($('#email').val(), $('#password').val());
		}
		return false;
	});
	
	
	function userExists(email) {
		$.post('userExists', { email: email})
		.done(function(data) {
			if(data=='true') {
				$('#error').html('An account already exists for this E-Mail.<br />If you\'ve lost your password, you can reset it');
			}
			else {
				$('form').submit();
			}
		})
		.fail(function(data) { 
			$('#error').text('Unable to verify informations');
		});
	}
	
	function userCredentials(email, password) {
		$.post('userCredentials', { email: email, password: password})
		.done(function(data) {
			if(data=='true') {
				$('form').submit();
			}
			else {
				$('#error').html('Invalid credentials.<br />If you\'ve lost your password, you can reset it');
			}
		})
		.fail(function(data) { 
			$('#error').text('Unable to verify informations');
		});
	}
	
	
});