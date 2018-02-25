const moniker = require("moniker");
const Peer = require("peer");

const userID = getParameterByName("user");
var spaceID = "";
var spaceHost = "";
var spacePort = 0;

// List of other peers known
var peers = {};

if (getParameterByName("new") == "1") {
    // *** create a new space ***
    // Choose an Identifier
    spaceID = moniker.choose();
    // Set the hostname to local
    spaceHost = "localhost";
    // Choose a Port
    spacePort = Math.floor(Math.random() * (11000 - 9000) + 9000);
    // Create the PeerServer
    var PeerServer = Peer.PeerServer({
        port: spacePort,
        path: "/" + spaceID
    });

    PeerServer.on("connection", function(id) {
        peers[id]=1;
    });

    PeerServer.on("disconnect", function(id) {
        peers[id]=0;
        delete peers[id];
    })
} else {
    // join an existing space
    spaceID = getParameterByName("sid");
    spaceHost = getParameterByName("shost");
    spacePort = Number(getParameterByName("sport"));
}
console.log(userID, spaceHost, spacePort, spaceID);

// Join the PeerServer
var PeerClient = new PeerClient(userID, {host: spaceHost, port: spacePort, path: "/" + spaceID, debug: 3});
PeerClient.on('error', function(err) {
    alert(err);
    document.location.href="index.html";
});
PeerClient.on('open', function(id) {
    console.log('My peer ID is: ' + id);
});
PeerClient.on('connection', function(conn) {
    conn.on('open', function() {
    // Receive messages
    conn.on('data', function(data) {
        console.log('Received', data);
    });
    
    // Send messages
    conn.send('Hello!');
    });
});