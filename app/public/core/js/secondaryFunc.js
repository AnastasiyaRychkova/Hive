/**
 * Вычислить рейтинг игрока
 */
function countRating( wins, draws, loses ) {
	return Math.round( ( wins + 0.5 * draws ) / ( wins, draws, loses ) * 100 );
}

/**
 * Создать массив строк для вставки на страницу
 * @param {Array} objArr Массив объектов клиентов
 */
function generateClientArray( objArr ) {
	const res = [];
	for (const client of objArr) {
		const row = document.createElement( 'tr' );
		const icon = document.createElement( 'td' );
		const nick = document.createElement( 'td' );
		const login = document.createElement( 'td' );
		const rating = document.createElement( 'td' );
		icon.className = 'direction-icon';
		nick.textContent = client.nick;
		nick.textContent = client.login;
		nick.textContent = client.rating;
		row.append( icon, nick, login, rating );
		res.push( row );
	}
}