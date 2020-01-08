//import { response } from "express";

// document.location.href = document.location.href + 'core/hive.html';

const docData = {
	'registration': {
		'nick': {
			'div': document.getElementById('nick'),
			'input': document.getElementById('r-nick')
		},
		'login': {
			'div': document.getElementById('login'),
			'input': document.getElementById('r-login')
		},
		'password': {
			'div': document.getElementById('password'),
			'input': document.getElementById('r-password')
		}
	},
	'authorization': {
		'login': document.getElementById('v-login'),
		'password': document.getElementById('v-password')
	},
	'main': {
		'registration': document.getElementById('registration'),
		'authorization': document.getElementById('authorization')
	}
};

function toRegistration() {
	console.log( 'To registration' );
	docData.main.authorization.setAttribute("hidden", true);
	docData.main.registration.removeAttribute("hidden");
}

function toAuthorization() {
	console.log("To authorization");
	docData.main.registration.setAttribute("hidden", true);
	docData.main.authorization.removeAttribute("hidden");
}

//=================================================================

const req = new XMLHttpRequest();

function registration() {
	console.log("Registration");

	const data = docData.registration;
	{
		let checkRes = true;
		if( data.nick.input.value == '' ) {
			checkRes = false;
			data.nick.div.setAttribute( 'wrong', true );
		}
		if( data.login.input.value == '' ) {
			checkRes = false;
			data.login.div.setAttribute( 'wrong', true );
		}
		if( data.password.input.value.length < 4 ) {
			checkRes = false;
			data.password.div.setAttribute( 'wrong', true );
		}
		if( !checkRes )
			return false;
	}

	/* req.open("POST", '/registration', true);
	req.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded'); 

	const password = sha256( data.password.input.value + '2545' );

	let params = `action=reg&login=${encodeURI( data.login.input.value )}&password=${password}&nick=${encodeURI( data.nick.input.value )}`;*/

	let params = {
		'action': 'reg',
		'login': encodeURI( data.login.input.value ),
		'password': sha256( data.password.input.value + '2545' ),
		'nick': encodeURI( data.nick.input.value )
	}

	fetcher( '/', params )
	.then( response => response.json() )
	.then( resCode => {
		if( resCode.success ) {
			console.log( 'Registration: Success' );
			/* req.open("POST", '/', true);
			req.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
			req.onreadystatechange = resp;
			req.send(); */
			document.location = document.location.href;
			return false;
		}
		console.log( resCode.code );
		switch ( resCode.code ) {
			case 111:
				data.login.div.setAttribute( 'wrong', true );
				break;
			case 112:
				data.password.div.setAttribute( 'wrong', true );
				break;
			case 113:
				data.nick.div.setAttribute( 'wrong', true );
				break;
			case 199:
				console.log( 'Data base error: ' + resCode.details );
				break;
		
			default:
				console.log( 'Unknown error code: ' + resCode );
				break;
		}
	})
	.catch( error => {
		console.log( 'Fetch error', 'authorization' );
		console.error( error );
	});

	return false;

	/* req.onreadystatechange = resp;
	req.send( params ); */
}




function authorization() {
	console.log( 'Authorization' );

	const data = docData.authorization;
	{
		let checkRes = true;
		if( data.login.value == '' ) {
			checkRes = false;
			data.login.setAttribute( 'wrong', true );
		}
		if( data.password.value.length < 4 ) {
			checkRes = false;
			data.password.setAttribute( 'wrong', true );
		}
		if( !checkRes )
			return false;
	}

	let params = {
		'action': 'auth',
		'login': encodeURI( data.login.value ),
		'password': sha256( data.password.value + '2545' )
	}

	fetcher( '/', params )
	.then( response => response.json() )
	.then( resCode => {
		if( resCode.success ) {
			console.log( 'Authorization: Success' );
			document.location = document.location.href; // перезагрузка страницы
			return false;
		}
		console.log( resCode.code );
		switch ( resCode.code ) {
			case 121:
				data.login.setAttribute( 'wrong', true );
				data.password.setAttribute( 'wrong', true );
				break;
			case 115:
				console.log( 'Data base error: not enough data' );
				break;
			case 199:
				console.log( 'Data base error: ' + resCode.details );
				break;
		
			default:
				console.log( 'Unknown error code: ' + resCode );
				break;
		}
	})
	.catch( error => {
		console.log( 'Fetch error', 'authorization' );
		console.error( error );
	});

	return false;
}


function resp() {
	if( req.readyState == 4 && req.status == 200 ) {

		console.log( req.response );
	}
}



function fetcher( url, jsData ) {
	return fetch( url,
	{
		method: "POST",
		body: JSON.stringify( jsData ),
		headers: {
		"Content-Type": "application/json"
		}
	}
	);
}