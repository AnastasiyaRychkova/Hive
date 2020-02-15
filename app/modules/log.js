const colors = require('colors/safe');

/**
 * Сообщение пользователю служебной информации (логирование)
 * @param {String} type Тип сообщения
 * @param {String} message Сообщение
 */
function log( message, type, path ) {
	if( message instanceof Error )
		switch (type) {
			case 'error':
				console.error( colors.red( message ) );
				break;
			case 'warn':
				console.warn( colors.yellow( message ) );
				break;
		
			default:
				console.log( message.stack );
				break;
	}
	else {
		let colorFunc;
		switch (type) {
			case 'INFO':
				colorFunc = colors.black.bgCyan;
				type += ':';
				break;
			case 'LOG':
			case 'Debug':
				colorFunc = colors.gray;
				type += ':';
				break;
			case 'Event':
				colorFunc = colors.green;
				type += ':';
				break;
			case 'Error':
			case 'Cheater':
				colorFunc = colors.red;
				type += ':';
				break;
			case 'MATCH RESULT':
				colorFunc = colors.bgBlue;
				type += '~~~~~';
				break;
			default:
				type += '>';
				colorFunc = colors.white;
				break;
		}
		console.log( colorFunc( type ), colorFunc( path !== undefined ? (path + ': ') : '' ), colorFunc( message ) );
	}
}

module.exports = log;