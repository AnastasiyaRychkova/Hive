/**
 * Сообщение пользователю служебной информации (логирование)
 * @param {String} type Тип сообщения
 * @param {String} message Сообщение
 */
function log( message, type, path ) {
	if( message instanceof Error )
		switch (type) {
			case 'error':
				console.error( message );
				break;
			case 'warn':
				console.warn( message );
				break;
		
			default:
				console.log( message.stack );
				break;		
	}
	else {
		switch (type) {
			case 'LOG':
			case 'Event':
			case 'Error':
			case 'Debug':
			case 'Cheater':
				type += ':';
				break;
			case 'MATCH RESULT':
				type += '~~~~~';
				
			default:
				type += '>';
				break;
		}
		console.log( `${type} ${path != undefined ? (path + ': ') : ''}${message}` );
	}
}

module.exports = log;