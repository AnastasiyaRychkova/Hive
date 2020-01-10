const socket = io( document.location.href );

socket.on('connect', function() {
	console.log( 'Connect' );
});

socket.on('disconnect', function() {
	console.log( 'Disconnect' );
});

socket.on( 'profile', ( data ) => {
	DOMObj.profile.nick.textContent  = data.nick;
	DOMObj.profile.login.textContent = data.login;
	DOMObj.profile.wins.textContent  = data.wins;
	DOMObj.profile.draws.textContent = data.draws;
	DOMObj.profile.loses.textContent = data.loses;
	DOMObj.profile.rating.textContent= countRating( data.wins, data.draws, data.loses );

	if( data.is_playing ) {
		socket.emit( 'getMatchState' );
	}
	else {
		socket.emit( 'getCList', ( result ) => {
			// разобрать ответ - отчистить имеющийся список - заполнить новой инф-й
		});
	}
	
});

