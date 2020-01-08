const sha256 = require('js-sha256');
const log = require('./log');

class hiveClient
{
	constructor( session, in_login ) {
		if( !hiveClient.mClients ) {
			log( 'Initialize hiveClient', 'Error', 'hiveClient: constructor: '+in_login );
			return;
		}
		const id = hiveClient.convertSession( session );

		this.login = in_login;
		this.nick = "";
		this.session = session;
		this.clientId = id
		this.connections = [];
		this.bIsPlaying = false;
		this.player = null;
		this.wins = 0;
		this.draws = 0;
		this.loses = 0;
		this.inviters = [];
		this.invitations = [];
		this.bInit = false;

		hiveClient.mClients.set( this.clientId, this );

		this.destroyTimer = setTimeout( () => {
			hiveClient.mClients.delete( id );
		},6000); // удалить запись через минуту, если клиент не подключился через сокет
	}

	static init() {
		hiveClient.mClients = new Map();
	}

	static convertSession( session ) {
		const res = sha256( session ).substring( 0, 16 );
		return res;
	}

	static mClients;

}

hiveClient.init();

module.exports = hiveClient;