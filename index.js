const express 	= require('express');
const app 		= express();
const server 	= require('http').Server(app);
const io 		= require('socket.io')(server);
var ip 			= require('ip');

const mysql 		= require('mysql');
var db = mysql.createConnection({
	host     : 'localhost',
	user     : 'admin',
	password : 'Pp0387557',
	database : 'hive'
});

const Client	= require('./app/modules/clientInfo');
const log 		= require('./app/modules/log');

Client.init();
app.use( require('cookie-parser')() );


db.connect( function(err) {
	if (err) {
		log( err, 'error' );
		return;
	}
	log( 'Data base is connected', 'LOG' );
});


app.get("/", function (req, res) {
	console.log( 'get');
	if( req.cookies && req.cookies.hiveSession && Client.mClients.has( req.cookies.hiveSession ) ) {
		log( 'New connection (static server sending HTML)', Client.mClients.get( req.cookies.hiveSession ).login );
		res.sendFile('hive.html', {root: __dirname + '/app/public/core'});
	}
	else {
		res.sendFile('index.html', {root: __dirname + '/app/public'});
	}
	
});

app.use(express.static(__dirname + '/app/public'));
app.use("/public", express.static(__dirname + '/app/public'));

server.listen(8082);
log( 'The server is running at ' + ip.address() + ':8082', 'LOG' );

io.on('connection', function (socket) {
	socket.emit('news', { hello: 'world' });
	socket.on('my other event', function (data) {
		console.log(data);
	});
});