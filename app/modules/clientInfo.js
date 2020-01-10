const sha256 = require('js-sha256');
const log 	 = require('./log');

class hiveClient
{
	constructor( in_session, in_login, in_password, in_updateTime = new Date() ) {
		if( !hiveClient.mClients ) {
			log( 'Initialize hiveClient', 'Error', 'hiveClient: constructor: '+in_login );
			return;
		}
		const id = hiveClient.convertSession( in_session );

		this.login = in_login;
		this.password = in_password;
		this.nick = "";
		this.session = in_session;
		this.updateTime = in_updateTime;
		this.clientId = id;
		this.connections = new Set();
		this.bIsPlaying = false;
		this.player = '';
		this.wins = 0;
		this.draws = 0;
		this.loses = 0;
		this.inviters = new Set();
		this.bInit = false;

		hiveClient.mClients.set( this.clientId, this );

		this.destroyTimer = setTimeout( () => {
			hiveClient.mClients.delete( id );
		},6000); // удалить запись через минуту, если клиент не подключился через сокет
	}

	static init() {
		hiveClient.mClients = new Map();
		return hiveClient.mClients;
	}

	/**
	 * Получить ID пользователя из сессии
	 * @param {String} session Сессия
	 */
	static convertSession( session ) {
		const res = sha256( session ).substring( 0, 16 );
		return res;
	}

	static mClients;
	static io;

	/**
	 * Добавить сокет, через который подключется пользователь
	 * @param {Socket} socket Connection
	 */
	addConnection( socket ) {
		this.connections.add( socket );
		const room = this.clientId;
		joinRoom( socket, room )
		.catch( error => {
			log( `Failed to join the room ( ${room} )`, 'Error', 'addConnection' );
			log( error, 'error' );
		} );
	}

	/**
	 * Добавить игрока в комнату
	 * @param {Socket} player Игрок
	 * @param {String} room Имя комнаты
	 */
	static joinRoom( player, room ) {
		return new Promise( ( resolve, reject ) => {
			player.join( room, ( error ) => error ? reject( error ) : resolve( 1 ) );
		})
	}

	initInfo( db_result ) {
		this.bInit 		= true;
		this.nick 		= db_result.nick;
		this.wins 		= db_result.wins;
		this.draws 		= db_result.draws;
		this.loses 		= db_result.loses;
		this.bIsPlaying = db_result.is_playing;
		
		if( this.bIsPlaying )
			this.player = db_result.player;
	}

	/**
	 * Вычислить рейтинг игрока
	 */
	countRating() {
		return Math.round( ( this.wins + 0.5 * this.draws ) / ( this.wins + this.draws + this.loses ) * 100 );
	}

	/**
	 * Разостать сообщение всем неиграющим игрокам кроме отправителя
	 * @param {String} event Событие, запускаемое на клиенте
	 * @param {String} message Данные, отправляемые клиенту
	 */
	broadcastEmit( event, message ) {
		for( const client of hiveClient.mClients.values() ) {
			if( cilent.clientId != this.clientId && !client.bIsPlaying )
				hiveClient.io.to( client.clientId ).emit( event, message );
		}
	}

	async getClientList() {
		const res = [];
		for (const client of hiveClient.mClients.values() ) {
			if( cilent.clientId != this.clientId && !client.bIsPlaying ) {
				res.push({
					'nick': client.nick,
					'login': client.login,
					'rating': client.countRating()
				});
			}
		}
		return res;
	}

}

module.exports = hiveClient;