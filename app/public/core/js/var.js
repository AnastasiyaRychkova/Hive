const DOMObj = {
	'profile': {
		'nick':   document.getElementById( 'user-name' ),
		'login':  document.getElementById( 'user-email' ),
		'wins':   document.getElementById( 'wins-counter' ),
		'draws':  document.getElementById( 'draws-counter' ),
		'loses':  document.getElementById( 'loses-counter' ),
		'rating': document.getElementById( 'rating-counter' )
	},
	'server': document.getElementById( 'server-status' ),
	'table': {
		'inviters': document.getElementById( 'inviters' ),
		'invited': document.getElementById( 'invited' ),
		'other': document.getElementById( 'other-users' )
	},
	'row': {
		'inviters': [],
		'invited': [],
		'other': []
	}
};

const DOMGameObj = {
	'status': {
		'rightMove': document.getElementById( 'game-status' ),
		'move': document.getElementById( 'move-counter' )
	},
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

