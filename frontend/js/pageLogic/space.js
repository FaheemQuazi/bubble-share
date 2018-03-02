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

    // create the master client that other peers communicate with for handshaking
    var MasterClient = new PeerClient("MASTER", {host: spaceHost, port: spacePort, path: "/" + spaceID, debug: 0});

    PeerServer.on("connection", function(id) {
        if (id != "MASTER") {
            peers[id]=1;
            files[id]={};

            peerRef = MasterClient.connect(id);
            peerRef.on("open", function() {
                peerRef.send({
                    CMD: "UPDATEFILELIST",
                    ARG: files
                });
                setTimeout(function() {
                    peerRef.close();
                }, 2000);
            })
        }
    });

    PeerServer.on("disconnect", function(id) {
        if (id != "MASTER") {
            peers[id]=0;
            delete peers[id];
            files[id]={};
            delete files[id];

            Object.keys(peers).forEach(function(p) {
                if (p != "MASTER" && peers[p] == 1 && files[id] != {}) {
                    peerRef = MasterClient.connect(p);
                    peerRef.on("open", function() {
                        peerRef.send({
                            CMD: "UPDATEFILELIST",
                            ARG: files
                        });
                        setTimeout(function() {
                            peerRef.close();
                        }, 2000);
                    })
                }
            });
        }
    });

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
            switch (data.CMD) {
                case "ADDFILES":
                    // update the files object
                    data.ARG.forEach(function(f) {
                        files[conn.peer][f.identifier] = f.name;
                    });
                    break;
                case "REMFILE":
                    delete files[conn.peer][data.ARG];
                    break;
                default:
                    break;
            }
            // send the updated files object to every peer 
            Object.keys(peers).forEach(function(p) {
                if (p != "MASTER" && peers[p] == 1) {
                    peerRef = MasterClient.connect(p);
                    peerRef.on("open", function() {
                        peerRef.send({
                            CMD: "UPDATEFILELIST",
                            ARG: files
                        });
                        setTimeout(function() {
                            peerRef.close();
                        }, 2000);
                    })
                }
            });

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

// custom file row element
class fileItem extends HTMLElement {
    constructor() {
        super()
    }

    connectedCallback() {
        var saveData = (function () {
            var a = document.createElement("a");
            document.body.appendChild(a);
            a.style = "display: none";
            return function (url, fileName) {
                a.href = url;
                a.download = fileName;
                a.click();
                window.URL.revokeObjectURL(url);
            };
        }());

        this.name = document.createElement("div");
        this.name.classList.add("fileitem-name");
        this.name.innerHTML = this.getAttribute("name");
        this.appendChild(this.name);
        
        this.owner = document.createElement("div");
        this.owner.classList.add("fileitem-owner");
        this.owner.innerHTML = this.getAttribute("owner");
        this.appendChild(this.owner);

        var self = this;

        if (this.getAttribute("owner") != userID) {
            this.download = document.createElement("button");
            this.download.innerHTML = "Download This File";
            this.download.onclick = function() {
                var getFromMe = pc.connect(self.getAttribute("owner"));
                getFromMe.on("open", function() {
                    getFromMe.send({
                        CMD: "GIVEMEFILE",
                        ARG: self.getAttribute("identifier")
                    })
                });
                getFromMe.on("data", function(data) {
                    console.log("DATA");
                    if (data.constructor === ArrayBuffer) {
                        var dataView = new Uint8Array(data);
                        var dataBlob = new Blob([dataView]);
                        var url = window.URL.createObjectURL(dataBlob);
                        saveData(url, self.getAttribute("name"));
                    }
                    setTimeout(function() {
                        getFromMe.close();
                    }, 2000);
                })
            }
            this.appendChild(this.download);
        } else {
            this.remove = document.createElement("button");
            this.remove.innerHTML = "Remove This File";
            this.remove.onclick = function() {
                delete sharedFiles[self.getAttribute("identifier")];

                var conn = pc.connect("MASTER");
                conn.on("open", function() {
                    conn.send({
                        CMD: "REMFILE",
                        ARG: self.getAttribute("identifier")
                    })
                });
            }
            this.appendChild(this.remove);
        }
    }
    
}
customElements.define("file-item", fileItem);

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

    // File Drop Zone Handler
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
                    "CMD": "ADDFILES",
                    "ARG": sendToMaster
                });
                setTimeout(function() {
                    conn.close();
                }, 2000)
            });
            
            return false;
        };
    
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
            console.log("Recieved Data From Master:", data);
            switch (data.CMD) {
                case "UPDATEFILELIST":
                    console.log("XY");
                    document.querySelectorAll("#FileList > file-item").forEach(function(fi) {
                        fi.parentNode.removeChild(fi);
                    });
                    document.querySelector("#FileList").innerHTML = "";
                    if (data.ARG == {}) {
                        document.querySelector("#FileList").innerHTML = "No Files Uploaded Yet. You can be the first!";
                        console.log("EMPTY ARG");
                        break;
                    }
                    for (var pn in data.ARG) {

                        if (data.ARG.hasOwnProperty(pn)) {

                            for (var fi in data.ARG[pn]) {

                                var fileItem = document.createElement("file-item");
                                fileItem.setAttribute("name", data.ARG[pn][fi]);
                                fileItem.setAttribute("identifier", fi);
                                fileItem.setAttribute("owner", pn);
                                document.querySelector("#FileList").appendChild(fileItem);

                            }

                        }

                    }
                    break;
            
                default:
                    break;
            }
        })
    } else {
        // for connections with peers
        conn.on("open", function() {
            console.log("Connection with " + conn.peer + " started");
        });
        conn.on("error", function(err) {
            console.error("CONNERROR:" + con.peer + ":" + err);
        });
        conn.on("data", function(data) {
            console.log(data);
            if (data.CMD == "GIVEMEFILE") {
                var file = sharedFiles[data.ARG];
                conn.send(file);
            }
        })
        
    }
});