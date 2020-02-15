const log = require('./log');

class Updater
{
	constructor( cMap, db, io ) {
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
		this.timer = setInterval( Updater.updateAll, 60000, this );
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

				if( result ) {
					result = result[0][0]; // 1ая таблица 1ая строка

					if( result.success ) {
						const upTime = result.update_time;
						upTime.setHours( upTime.getHours() + 3 );
						console.log( new Date(), result.update_time, upTime );
						cInfo.session = result.session;
						cInfo.updateTime = upTime;
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
		// log( 'Update sessions', 'UPDATER', 'LOG' );
		if( in_Updater && in_Updater.cMap ) {
			if( in_Updater.cMap.size < 1 ) {
				in_Updater._stop();
				return;
			}
			for( const info of in_Updater.cMap.values() ) {
				in_Updater.update( info );
			}
		}
	}

}

module.exports = Updater;