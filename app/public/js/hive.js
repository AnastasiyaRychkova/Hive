Game.field = new Field();

Coordinates.init(200, 260, 5 );

socket.on( 'toMatch', ( data ) => {
	console.log('toMatch: ', data );
	
	DOMObj.server.setAttribute( 'data-free', false );
	clearTables();
	DOMObj.main.playing.setAttribute( 'data-right-move', data.rightMove != 0 );
	DOMObj.main.playing.setAttribute( 'data-white', data.color != 0 );
	Game.isPlaying = true;
	Game.rightMove = data.rightMove != 0;
	Game.color = data.color != 0;
	DOMObj.main.preplaying.setAttribute( 'hidden', true );
	DOMObj.main.playing.removeAttribute( 'hidden' );

	prepareField();
	Game.field.constructFrom( data.field );
	console.log( Game.hands, Game.field );
});




function prepareField() {
	for (const cell of Game.hands) {
		if( cell !== null )
			cell.delete();
	}

	if( Game.field.size ) {
		for( const cell of Game.field )
			cell.delete();
	}
}