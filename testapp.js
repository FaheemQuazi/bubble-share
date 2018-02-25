var Gun = require('gun');
var gun = Gun();

var x = 0;

setInterval(function() {
    gun.get("test").put({"Faheem": x});
    x = x + 1;
}, 1000)

gun.get("test").on(function(data, key) {
    console.log(data)
    console.log(key)
})