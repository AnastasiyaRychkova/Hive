const sha256 = require('js-sha256');
const log = require('./log');

class hiveClient
{
	constructor( session, in_login ) {
		if( !hiveClient.mClients ) {
			log( 'Initialize hiveClient', 'Error', 'hiveClient: constructor: '+in_login );
			return;
		}
		this.login = in_login;
		this.nick = "";
		this.session = session;
		this.connections = [];
		this.bIsPlaying = false;
		this.player = null;
		this.wins = 0;
		this.draws = 0;
		this.loses = 0;
		this.inviters = [];
		this.invitations = [];
		this.bInit = false;

		const clientId = hiveClient.convertSession( session );
		hiveClient.mClients.set( clientId, this );

		this.destroyTimer = setTimeout( () => {
			hiveClient.mClients.delete( clientId );
		},6000); // удалить запись через минуту, если клиент не подключился через сокет
	}

	static init() {
		hiveClient.mClients = new Map();
	}

	static convertSession( session ) {
		const res = sha256( session );
		res.length = 16;
		return res;
	}

	static mClients;


}

module.exports = hiveClient;