const socket = io( document.location.href );

socket.on('connect', function() {
	console.log( 'Connect' );
});

socket.on('disconnect', function() {
	console.log( 'Disconnect' );
});