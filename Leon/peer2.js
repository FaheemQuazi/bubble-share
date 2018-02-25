
// var peer1 = new Peer('lwjd5qra8257b9');

// $(document).ready(function() {
//   // Prepare file drop box.
//   var box = $('#box');
//   box.on('dragenter', doNothing);
//   box.on('dragover', doNothing);
//   box.on('drop', function(e){
//     e.originalEvent.preventDefault();
//     console.log("Send file code reached");
//     var file = e.originalEvent.dataTransfer.files[0];
//     sendFile(file);
//         // $c.find('.messages').append('<div><span class="file">You sent a file.</span></div>');
//   });
//   function doNothing(e){
//     e.preventDefault();
//     e.stopPropagation();
//   }
// };


// construct peer
var peer2 = new PeerClient('lazy-dog');

// get peer id, for kicks
peer2.on('open', function(id) {
  console.log('Peer2 peer ID is: ' + id);
});

// connec to hard-coded peer
// var conn = peer.connect('');

peer2.on('connection', function(conn) {

  conn.on('error', function(error) {
    alert(error);
  });

  // send file upon successful connection
  // conn.on('open', function() {
  //   conn.send(file);
  // });

  // get url for file upon receipt
  conn.on('data', function(data) {
    if (data.constructor === ArrayBuffer) {
      var dataView = new Uint8Array(data);
      var dataBlob = new Blob([dataView]);
      var url = window.URL.createObjectURL(dataBlob);
      // $('#' + c.peer).find('.messages').append('<div><span class="file">' +
      //     c.peer + ' has sent you a <a target="_blank" href="' + url + '">file</a>.</span></div>');
    }
  });

});
