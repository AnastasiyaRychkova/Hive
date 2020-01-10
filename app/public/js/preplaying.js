const socket = io( document.location.href );

socket.on('connect', function() {
	console.log( 'Connect' );
});

socket.on('disconnect', function() {
	console.log( 'Disconnect' );
});

/**
 * Обновить отображаемые данные пользователя на странице.
 * Запросить список онлайн игроков, если не играет.
 * Запросить состояние матча, если играет.
 */
socket.on( 'profile', ( data ) => {
	console.log( 'profile', data );

	DOMObj.profile.nick.textContent  = data.nick;
	DOMObj.profile.login.textContent = data.login;
	DOMObj.profile.wins.textContent  = data.wins;
	DOMObj.profile.draws.textContent = data.draws;
	DOMObj.profile.loses.textContent = data.loses;
	DOMObj.profile.games.textContent = data.wins + data.draws + data.loses;
	DOMObj.profile.rating.textContent= DOMObj.profile.games.textContent == '0' ? 0 : countRating( data.wins, data.draws, data.loses );

	if( data.is_playing ) {
		GAME.isPlaying = true;
		GAME.playing = PlayingStateEnum.think;
		GAME.rightMove= data.right_move;
		GAME.color= data.color;
		socket.emit( 'toMatch' ); // Запросить состояние матча
	}
	else {
		GAME.isPlaying = false;
		socket.emit( 'getCList', refreshClientList ); // Запросить список онлайн игроков
	}
});

socket.on( 'refreshResults', ( result ) => {
	if( !result ) {
		console.log( 'refreshResults:', 'Data is empty');
		return;
	}

	console.log('refreshResults: ', result );

	switch( result.action ) {
		case 'add':
			const row = createRow( result.data );
			const e = row.addEventListener( 'click', new Invitation( client.login ), {'once': true} );
			DOMObj.table[ TableType.other ].append( row );
			DOMObj.row.set( result.login, createRowValue( TableType.other, row, e ) );
			break;
		case 'remove':
			const removedRow = DOMObj.row.get( result.data.login );
			if( row ) {
				DOMObj.table[ removedRow.type ].remove( removedRow.row );
				DOMObj.row.delete( result.data.login );
			}
			break;
		case 'refresh':
			const rowInfo = DOMObj.row.get( result.data.login );
			if( row ) {
				if( result.data.inviter ) {
					if( rowInfo.type != TableType.inviters )
						DOMObj.table[ TableType.inviters ].append( rowInfo.row );
						rowInfo.row.removeEventListener( 'click', rowInfo.listener );
					return;
				}
				if( result.data.invitation ) {
					if( rowInfo.type != TableType.invited )
						DOMObj.table[ TableType.invited ].append( rowInfo.row );
					return;
				}
				if( rowInfo.type != TableType.other )
					DOMObj.table[ TableType.other ].append( rowInfo.row );
				return;
			}
			break;
	}
});






socket.on( 'toMatch', ( data ) => {

});



// Обновить список игроков и статус сервера
function refreshClientList( result ) {
	console.log( 'refreshClientList', result );
	DOMObj.server.setAttribute( 'free', result.isFree != 0 );
	generateClientArray( result.list );
}