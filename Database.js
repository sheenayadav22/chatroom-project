const { MongoClient, ObjectID} = require('mongodb');	// require the mongodb driver

/**
 * Uses mongodb v3.6+ - [API Documentation](http://mongodb.github.io/node-mongodb-native/3.6/api/)
 * Database wraps a mongoDB connection to provide a higher-level abstraction layer
 * for manipulating the objects in our cpen400a app.
 */
function Database(mongoUrl, dbName){
	if (!(this instanceof Database)) return new Database(mongoUrl, dbName);
	this.connected = new Promise((resolve, reject) => {
		MongoClient.connect(
			mongoUrl,
			{
				useNewUrlParser: true
			},
			(err, client) => {
				if (err) reject(err);
				else {
					console.log('[MongoClient] Connected to ' + mongoUrl + '/' + dbName);
					resolve(client.db(dbName));
				}
			}
		)
	});
	this.status = () => this.connected.then(
		db => ({ error: null, url: mongoUrl, db: dbName }),
		err => ({ error: err })
	);
}

Database.prototype.getRooms = function(){
	return this.connected.then(db =>
		new Promise((resolve, reject) => {
		result = db.collection("chatrooms").find()
			resolve(result.toArray());
		})
	)
}

Database.prototype.getRoom = function(room_id){

	return this.connected.then(db =>
		new Promise((resolve, reject) => {
			console.log(typeof room_id);

			if(typeof room_id == "string"){

				//string type room_id
				if(/^[0-9a-f]{24}$/.test(room_id)){
					db.collection("chatrooms").findOne({ _id: ObjectID(room_id)}).then(result => {
						if(result) resolve(result)
						else {
								result = db.collection("chatrooms").findOne({ _id: room_id})
								resolve(result)
							}		
					})
				
				}
				else{

					result = db.collection("chatrooms").findOne({ _id: room_id})
					resolve(result)

				}
			}
			else{

				result = db.collection("chatrooms").findOne({ _id: room_id})
				resolve(result)

			}
		})
	)
}

Database.prototype.addRoom = function(room){
	return this.connected.then(db => 
		new Promise((resolve, reject) => {
			if(room.name){
				db.collection("chatrooms").insertOne(room).then(result => resolve(result.ops[0]))
				.catch(err => console.log(err));
			}
			else{
				 reject(new Error("No name for room found"));
			}
		})
	)
}

Database.prototype.getLastConversation = function(room_id, before){
	return this.connected.then(db =>
		new Promise((resolve, reject) => {
			console.log("in get last convo")
			if(before == undefined)
				before = Date.now();

			db.collection("conversations").find({$and:[{room_id: room_id}, {timestamp: {$lt: before}}]}).sort({timestamp: -1}).limit(1).toArray().then(result => {
				resolve(result[0]);
			});
		
		})
	)
}

Database.prototype.addConversation = function(conversation){
	return this.connected.then(db =>
		new Promise((resolve, reject) => {
			
			if(conversation.room_id && conversation.timestamp && conversation.messages){

				for(var i in conversation.messages){
					
					conversation.messages[i].text = conversation.messages[i].text.replace(/<script|<img|<button/g,'');
		
				}

				db.collection("conversations").insertOne(conversation).then(result => resolve(result.ops[0]));
			
			}
			else
				reject(new Error("Conversation object missing parameters"));
		})
	)
}
Database.prototype.getUser = function(username) {

	return this.connected.then( 
		db => db.collection("users").findOne({username: username})
	);

}
module.exports = Database;