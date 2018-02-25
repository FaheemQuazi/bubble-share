const moniker = require("moniker");
const Peer = require("peer");
const hash = require("object-hash");

const userID = getParameterByName("user");
var spaceID = "";
var spaceHost = "";
var spacePort = 0;

if (getParameterByName("new") == "1") {
    // *** create a new space ***
    // Choose an Identifier
    spaceID = moniker.choose();
    // Set the hostname to local
    spaceHost = "localhost";
    // Choose a Port
    spacePort = Math.floor(Math.random() * (11000 - 9000) + 9000);

    // List of other peers known
    var peers = {};
    // List of files shared
    var files = {};

    // Create the PeerServer
    var PeerServer = Peer.PeerServer({
        port: spacePort,
        path: "/" + spaceID
    });

    PeerServer.on("connection", function(id) {
        if (id != "MASTER") peers[id]=1;
    });

    PeerServer.on("disconnect", function(id) {
        if (id != "MASTER") {
            peers[id]=0;
            delete peers[id];
        }
    });

    // create the master client that other peers communicate with for handshaking
    var MasterClient = new PeerClient("MASTER", {host: spaceHost, port: spacePort, path: "/" + spaceID, debug: 0});
    MasterClient.on("error", function(err) {
        alert(err);
        document.location.href="index.html";
    });
    MasterClient.on("open", function(id) {
        console.log("INITIALIZE MASTER CLIENT");
    });
    // when a peer connects to master
    MasterClient.on("connection", function(conn) {
        conn.on("open", function() {
            console.log("Master: Connection opened with " + conn.peer);
        });

        conn.on("data", function(data) {
            console.log("Data Received:", data);
            
        });

        conn.on("error", function(err) {
            console.error("CONNERROR:" + conn.peer + ":" + err)
        });

        conn.on("close", function() {
            console.log("Connection closed with " + conn.peer);
        });
    })
} else {
    // join an existing space
    spaceID = getParameterByName("sid");
    spaceHost = getParameterByName("shost");
    spacePort = Number(getParameterByName("sport"));
}

console.log(userID, spaceHost, spacePort, spaceID);

// store references of all locally shared files here
var sharedFiles = {}

// Join the PeerServer
var pc = new PeerClient(userID, {host: spaceHost, port: spacePort, path: "/" + spaceID, debug: 0});
pc.on('error', function(err) {
    alert(err);
    document.location.href="index.html";
});
pc.on('open', function(id) {
    var realHost = spaceHost;
    if (spaceHost == "localhost") {
        realHost = require('ip').address();
        document.querySelector("#IdentifierField").innerHTML = "Your Space Identifier:&nbsp;&nbsp;<b>" + realHost + ":" + spacePort + ":" + spaceID + "</b>";
    } else {
        document.querySelector("#IdentifierField").innerHTML = "Connected To:&nbsp;&nbsp;<b>" + realHost + ":" + spacePort + ":" + spaceID + "</b>";
    }
    
    console.log('Client peer ID: ' + id);
});
pc.on('connection', function(conn) {
    if (conn.peer == "MASTER") {
        // for connections with master
        conn.on("open", function() {
            console.log("Connection with Master Initiated");
        });
        conn.on("error", function(err) {
            console.error("CONNERROR:MASTER:" + err);
        });
        conn.on("data", function(data) {
            console.log("data");
        })
    } else {
        // for connections with peers
    }
});

var dropzone = document.querySelector("#dropZone");
    dropzone.ondragover = () => {
        return false;
    };

    dropzone.ondragleave = () => {
        return false;
    };

    dropzone.ondragend = () => {
        return false;
    };

    dropzone.ondrop = (e) => {
        e.preventDefault();
        var files = e.dataTransfer.files;
        console.log(files);

        var conn = pc.connect("MASTER");
        conn.on('open', function() {
            var sendToMaster = []
            for (let f of files) {
                var id = hash(Date.now());
                sharedFiles[id] = f;
                sendToMaster.push({
                    identifier: id,
                    name: f.name
                });
            }
            console.log(sendToMaster);

            conn.send({
                "CMD": "UPDATEFILES",
                "ARG": sendToMaster
            });
            conn.close();
        });
        
        return false;
    };