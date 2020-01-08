const express 	= require('express');
const app 		= express();
const server 	= require('http').Server(app);
const bodyParser= require('body-parser');
const io 		= require('socket.io')(server);
var ip 			= require('ip');

const mysql 		= require('mysql');
var db = mysql.createConnection({
	host     : 'localhost',
	user     : 'admin',
	password : 'Pp0387557',
	database : 'hive'
});

const Client	= require('./app/modules/clientInfo');
const clientsArr = Client.mClients;
const log 		= require('./app/modules/log');

app.use( require('cookie-parser')() );
app.use(bodyParser.urlencoded({ extended: false }));
app.use( bodyParser.json() );


db.connect( function(err) {
	if (err) {
		log( err, 'error' );
		return;
	}
	log( 'Data base is connected', 'LOG' );
});

server.listen( 8082 );
log( 'The server is running at ' + ip.address() + ':8082', 'LOG' );


app.get( "/", function( req, res ) {
	console.log( 'get', req.body );
	regRequest( req, res );
});

app.post( "/", function( req, res ) {
	console.log( 'post', req.body );
	regRequest( req, res );
});

app.use( express.static( __dirname + '/app/public' ) );
app.use( "/public", express.static( __dirname + '/app/public' ) );

function regRequest( req, res ) {
	if( !req.body.action ) {
		console.log( req.cookies, req.cookies.hiveSession, clientsArr );
		if( req.cookies && req.cookies.hiveSession && clientsArr.has( req.cookies.hiveSession ) ) {
			const info = clientsArr.get( req.cookies.hiveSession );
			log( 'New connection (static server sending HTML)', info.login );
			clearTimeout( info.destroyTimer );
			res.sendFile('hive.html', {root: __dirname + '/app/public/core'});
		}
		else {
			res.sendFile('index.html', {root: __dirname + '/app/public'});
		}
	}
	else {
		switch (req.body.action) {
			case 'reg':
				registration( req, res );
				break;
			case 'auth':
				authorization( req, res );
				break;
		
			default:
				break;
		}
	}
}

app.post( "/registration", function( req, res ) {
	console.log( 'post/registration', req.body );
	regRequest( req, res );
});

function registration( req, res ) {
	if( !req.body.login || !req.body.password || !req.body.nick ) {
		log( `Has no data for registration ( ${req.body} )`, 'Error', 'post: registration' );
		res.json( {
			'success': false,
			'code': 114
		} );
		return;
	}

	db.query( 'call registration( ?, ?, ? )', [req.body.login, req.body.password, req.body.nick], ( error, result ) => {
		if( error ) {
			log( error, 'error' );
			res.json( {
				'success': false,
				'code': 199,
				'details': error.message
			} );
			return;
		}

		if( !result[0][0].success ) {
			log( `Registration data base error ( ${result[0][0].code} )`, 'LOG', 'post: registration' );
			res.json( {
				'success': false,
				'code': result[0][0].code
			} );
			return;
		}

		log( `Registration success ( ${result[0][0].session} )`, 'LOG', 'post: registration' );
		const user = new Client( result[0][0].session, req.body.login );
		res.cookie( 'hiveSession', user.clientId, {httpOnly: true} );
		res.json( {
			'success': true
		});
	} );
}

function authorization( req, res ) {
	console.log('post', 'authorization');
	if( !req.body.login || !req.body.password ) {
		log( `Has no data for authorization ( ${req.body} )`, 'Error', 'post: authorization' );
		res.json( {
			'success': false,
			'code': 115
		} );
		return;
	}

	db.query( 'call authorization( ?, ? )', [req.body.login, req.body.password], ( error, result ) => {
		if( error ) {
			log( error, 'error' );
			res.json( {
				'success': false,
				'code': 199,
				'details': error.message
			} );
			return;
		}

		if( !result[0][0].success ) {
			log( `Authorization data base error (${result[0][0].code})`, 'LOG', 'post: authorization' );
			res.json( {
				'success': false,
				'code': result[0][0].code
			} );
			return;
		}

		const cSession = Client.convertSession( result[0][0].session );

		if( !Client.mClients.has( cSession ) ) {
			new Client( result[0][0].session, req.body.login );
		}
		res.cookie( 'hiveSession', cSession, {httpOnly: true} );
		res.json( {
			'success': true
		});
	} )
}












io.on('connection', function (socket) {
	

});