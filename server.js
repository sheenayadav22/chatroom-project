const cpen400a = require('./cpen400a-tester.js');
const path = require('path');
const fs = require('fs');
const express = require('express');

var mongoUrl = "mongodb://localhost:27017";
var dbName = "cpen400a-messenger";
var Database = require("./Database.js");
var db = new Database(mongoUrl, dbName);

//Session
var SessionManager = require("./SessionManager.js");
var sessionManager = new SessionManager();

//global data variables
var messageBlockSize = 3;
var messages = {};
function initialize_messages(){
	
	db.getRooms().then(response => {

		for(var i in response){
			room = response[i];
			messages[room._id] = [];

		}
	})
	.catch(error => console.log(error));
}
initialize_messages();	

function logRequest(req, res, next){
	console.log(`${new Date()}  ${req.ip} : ${req.method} ${req.path}`);
	next();
}

const host = 'localhost';
const port = 3000;
const clientApp = path.join(__dirname, 'client');

// express app
let app = express();

app.use(express.json()) 						// to parse application/json
app.use(express.urlencoded({ extended: true })) // to parse application/x-www-form-urlencoded
app.use(logRequest);							// logging for debug


//websocket server
const WebSocket = require('ws');
const { resolve } = require('path');

var broker = new WebSocket.Server({ port: 8000 });

broker.on('connection', function connection(socket, request) {
		
		cookie = request.headers.cookie;
		if(!cookie)
			socket.close();
		else{
		
		cookie_value = cookie.substring(cookie.indexOf("=")+ 1);
		user = sessionManager.getUsername(cookie_value);
	
		if(!user)
			socket.close();
		else{

			socket.on('message', function incoming(message) {

				var msg = JSON.parse(message);
				
				//sanitize message
				msg.text = msg.text.replace(/<script|<img|<button/g,'');
			
				msg.username = user;

				broker.clients.forEach(function each(client) {
					if (client !== socket && client.readyState === WebSocket.OPEN) {
					
						client.send(JSON.stringify(msg));
					}
				});
			
				console.log("1:",{username: user, text: msg.text});

				var room_id = msg.roomId.toString();
				messages[room_id].push({username: user, text: msg.text});

				if(messages[room_id].length == messageBlockSize){
				
					for(var i in messages[room_id]){

						messages[room_id][i].text = messages[room_id][i].text.replace(/<script|<img|<button/g,'');
						
					}

					var convo = {"room_id": room_id, "timestamp": Date.now(), "messages" : messages[room_id] };
					
					db.addConversation(convo).then(result =>{
						messages[room_id] = []
					}) 
					.catch(error => console.log(error));
				}
			}); 
		}
	}
}); 

//custom error handling
function errHandling(err, req, res, next){
	//console.log("In errhandling")
	if(err instanceof SessionManager.Error){
		var acceptHeader = req.headers.accept;
		if(acceptHeader.includes("application/json")){

			res.status(401).json(err);
		
		}
		else{
			res.redirect('/login');
			
		}
	}
	else{
		res.status(500).json(err);
		
	}
};

//Password helper function
const crypto = require('crypto');
function isCorrectPassword(password, saltedHash){

	saltedPassword = password + saltedHash.substring(0,20);
	hash = crypto.createHash("SHA256").update(saltedPassword).digest("base64");
	return hash == saltedHash.substring(20);
}


//login post

app.post('/login',(req, res) => { 

	username = req.body.username;
	password = req.body.password;

	db.getUser(username).then(user =>{
		
		if(user && isCorrectPassword(password, user.password)) {
			sessionManager.createSession(res,username);
			res.redirect('/');
		}
		else
			res.redirect('/login');
	})
	.catch(err => console.log(err));

})

//logout

app.get('/logout',sessionManager.middleware,function (req, res, next) {

	sessionManager.deleteSession(req);
	res.redirect('/login');

})


//app routing

app.get('/profile',sessionManager.middleware,function (req, res, next) {

	res.send({username: req.username})

})

app.get('/chat', sessionManager.middleware,function (req, res, next) {
	
	db.getRooms().then(response => {

		var result = [];
		for(var i in response){
			
			room = response[i];
			var temp = {}
			temp._id = room._id;
			temp.name = room.name;
			temp.image = room.image;
			temp.messages = messages[temp._id];
			result.push(temp);
		}
		res.send((result));

	})
	.catch(error => console.log(error));
	
  })

app.post('/chat',sessionManager.middleware, (req, res, next) => { 
	
	if(req.body.name == null||req.body.name.trim() == ""){
		res.status(400);
		res.send(new Error("Room Name not found"))
	}
	else{
		var newRoom = {};
		
		newRoom.name = req.body.name;
		newRoom.image = req.body.image;

		//add new room to db
		db.addRoom(newRoom).then(result => {

				
				messages[(result._id).toString()] = [];
				res.status(200);
				res.send(JSON.stringify(result));

		})
		.catch(err => console.log(err));

	}
  }) 

//app routing-asst4

app.get('/chat/:room_id', sessionManager.middleware,function (req, res) {
	
	var roomId = req.params.room_id;
	db.getRoom(roomId).then(result => 
	{
		
		if(result) res.send(result);
		
		else{
			res.status(404)
			res.send(new Error("Room not found"));
		}

	})
	.catch(err => console.log(err));
 })


 app.get('/chat/:room_id/messages',sessionManager.middleware, function (req, res) {
	
	var roomId = req.params.room_id;
	var before = Date.now();

	if(req.query.before)
		before = parseInt(req.query.before);

	db.getLastConversation(roomId, before).then(result => 
	{
		
		if(result) {
		res.send(result);
		//console.log("last convo:", result);
		}
		else{
			console.log("error getting last convo")
			res.status(404).json((new Error("Error in messages")));
		}

	})
	.catch(err => console.log(err));
 })

//serve static files (client-side)
app.use('/index.html', sessionManager.middleware,express.static(clientApp + 'index.html'));
app.use('/index', sessionManager.middleware,express.static(clientApp + 'index.html'));
app.use('/app.js', sessionManager.middleware,express.static(clientApp + 'app.js'));
app.use('/+', sessionManager.middleware,express.static(clientApp + 'index.html'));

app.use('/', express.static(clientApp, { extensions: ['html'] }));

app.use(errHandling);


app.listen(port, () => {
	console.log(`${new Date()}  App Started. Listening on ${host}:${port}, serving ${clientApp}`);
});


// at the very end of server.js
cpen400a.connect('http://35.183.65.155/cpen400a/test-a5-server.js');
cpen400a.export(__filename, { app,messages, broker, db, messageBlockSize, sessionManager, isCorrectPassword});