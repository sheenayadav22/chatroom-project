/* Profile for current user */

profile = {username: "test"};

/* Service Object */
var Service = { origin: window.location.origin,
                getAllRooms() {

                    return fetch(this.origin + "/chat")
                    .then( response => {
                        if(response.status!=200){
                            return response.text().then(text =>  Promise.reject(new Error(text)));
                        }
                        else
                            return Promise.resolve(response.json());} )
                    .catch( error => Promise.reject(error) );
                },
                addRoom(data){
                    
                    return fetch(this.origin + "/chat", {
                        method: 'POST', // or 'PUT'
                        headers: {
                        'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(data),
                    })
                    .then(response => {
                        if(!response.ok){
                            return response.text().then(text =>  Promise.reject(new Error(text)));
                        }
                        else
                            return Promise.resolve(response.json());
                    })
                    .catch((error) => {
                          return Promise.reject(error);
                    });
  

                },
                getLastConversation(roomId, before){
                    return fetch(this.origin + "/chat/" + roomId.toString() + "/messages?before=" + before.toString())
                    .then( response => {
                        if(response.status!=200){
                            return response.text().then(text =>  Promise.reject(new Error(text)));
                        }
                        else{
                            return Promise.resolve(response.json());
                        }
                    })
                    .catch( error => Promise.reject(error));
                },
                getProfile(){
                    return fetch(this.origin + "/profile")
                    .then( response => {
                        if(response.status!=200){
                            return response.text().then(text =>  Promise.reject(new Error(text)));
                        }
                        else{
                            return Promise.resolve(response.json());
                        }
                    })
                    .catch( error => Promise.reject(error));
                    
                }
            }
        


/* Helper Functions*/
function emptyDOM (elem){
    while (elem.firstChild) elem.removeChild(elem.firstChild);
}

// Creates a DOM element from the given HTML string
function createDOM (htmlString){
    let template = document.createElement('template');
    htmlString.trim();
    template.innerHTML = htmlString;
    return template.content.firstChild;
}


/* Generator Function*/
function* makeConversationLoader(room)
{
    last_timestamp = room.roomCreated;
    room.canLoadConversation = true;
    while(last_timestamp > 0  && room.canLoadConversation){

        room.canLoadConversation = false;
        var convo = Service.getLastConversation(room.id, last_timestamp).then(result => {
            if(result){
                room.canLoadConversation = true;
                last_timestamp = result.timestamp;
                room.addConversation(result)   
            }
            return result;   
        })
        .catch(err => console.log(err));
        
        yield(Promise.resolve(convo));

    }
}

/* Room Class*/

class Room {
    constructor(id, name, image = "assets/everyone-icon.png", messages = []){

        this.image = image;
        this.messages = messages;
        this.id = id;
        this.name = name;
        this.roomCreated = Date.now();
        this.getLastConversation = makeConversationLoader(this);
        this.canLoadConversation = true;
        
        
    }
    addMessage(username, text){
        
        if(text.trim()!= ""){       
            var msg = {username : username, text : text}

            if(msg.text){
                
                //sanitize message
                msg.text = msg.text.replace(/<script|<img|<button/g,'');
            }
            this.messages.push(msg);
            if(typeof this.onNewMessage === "function"){
                this.onNewMessage(msg);
            }
        }
    }
    addConversation(conversation){
        conversation.messages.forEach(message => this.messages.push(message));
        if(typeof this.onFetchConversation === "function"){
            this.onFetchConversation(conversation);
        }
    }
}

/* Lobby (Index) Class*/

class Lobby{
    constructor(){
        
        this.rooms = {};
    }
    
    getRoom(roomId){

        for(var room in this.rooms){                  
            if(room == roomId){

                return this.rooms[room];             
           
            }
        }
    }
    addRoom(id, name, image = "assets/everyone-icon.png", messages = []){

        if(name.trim() != ""){
            var newRoom = new Room(id,name,image,messages);
            this.rooms[id] = newRoom; 
            if(typeof this.onNewRoom === "function"){
                this.onNewRoom(newRoom);
            }
        }
    }

}


/* Lobby Page (Index page) */
class LobbyView {
  
    constructor(lobby) {

        this.lobby = lobby;
        this.lobby.onNewRoom = (room) => {  //create list element li
                                            var li = document.createElement("li");

                                            //create img element in li
                                            var img = document.createElement("img");
                                            img.src = room.image;

                                            /* create a href element*/

                                            var a = document.createElement('a');  
                                            a.text = room.name;
                                            a.href = "#/chat/" + room.id;  

                                            li.appendChild(img);
                                            li.appendChild(a);
                                            this.listElem.appendChild(li);

                                        }

        this.elem = createDOM(`<div class = "content">
                                <ul class = "room-list">
                                <li>
                                    <img src="assets/everyone-icon.png" alt="everyone-icon">
                                    <a href = "#/chat">Everyone in CPEN 400A</a>
                                </li>
                                <li>
                                    <img src="assets/bibimbap.jpg" alt="bibimbap">
                                    <a href = "#/chat">Foodies only</a>
                                </li>
                                <li>
                                    <img src="assets/minecraft.jpg" alt="minecraft">
                                    <a href = "#/chat">Gamers unite</a>
                                </li>
                                <li>
                                    <img src="assets/canucks.png" alt="canucks">
                                    <a href = "#/chat">Canucks Fans</a>
                                </li>
                                </ul>
                                <div class = "page-control">
                                <input type="text" placeholder="Room Title">
                                <button type = "button">Create Room</button>
                                </div>
                            </div>`);
            
        this.listElem = this.elem.querySelector(".room-list");
        this.inputElem = this.elem.querySelector(".page-control input");
        this.buttonElem = this.elem.querySelector(".page-control button");
        this.redrawList();
        this.buttonElem.addEventListener("click", () => {
                                                            var name = this.inputElem.value;
                                                            Service.addRoom({name: name, image: "assets/everyone-icon.png"}).then(response => {
                                                                this.lobby.addRoom(response._id, response.name, response.image);
                                                                this.inputElem.value = "";
                                                            })
                                                            .catch(error => console.log(error));
                                                            
                                                        });

    }
    
    redrawList(){
        emptyDOM(this.listElem);

        for(var i in this.lobby.rooms){

            //get rooms[i]
            var room = this.lobby.rooms[i];

            //create list element li
            var li = document.createElement("li");

            //create img element in li
            var img = document.createElement("img");
            img.src = room.image;

            /* create a href element*/

            var a = document.createElement('a');  
            a.text = room.name;
            a.href = "#/chat/" + room.id;  

            li.appendChild(img);
            li.appendChild(a);
            this.listElem.appendChild(li);
        }

    }
}

/* Chat Page */
class ChatView {

    constructor(socket) {
      this.elem = createDOM(`<div class = "content">
                                <h4 class = "room-name">Everyone in CPEN 400A</h4>
                                <div class = "message-list">
                                    <div class = "message">
                                        <span class = "message-user"> Alice                       
                                        </span>
                                        <span class = "message-text"> Hey Bob how's it going?                     
                                        </span>
                                    
                                    </div>
                                    <div class = "message my-message">
                                    <span class = "message-user"> Bob
                                    </span>
                                    <span class = "message-text"> It's going good, just working on the assignment!
                                    </span>
                                </div>
                                </div>
                                <div class = "page-control" id = "chat-page-control">
                                    <textarea id = "chat-text-box"> </textarea>
                                    <button type = "button"> Send </button>
                                </div>
                            </div>`);
        
        this.socket = socket;
        this.titleElem = this.elem.querySelector("h4.room-name");
        this.chatElem = this.elem.querySelector("div.message-list");
        this.inputElem = this.elem.querySelector("#chat-text-box");
        this.buttonElem = this.elem.querySelector(".page-control button");
        this.room = null;
        this.buttonElem.addEventListener("click", ()=> {this.sendMessage();});
        this.inputElem.addEventListener("keyup", (event) => {    
                                                            if(event.keyCode == 13 & !event.shiftKey)
                                                                this.sendMessage();
                                                            });
        this.chatElem.addEventListener("wheel", (event)=> {
            if(this.room.canLoadConversation && this.chatElem.scrollTop == 0 && event.deltaY < 0)
                this.room.getLastConversation.next();
        });

        
    }
    sendMessage(){
        var msg = this.inputElem.value;
        this.room.addMessage(profile.username,msg);
        this.socket.send(JSON.stringify({roomId: this.room.id, text: msg}));
        this.inputElem.value = "";
        
    }
    setRoom(room){
        this.room = room;
        this.titleElem.innerText = room.name;
        emptyDOM(this.chatElem);

         /* Creating Messages */
         for (var i in this.room.messages){

            var message = this.room.messages[i];

            if(message.text){
                 //sanitize message
                message.text = message.text.replace(/<script|<img|<button/g,'');
            }
            var msg = document.createElement("div");
            var username = document.createElement("span");           
            var text = document.createElement("span");

            username.className = "message-user";
            username.innerText = message.username;
            text.className = "message-text";
            text.innerText = message.text;

            if(profile.username == message.username){
               
                msg.setAttribute("class","message my-message");
            }
            else 
                msg.className = "message";

            msg.appendChild(username);
            msg.appendChild(text);
            this.chatElem.appendChild(msg);

            
        }

        /* Creating new conversation block */

        this.room.onFetchConversation = (conversation) =>{

            var messages = conversation.messages;
            var reverse = [];
            while (messages.length) {
                reverse.push(messages.pop());
            }
            var hb = this.chatElem.scrollHeight;

            reverse.forEach(message => {

                var msg = document.createElement("div");
                var username = document.createElement("span");           
                var text = document.createElement("span");
        
                username.className = "message-user";
                username.innerText = message.username;
                text.className = "message-text";
                text.innerText = message.text;
        
                if(profile.username == message.username){
                
                    msg.setAttribute("class","message my-message");
                }
                else 
                    msg.className = "message";
        
                msg.appendChild(username);
                msg.appendChild(text);
                this.chatElem.insertBefore(msg, this.chatElem.firstChild); 


            })

            this.chatElem.scrollTop = this.chatElem.scrollHeight - hb;
        }
        
        this.room.onNewMessage = (message) => {

            
            if(message.text){
                //sanitize message
               message.text = message.text.replace(/<script|<img|<button/g,'');
            }    
         
            var msg = document.createElement("div");
            var username = document.createElement("span");           
            var text = document.createElement("span");
    
            username.className = "message-user";
            username.innerText = message.username;
            text.className = "message-text";
            text.innerText = message.text;
    
            if(profile.username == message.username){
               
                msg.setAttribute("class","message my-message");
            }
            else 
                msg.className = "message";
    
            msg.appendChild(username);
            msg.appendChild(text);
            this.chatElem.appendChild(msg); 
                 
        }
    }
   
    
}

/* Profile Page */
class ProfileView {
    constructor() {
        this.elem = createDOM(`<div class = "content">
                                <div class = "profile-form">
                                    <div class = "form-field">
                                        <label>Username</label>
                                        <input type = "text">
                                    </div>
                                    <div class = "form-field">
                                        <label>Password</label>
                                        <input type = "password">
                                    </div>
                                    <div class = "form-field">
                                        <label>Avatar Image</label>
                                        <input type = "file">
                                    </div>
                                </div>
                                <div class = "page-control">
                                    <button type = "button">Save</button>
                                </div>
                             </div>`);
        
    }
}


/* Main */
function main(){

    window.addEventListener('popstate', renderRoute);

    var lobby = new Lobby();
    var lobbyView = new LobbyView(lobby);  

    /*User profile*/

    Service.getProfile().then(result => profile.username = result.username);

    /* Web Socket */
    var socket = new WebSocket("ws://localhost:8000");
    var chatView = new ChatView(socket);
    var profileView = new ProfileView();
   
    refreshLobby();
    renderRoute();
    var chatListUpdate = setInterval(refreshLobby, 5000);

    socket.addEventListener('message', function(event) {

        var msg = JSON.parse(event.data);
        var room = lobby.getRoom(msg.roomId);
        room.addMessage(msg.username,msg.text);


    });
    function refreshLobby(){
        
        Service.getAllRooms().then(serverRoomList => {

            for(i in serverRoomList){
             
                var room = lobby.rooms[serverRoomList[i]._id];

                //room doesn't already exist in the server
                if(!room){
                lobby.addRoom(serverRoomList[i]._id,serverRoomList[i].name,serverRoomList[i].image, serverRoomList[i].messages);
                }
                else{
                    room.name = serverRoomList[i].name;
                    room.image = serverRoomList[i].image;
                    room.messages = serverRoomList[i].messages;
                }

            }   
        })
        .catch(error => console.log(error));

    }

    function renderRoute(){

        var str = location.hash;

        var end = str.indexOf("#",2)
        if (end == -1) 
            end = str.indexOf("/",2)
        if (end == -1) 
            end = str.length + 1;
       
        var url = str.slice(2,end);
        console.log(str);
        console.log(end);
        var pageView = document.getElementById("page-view");
        emptyDOM(pageView);
        var content = null;
        if(url == "")
        {
            content = lobbyView.elem;

        }
        else if(url == "chat")
        {
            content = chatView.elem;
            var roomId  = str.slice(end+1);
            var room = null;
            room = lobby.getRoom(roomId);
            if(room != null)
                chatView.setRoom(room);
            else 
                content = lobbyView.elem;

        }
        else if(url == "profile")
        {
            content = profileView.elem;
        }
        pageView.appendChild(content);

    }
    
    cpen400a.export(arguments.callee, { renderRoute, lobbyView, chatView, profileView});
    cpen400a.export(arguments.callee, { refreshLobby, lobby, chatListUpdate , socket});
       

}

// Event Handling for when page is completely loaded
window.addEventListener("load", main);