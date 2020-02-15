/**
 * Вычислить рейтинг игрока
 */
function countRating( wins, draws, loses ) {
	return Math.round( ( wins + 0.5 * draws ) / ( wins + draws + loses ) * 100 );
}

/**
 * Создать массив строк для вставки на страницу
 * @param {Array} objArr Массив объектов клиентов
 */
function generateClientArray( objArr ) {

	clearTables();

	for (const client of objArr) {
		const row = createRow( client );
		
		if( client.inviter ) {
			const e = row.addEventListener( 'click', new Invitation( client.login ), {'once': true} );
			DOMObj.table[ TableType.inviters ].append( row );
			DOMObj.row.set( client.login, createRowValue( TableType.inviters, row, e ) );
		}
		else {
			if( client.invitation ) {
				DOMObj.table[ TableType.invited ].append( row );
				DOMObj.row.set( client.login, createRowValue( TableType.invited, row ) );
			}
			else {
				const e = row.addEventListener( 'click', new Invitation( client.login ), {'once': true} );
				DOMObj.table[ TableType.other ].append( row );
				DOMObj.row.set( client.login, createRowValue( TableType.other, row, e ) );
			}
		}
			
	}
}

/**
 * Создать DOM-элемент (строку таблицы) и заполнить переданной информацией
 * @param {Object} client Информация клиента
 */
function createRow( client ) {
	const row = document.createElement( 'tr' );
		
	let elem = document.createElement( 'td' );
	elem.className = 'direction-icon';
	row.append( elem );

	elem = document.createElement( 'td' );
	elem.textContent = client.nick;
	row.append( elem );

	elem = document.createElement( 'td' );
	elem.textContent = client.login;
	row.append( elem );
	
	elem = document.createElement( 'td' );
	elem.textContent = client.rating;
	row.append( elem );

	return row;
}

function createRowValue( type, row, listener = null ) {
	return {
		'type': type,
		'row': row ,
		'listener': listener
	};
} 

/**
 * Удалить все строки из всех таблиц
 */
function clearTables() {
	for( const rowInfo of DOMObj.row.values() ) {
		rowInfo.row .remove();
	}
	DOMObj.row.clear();
}