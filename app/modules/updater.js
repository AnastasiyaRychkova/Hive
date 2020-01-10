const log = require('./log');

class Updater
{
	construct( cMap, db, io ) {
		this.cMap = cMap;
		this.db = db;
		this.io = io;
		this.timer = null;
	}

	/**
	 * Остановить обновление сессий, если клиентов нет и возобновить, если есть
	 */
	check() {
		const size = this.cMap.size;
		if( size > 0 && !this.timer ) {
			this._start();
			return;
		}

		if( size == 0 && this.timer ) {
			this._stop();
			return;
		}
	}

	_start() {
		this.timer = setInterval( Updater.updateAll, 6000, this );
	}

	_stop() {
		clearInterval( this.timer );
	}

	update( cInfo ) {
		if( cInfo && cInfo.updateTime < new Date() ) {
			const io = this.io;

			this.db.query( 'call authorization( ?, ? )', [ cInfo.login, cInfo.password ], ( error, result ) => {
				if( error ) {
					log( 'Data base error', cInfo.login, 'Updater: update' );
					log( error, 'error');
					return;
				}

				console.log( result );
				if( result ) {
					result = result[0][0]; // 1ая таблица 1ая строка

					if( result.success ) {
						cInfo.session = result.session;
						cInfo.updateTime = result.update_time;
						io.to( cInfo.clientId ).emit( 'updateSession', true );
						return;
					}

					log( `Updating session fail ( ${cInfo.login} ). Code: ${result.code}`, 'Error', 'Updater: update' );
				}
			} );

		}
	}
	
	/**
	 * Обновить все имеющиеся сессии
	 * @param {Updater} in_Updater Объект, обновляющий сессии
	 */
	static async updateAll( in_Updater ) {
		if( in_Updater && in_Updater.cMap ) {
			for( const info of in_Updater.cMap.values() ) {
				in_Updater.update( info );
			}
		}
	}

}

module.exports = Updater;