const crypto = require('crypto');

class SessionError extends Error {};

function SessionManager (){
	// default session length - you might want to
	// set this to something small during development
	const CookieMaxAgeMs = 600000;

	// keeping the session data inside a closure to keep them protected
	const sessions = {};

	// might be worth thinking about why we create these functions
	// as anonymous functions (per each instance) and not as prototype methods
	this.createSession = (response, username, maxAge = CookieMaxAgeMs) => {
		
		var token = crypto.randomBytes(127);
		var now = Date.now();
		var tokenInfo = {"token": token.toString("hex"), "username": username, "created" : now, "expires": now + maxAge } ;
		
		sessions[token.toString('hex')] = tokenInfo;

		console.log("Session created")
		
		setTimeout(() => { 
			delete sessions[token.toString('hex')];
			
		}, tokenInfo.expires - tokenInfo.created);

		response.cookie('cpen400a-session', token.toString("hex"), { maxAge: maxAge })

	};

	this.deleteSession = (request) => {

		delete sessions[request.session];
		delete request.username;
		delete request.session;

	};

	this.middleware = (request, response, next) => {

			if(!request.headers.cookie)
				next(new SessionError("Cookie header not found"));
			else {
				
				cookies = request.headers.cookie.split(";");
				flag = 0;
				for(var i in cookies){
					
					if(cookies[i].substring(0, cookies[i].indexOf("=")) == "cpen400a-session"){
						
						cookie_value = cookies[i].substring(cookies[i].indexOf("=")+ 1);
						flag = 1
						break;
					}
				}
				
				if(!flag)
					next(new SessionError("Cookie header not found"));
			
				else{
					tokenInfo = sessions[cookie_value];
					if(tokenInfo){
						//console.log("add properties to req")
						console.log("cookie retrieved")
						request.username = tokenInfo.username;
						request.session = cookie_value;
						next();
						
					}
					else
						next(new SessionError("Token not found"));
				}
			}
		
	};

	// this function is used by the test script.
	// you can use it if you want.
	this.getUsername = (token) => ((token in sessions) ? sessions[token].username : null);
};

// SessionError class is available to other modules as "SessionManager.Error"
SessionManager.Error = SessionError;

module.exports = SessionManager;