console.log(location);
username = getParameterByName("user");

function verifyAndJoinSpace() {
    ttt = document.querySelector("#frmSpaceID").value.split(":");
    document.location.href="space.html?new=0&shost=" + ttt[0] + "&sport=" + ttt[1] + "&sid=" + ttt[2] + "&user=" + username;
}