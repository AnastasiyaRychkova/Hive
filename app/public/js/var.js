const xmlns = "http://www.w3.org/2000/svg";
const xmlnsHref = "http://www.w3.org/1999/xlink";


const DOMObj = {
	'profile': {
		'nick':   document.getElementById( 'user-name' ),
		'login':  document.getElementById( 'user-email' ),
		'wins':   document.getElementById( 'wins-counter' ),
		'games':  document.getElementById( 'games-counter' ),
		'draws':  document.getElementById( 'draws-counter' ),
		'loses':  document.getElementById( 'loses-counter' ),
		'rating': document.getElementById( 'rating-counter' )
	},
	'server': document.getElementById( 'server-status' ),
	'table': [
		document.getElementById( 'inviters' ),
		document.getElementById( 'invited' ),
		document.getElementById( 'other-users' )
	],
	'row': new Map(),
	'main': {
		'preplaying': document.getElementById( 'preplaying' ),
		'playing': document.getElementById( 'playing' )
	}

};

const DOMBtn = {
	'refresh': document.getElementById( 'refresh-btn' )
};

const DOMGameObj = {
	'move': document.getElementById( 'move-counter' ),
	'ability': null,
	'window': null
};


const PlayingStateEnum = {
	'think': 0,
	'layOut': 1,
	'shift': 2
}

const Game = {
	'isPlaying': false,
	'field': null,
	'hands': [],
	'path': [],
	'mode': PlayingStateEnum.think,
	'rightMove': false,
	'color': false,
	'activeFigure': null,
	'destination': null
}

const TableType = {
	'inviters': 0,
	'invited': 1,
	'other': 2
}

const FigureType = {
	'bee': 0,
	'bug': 1,
	'spider': 2,
	'grasshopper': 3,
	'ant': 4
}

class Invitation
{
	handleEvent() {
		console.log( 'Invite:', this.login );
		socket.emit( 'invite', this.login );
	}

	constructor( in_login ) {
		this.login = in_login;
	}
}