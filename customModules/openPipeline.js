/*

Module Initialization:
1. Create a socket listener (DO THIS AT THE TOP OF FILE) - done
1.5. Defining your functions that are called as a result of the listener recieving data -done?
2. Export functions as a module (DO THIS AT BOTTOM OF FILE) - how to

*/

/*
// Load TCP Library
net = require('net');

// Keep track of chat clients
var clients = [];

// Start a TCP Server
net.createServer(function (socket) {

  // Identify this client
  socket.name = socket.remoteAddress + ":" + socket.remotePort 

  // Put this new client to chat space
  clients.push(socket);

  // Send a nice welcome message and announce
  socket.write("Welcome " + socket.name + "\n");
  broadcast(socket.name + " joined the chat\n", socket);

  // Handle incoming messages from clients.
  socket.on('data', function (data) {
    broadcast(socket.name + "> " + data, socket);
  });

  // Remove the client from the list when it leaves
  socket.on('end', function () {
    clients.splice(clients.indexOf(socket), 1);
    broadcast(socket.name + " left the chat.\n");
  });
  
  // Send a message to all clients
  function broadcast(message, sender) {
    clients.forEach(function (client) {
      // Don't want to send it to sender
      if (client === sender) return;
      client.write(message);
    });
    // Log it to the server output too
    process.stdout.write(message)
  }

}).listen(5000);

*/

//Server setup
var net = require('net')

var server = new net.Server()
	, async = require('async')

    var users = [
        { username : 'john', pass : 'john' },
        { username : 'bob', pass : 'bob'},
        { username : 'steve', pass : 'steve' },
        { username : 'amjad', pass : 'amjad' }
    ]

var idCount = 0

server.on('connection', function (client) {

	var currentUser = {}
	currentUser.client = client
	currentUser.authenticated = false
	currentUser.publicKey = false

	//on each connection
	client.on('data', function(data){
		var string = data.toString().substring(0, data.length-1)

		//STEP1: the first thing we receive is the public key of our client
		if (!currentUser.publicKey){
			console.log(string)
			currentUser.publicKey = string

		//STEP2: then we receive his username and check with it is in our database or not
		} else if (!currentUser.username){

			var isValidUser = false
			for (var i = 0; i < users.length; i++) {
				if (users[i].username === string){
					isValidUser = true
					currentUser.username = string
					currentUser.index = i
					users[i].client = client
					users[i].publicKey = currentUser.publicKey
				}
			}

			if (!isValidUser){
				console.log('invalid user')
				currentUser.client.end("Invalid username")
			}

		//STEP3: then we receive his password and see it is valid
		} else if (currentUser.authenticated == false){

			if (users[currentUser.index].pass === string){
				console.log("Successful authentication")
				currentUser.authenticated = true

				//ASSIGN AN ID: if the user is valid we assign him with a special ID and give that id to him
				currentUser.id = users[currentUser.index].id = idCount;
				currentUser.client.write(idCount.toString())
				idCount ++;	


				//DISTRIBUTE MY PUB KEY:  we  send his public key to the other connecting clients
				users.forEach(function(receiver){
					if (receiver.client && receiver.client != currentUser.client){
						var message = "pub"
						message += currentUser.publicKey + '\n' 
						message += users[currentUser.index].username
						message += "-----END PUBLIC KEY-----\n"												
						message += currentUser.id.toString()
						receiver.client.write(message)
					}						
				})

				//SEND ME OTHER'S KEYS: then we send the new client the public keys of previous connected clients
				var message = 'pub'
				var empty = true

				for (var i = 0; i < users.length; i++) {
					var receiver = users[i]

					if (receiver.client && (receiver.publicKey != false) ) {
						message += receiver.publicKey + '\n'
						message += receiver.username
						message += "-----END PUBLIC KEY-----\n"						
						message += receiver.id.toString() + '\n'
						empty = false
					}
				}

				if (!empty){
					currentUser.client.write(message)
				}
									

			} else {
				console.log("Wrong password")
				currentUser.client.end("Wrong password")
			}

		//STEP4: PASS MESSAGES: after the user has authenticated, we pass messages sent by other users

		} else {

			//PASSING SESSION KEY MESSAGES: in case the message starts with 'sessionKey', then we are going to pass it to only one new client
			var string = data.toString()
			if (string.indexOf('sessionKey') >= 0){

				var result = string.split(':')
				console.log('passing session to:')
				console.log(result[1])

				var sessionUser
				users.forEach(function(user){
					if (user.id == result[1]) sessionUser = user
				})

				sessionUser.client.write(data)

			//PASSING NORMAL MESSAGES: this is the default case, where we broadcast the received message to all connecting clients
			} else {
				users.forEach(function(receiver){
					if (receiver.client)
						receiver.client.write(data)
				})
			}			
		}

	})


})


server.listen(4000)

//Client Stufff

var  net = require('net')
	, encryption = require('./../encryption')
	, ursa = require('ursa')
	, exec = require('child_process').exec
	, fs = require('fs')
	, sh = require('execSync')

var stdin =  process.openStdin()

var username, password, connection, privateKey, publicKey, otherPublicKey = false, userNames = [], certificate = false, myId, isNew = true

privateKey = ursa.generatePrivateKey()
publicKey = privateKey.toPublicPem().toString()

fs.writeFileSync('private-key.pem', privateKey.toPrivatePem().toString())


var receiveId = false
var otherPublicKeys = []
var sessionKey = 'asdf'

//THIS FUNCTION IS USED TO INITIALIZE THE CONNECTION BETWEEN THE CLIENT AND SERVER
function initialization(){
	//WE FIRST SEND THE PUBLIC KEY TO THE SERVER
	connection.write(publicKey)

	//THEN WE GET INPUT FROM THE USER
	console.log('Please enter your username!')	
	stdin.addListener('data', function(data){
		//WE RECEIVE THE USERNAME
		if (!username){
			username = data
			connection.write(username)
			console.log('Please enter your password')
		//THEN WE RECEIVE THE PASSWORD AND SEND IT
		} else if (!password) {
			password = data
			connection.write(password)
		//THEN WE FINALLY START SENDING DATA ENCRYPTED WITH THE SESSION KEY, ATTACHED WITH OUR ID AND OUR SIGNITURE
		//FORMAT: [signiature:userId:encryptedMessage]
		} else {
			connection.write(encryption.sign(data, privateKey) + ':' + myId.toString() + ':' +encryption.encryptAES(data, sessionKey))
		}
	})
}

/*
	FUNCTION TO PROCESS INCOMING DATA
	WE HAVE 4 BASIC INCOMING
	1) PUBLIC KEYS
	whenever a new user joins the chat group, we send his public key to all other connecting clients
	so that these clients can use this key to verify the digital signed messages sent by this client
	each public key is attached with the client id that it belongs to in addition to the username of 
	this client
	
	2) SESSION KEY
	whever a new client joins the chat group, his is sent a sessionKey that he should use to encrypt 
	that he should use to encrypt and decrypt all outgoing and incoming messages
    
    3) CLIENT ID
	each client has a unique id that he receives from the server. if the client has an id of 0, then
	he is the first client , and he is responsible for generating and distributing the sessino key
    
    4) CHAT MESSAGES
	after the chat user finally gets the session key, he starts sending and receiveing chat message.
	each message is composed of three parts: [signiture:userId:encryptedMessage]
*/
function input(data){



	var parsed = data.toString()
	var type = parsed.substring(0, 3)
	var string = parsed.substring(3, parsed.length)

	if (type === 'pub'){

		string.split('-----BEGIN PUBLIC KEY-----\n').forEach(function(message){

			if (message.length > 1){
				var isCertificate = true
				var isName = true
				var key, receivedIndex, receivedName

				message.split('-----END PUBLIC KEY-----\n').forEach(function(message){

					if (isCertificate){

						message = '-----BEGIN PUBLIC KEY-----\n' + message + '-----END PUBLIC KEY-----\n'
						key = ursa.createPublicKey(message)	
						isCertificate = false

					} else if (isName) {
						receivedName = message
						isName = false
					} else {
						receivedIndex = parseInt(message)
						otherPublicKeys[receivedIndex] = key	
						userNames[receivedIndex] = 	receivedName
						isCertificate = true
						isName = true
					}
				})

				console.log('========================================')
				console.log('SERVER: receiving key of client ' + receivedIndex)
				console.log(key.toPublicPem().toString().slice(0, -1))		
				console.log('========================================')

				//IF I AM THE SESSION ADMIN, I SHOULD SEND THE SESSION KEY TO THE NEW CONNECTING CLIENT				
				if (myId == 0 && receivedIndex != 0){
					connection.write('sessionKey:' + receivedIndex +  ':'+ encryption.encrypt(sessionKey, key))
				}						

			}
		})


	} else if (parsed.indexOf('sessionKey') >= 0){

		var result = string.split(':')
		sessionKey = encryption.decrypt(result[2], privateKey)

		console.log('========================================')
		console.log('SERVER: receiving session key: ' + sessionKey)
		console.log('========================================')
		

	} else if (isNew) {

		myId = parseInt(data.toString())
		console.log('SERVER: Your ID is: '+myId)
		isNew = false

	} else {

		var triple = data.toString().split(':') //converting the received buffer to a string
		var signiture = triple[0]
		var userId = parseInt(triple[1])
		var string = triple[2]

		var decryptedString = encryption.decryptAES(string, sessionKey)

		if (encryption.verify(decryptedString, signiture, otherPublicKeys[userId])){
			//removing /n character
			console.log("| " + userNames[userId] + ': ' + decryptedString.substr(0, decryptedString.length-1))

		} else {
			console.log('Error! The sent string has been changed!!!')
		}

	}
}

function connectServer(){
	connection = net.connect(4000, "localhost", initialization)
	connection.on('data', input)
}





/*

Transmit Proccess
1. Recieve an "Initialize Communication:" Message with the exchange key (create shared key)
2. Transmit a "Confirm Communication:" Message with your exchange key
3. Encrypt the File and wait for "Transmit FIle NOW" message
4. Transmit the Encrypted File
5. Transmit a "File Sent, TERMINATE" message
6. Delete the exchange keys = null
7. Delete encrypted file data

*/

// Encryption
var ursa = require('ursa');  
var fs = require("fs");
var crypto =require('crypto')
 

//ENCRYPT: RSA 1024 bit                                     
  
// Implement Functions
 
exports.encrypt = function (plaintext, key)  
{  
   return key.encrypt(plaintext, 'utf8', 'hex', ursa.RSA_PKCS1_OAEP_PADDING)

}  
 
exports.decrypt = function (encoded, key)  
{  
   return key.decrypt(encoded, 'hex', 'utf8', ursa.RSA_PKCS1_OAEP_PADDING)

}  

exports.encryptAES = function (text, key){
 var cipher = crypto.createCipher('aes-256-cbc', key)
 var crypted = cipher.update(text,'utf8','hex')
 crypted += cipher.final('hex');
 return crypted;
}

exports.decryptAES = function(text, key){
 var decipher = crypto.createDecipher('aes-256-cbc', key)
 var dec = decipher.update(text,'hex','utf8')
 dec += decipher.final('utf8');
 return dec;
}


exports.sign = function (data, privateKey){
 var signer = ursa.createSigner('sha256')
 signer.update(data, 'utf8')
 return signer.sign(privateKey, 'hex')
}

exports.verify = function(data, signiture, publicKey){
 var verifier = ursa.createVerifier('sha256')
 verifier.update(data, 'utf8')
 return verifier.verify(publicKey, signiture, 'hex')
} 













/*

Recieve Process
1. Verify file exists via Gun
2. Get comm info from Gun, THEN Transmit an "Initialize Communication:" Message with your exchange key
3. Wait to recieve a (Confirm communication message) with the exchange key (create shared key)
4. Transmit the "Transmit File Now" message
5. Wait for file message
6. wait for "FILE SENT, TERMINATE" message
7. Decrypt file
8. Delete the exchange keys = null
9. RETURN DECRYPTED FILE

*/


