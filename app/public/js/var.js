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

const DOMHands = {
	'bee': {
		'counter': document.getElementById( 'bee-counter' ),
		'figure': document.getElementById( 'f-bee' )
	},
	'bug': {
		'counter': document.getElementById( 'bug-counter' ),
		'figure': document.getElementById( 'f-bug' )
	},
	'spider': {
		'counter': document.getElementById( 'spider-counter' ),
		'figure': document.getElementById( 'f-spider' )
	},
	'grasshopper': {
		'counter': document.getElementById( 'grasshopper-counter' ),
		'figure': document.getElementById( 'f-grasshopper' )
	},
	'ant': {
		'counter': document.getElementById( 'ant-counter' ),
		'figure': document.getElementById( 'f-ant' )
	}
};

const PlayingStateEnum = {
	'think': 0,
	'layOut': 1,
	'shift': 2
}

const GAME = {
	'isPlaying': false,
	'playing': PlayingStateEnum.think,
	'rightMove': false,
	'color': 0
}

const TableType = {
	'inviters': 0,
	'invited': 1,
	'other': 2
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