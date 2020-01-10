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

	console.log('refreshResults', result, DOMObj.row );

	switch( result.action ) {
		case 'add':
			const row = createRow( result.data );
			const e = row.addEventListener( 'click', new Invitation( result.data.login ), {'once': true} );
			DOMObj.table[ TableType.other ].append( row );
			DOMObj.row.set( result.data.login, createRowValue( TableType.other, row, e ) );
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
			console.log( 'RowInfo', rowInfo );
			if( rowInfo ) {
				if( result.data.inviter ) { // получено приглашение
					if( rowInfo.type != TableType.inviters )
						DOMObj.table[ TableType.inviters ].append( rowInfo.row );
					return;
				}
				if( result.data.invitation ) { // отправлено приглашение
					if( rowInfo.type != TableType.invited )
						DOMObj.table[ TableType.invited ].append( rowInfo.row );
						rowInfo.row.removeEventListener( 'click', rowInfo.listener );
					return;
				}
				if( rowInfo.type != TableType.other )
					DOMObj.table[ TableType.other ].append( rowInfo.row );
				return;
			}
			break;
	}
});

socket.on( 'serverBusy', ( players ) => {
	DOMObj.server.setAttribute( 'free', false );
	if( players instanceof Array ) {
		for (const login of players) {
			const removedRow = DOMObj.row.get( login );
				if( row ) {
					DOMObj.table[ removedRow.type ].remove( removedRow.row );
					DOMObj.row.delete( login );
				}
		}
	}
} )


socket.on( 'toMatch', ( data ) => {
	console.log('toMatch: ', data);
	
	DOMObj.server.setAttribute( 'free', false );
	clearTables();
	DOMGameObj.status.rightMove.setAttribute( 'right-move', data.rightMove );
	GAME.isPlaying = true;
	GAME.rightMove = data.rightMove;
	GAME.color = data.color;
	DOMObj.main.preplaying.setAttribute( 'hidden', true );
	DOMObj.main.playing.removeAttribute( 'hidden' );
});


DOMBtn.refresh.addEventListener( 'click', () => {
	socket.emit( 'getCList', refreshClientList );
} );


// Обновить список игроков и статус сервера
function refreshClientList( result ) {
	console.log( 'refreshClientList', result );
	DOMObj.server.setAttribute( 'free', result.isFree != 0 );
	generateClientArray( result.list );
}