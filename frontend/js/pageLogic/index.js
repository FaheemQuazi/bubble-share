const os = require("os");

document.querySelector("#frmUserId").value = os.userInfo().username;

function createNewSpace() {
    document.location.href='space.html?new=1&user=' + document.querySelector("#frmUserId").value;
}

function joinSpace() {
    document.location.href='join.html?new=1&user=' + document.querySelector("#frmUserId").value;
}