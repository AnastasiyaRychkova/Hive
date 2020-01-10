const express 	= require('express');
const app 		= express();
const server 	= require('http').Server(app);
const bodyParser= require('body-parser');
const io 		= require('socket.io')(server);
var ip 			= require('ip');

const mysql 		= require('mysql');
var db = mysql.createConnection({
	host     : 'localhost',
	user     : 'guest',
	password : '3470',
	database : 'hive'
});

const Client		 = require('./app/modules/clientInfo');
const log 			 = require('./app/modules/log');
const GLOB = {
	'bIsFree': true
}

const clientMap 	 = Client.init( io );


app.use( require('cookie-parser')() );
app.use(bodyParser.urlencoded({ extended: false }));
app.use( bodyParser.json() );


db.connect( function(err) {
	if (err) {
		log( err, 'error' );
		return;
	}
	log( 'Data base is connected', 'LOG' );

	db.query( 'call isFree()', ( error, result ) => {
		if( error ) {
			log( 'Data base error', 'Error', 'db: isFree' );
			log( error, 'error' );
			return;
		}

		result = result[0][0];

		if( !result ) {
			log( 'Empty result', 'Error', 'db: isFree' );
			return;
		}

		GLOB.bIsFree = result.free;
		log( `Server status: GLOB: ${GLOB.bIsFree} DB: ${result.free}`)
	})
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
		console.log( '===============================================' );
		console.log( req.cookies, req.cookies.hiveSession, clientMap );
		console.log( '===============================================' );
		if( req.cookies && req.cookies.hiveSession && clientMap.has( req.cookies.hiveSession ) ) {
			const info = clientMap.get( req.cookies.hiveSession );
			log( 'New connection (static server sending HTML)', info.login );
			res.sendFile('hive.html', {root: __dirname + '/app/public'});
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

/**
 * Регистрация пользователя
 * @param {Request} req Запрос
 * @param {Responce} res Ответ
 */
function registration( req, res ) {
	if( !req.body.login || !req.body.password || !req.body.nick ) {
		log( `Has no data for registration ( ${req.body} )`, 'Error', 'post: registration' );
		res.json( {
			'success': false,
			'code': 114
		} );
		return;
	}

	const password = req.body.password;

	db.query( 'call registration( ?, ?, ? )', [req.body.login, password, req.body.nick], ( error, result ) => {
		if( error ) {
			log( error, 'error' );
			res.json( {
				'success': false,
				'code': 199,
				'details': error.message
			} );
			return;
		}

		result = result[0][0];

		if( !result ) {
			log( 'Empty result', 'Error', 'db: registration' );
			return;
		}

		console.log( result );

		if( !result.success ) {
			log( `Registration data base error ( ${result.code} )`, 'LOG', 'post: registration' );
			res.json( {
				'success': false,
				'code': result.code
			} );
			return;
		}

		log( `Registration success ( ${result.session} )`, 'LOG', 'post: registration' );
		const user = new Client( result.session, req.body.login, password, new Date( result.update_time ) );
		res.cookie( 'hiveSession', user.clientId, {httpOnly: true} );
		res.json( {
			'success': true
		});
	} );
}

/**
 * Авторизация
 * @param {Request} req Запрос
 * @param {Responce} res Ответ
 */
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

	const password = req.body.password;

	db.query( 'call authorization( ?, ? )', [req.body.login, password], ( error, result ) => {
		if( error ) {
			log( error, 'error' );
			res.json( {
				'success': false,
				'code': 199,
				'details': error.message
			} );
			return;
		}

		result = result[0][0];

		if( !result ) {
			log( 'Empty result', 'Error', 'db: authorization' );
			return;
		}

		console.log( result );

		if( !result.success ) {
			log( `Authorization data base error (${result.code})`, 'LOG', 'post: authorization' );
			res.json( {
				'success': false,
				'code': result.code
			} );
			return;
		}

		const cSession = Client.convertSession( result.session );

		if( !Client.mClients.has( cSession ) ) {
			new Client( result.session, req.body.login, password, new Date( result.update_time ) );
		}
		res.cookie( 'hiveSession', cSession, {httpOnly: true} );
		res.json( {
			'success': true
		});
	} )
}











io.on('connection', function (socket) {

	// Проверка сессии в cookie
	const info = clientMap.get( socket.request.headers.cookie.match(/hiveSession=([^;]*)/ )[1] );

	if( !info ) {
		log( 'Socket handshake error: invalid session', 'Cheater' );
		socket.disconnect( true );
		return;
	}

	log( 'New socket connection', info.login, 'onConnection' );

	info.addConnection( socket );

	// Инициализация
	if( !info.bInit ) {
		// Получить данные из базы данных
		db.query( 'call getInfo( ?, ? )', [info.session, info.login], ( error, result ) => {
			if( error ) {
				log( 'Data base error', 'Error', 'db: getInfo' );
				log( error, 'error' );
				return;
			}

			result = result[0][0];

			// Ошибка: Пустой результат
			if( !result ) {
				log( 'Empty result', 'Error', 'db: getInfo' );
				return;
			}

			// Ошибка: входные параметры не прошли проверку
			if( !result.success ) {
				if( result.code == 102 ) // Ошибка авторизации
					log( `Authorization error ( ${info.login} )`, 'Error', 'db: getInfo' );
				else { // Неизвестная ошибка
					log( 'Unknown data base error code: ' + result.code, 'Error', 'db: getInfo' );
					return;
				}
			}

			console.log( result );

			info.initInfo( result ); //Записать полученные данные
			socket.emit( 'profile', result ); // Отправить данные пользователю

			/**
			 * Если клиент не играет, сообщить другим клиентам о подключении нового.
			 * Если нет, то ждем, когда клиент обработает у себя переданную информацию, а затем пошлет запрос на получение информации о матче
			 */
			if( !info.bIsPlaying ) {
				info.broadcastEmit( 'refreshResults', {
					'action': 'add',
					'data': {
						'nick': info.nick,
						'login': info.login,
						'rating': info.countRating()
					}
				});
			}
			
		})
	}
	else {
		socket.emit( 'profile', { // Отправить данные пользователю
			'success': 1,
			'is_playing': info.bIsPlaying,
			'nick': info.nick,
			'login': info.login,
			'wins': info.wins,
			'draws': info.draws,
			'loses': info.loses
		} );
	}


	// Запрос на получение списка онлайн игроков
	socket.on( 'getCList', async ( callback ) => {

		let list;

		try {
			list = await info.getClientList();
		} catch (error) {
			log( 'Failed to get client list', 'Error', 'getCList' );
			log( error, 'error' );
			callback( {
				'isFree': GLOB.bIsFree,
				'list': []
			} );
			return;
		}

		log( 'Sending client list', info.login, 'LOG' );

		callback( {
			'isFree': GLOB.bIsFree,
			'list': list
		} );
	});

	// 
	socket.on( 'invite', ( login ) => {
		if( !GLOB.bIsFree ) {
			log( 'An invitation was sent while the server is busy: ' + GLOB.bIsFree, info.login );
			return;
		}

		log( `Invite player ${login}`, info.login );

		const client = Client.find( login );
		if( client && !client.bIsPlaying ) {

			if( info.inviters.has( client ) ) { // Можно начать матч
				GLOB.bIsFree = false;
				info.bIsPlaying = true;
				client.bIsPlaying = true;

				/* TODO: Запрос в БД на создание новой игры
				db.query( 'call newGame( ?, ? )', [info.session, client.session], ( error, result ) => {
					*/
					info.opponent = client;
					client.opponent = info;
					Client.clearInviters( info, client );
					const color = Math.round( Math.random() ) == 0;
					const rightMove = Math.round( Math.random() ) == 0;
					
					io.to( info.clientId ).emit( 'toMatch', {
						'color': color,
						'rightMove': rightMove
					} );
					io.to( client.clientId ).emit( 'toMatch', {
						'color': !color,
						'rightMove': !rightMove
					} );
					info.broadcastEmit( 'serverBusy', [ info.login, client.login ] );
					/*
				} ))
				*/
			}
			else { // Отослать приглашение
				client.inviters.add( info );
				io.to( info.clientId ).emit( 'refreshResults', {
					'action': 'refresh',
					'data': {
						'login': login,
						'inviter': false,
						'invitation': true
					}
				});
				info.broadcastEmit( 'refreshResults', {
					'action': 'refresh',
					'data': {
						'login': info.login,
						'inviter': true,
						'invitation': false
					}
				})
			}
			
		}
	} )




	socket.on( 'toMatch', () => {
		
	} )










	socket.on( 'disconnect', () => {
		if( !info.deleteConnection( socket ) ) {
			// const time = info.updateTime - ( new Date() );
			info.destroyTimer = setTimeout( () => {
				if( info.bIsPlaying && info.opponent ) {
					io.to( info.opponent.clientId .emit( 'pause', {
						'reason': 'Opponent disconnected'
						}));
					info.opponent = null;
				}
				clientMap.delete( info.clientId );
			}, 1000 );
		}
	} )
});

















/**
 * TODO:
 * socket.on( 'getMatchState', () => {} )
 */