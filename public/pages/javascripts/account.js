function successfulLogin() {
    var userType = document.getElementById("type").value;
    var googleUser = gapi.auth2.getAuthInstance().currentUser.get();
    let profile = googleUser.getBasicProfile();
    var user = {
        id_token: googleUser.getAuthResponse().id_token,
        userType: userType,
        createAccount: document.getElementById("CreateAccountCheckbox").checked,
    }
    if (!document.cookie.includes("LoggedIn=True")) {
        req = new XMLHttpRequest();
        req.onreadystatechange = function() {
            if (this.readyState == 4 && this.status == 200) {
                var res = JSON.parse(this.response);
                if (res.valid == true) {
                    var error = document.getElementsByClassName("error")[0];
                    error.style.display = "none";
                    var loggedOut = document.getElementById("notLogged");
                    loggedOut.style.display = "none";
                    var loggedIn = document.getElementById("LoggedIn");
                    loggedIn.style.display = "flex";
                    if (profile.getImageUrl() != null) {
                        var img = document.getElementById("UserImage");
                        img.style.backgroundImage = "url(" + profile.getImageUrl() + ")"
                    }
                    if (profile.getFamilyName()) {
                        var username = document.getElementById("UserName");
                        username.innerText = "Bine ati venit ";
                        if (document.cookie.includes("userType=Doctor")) {
                            username.innerText += " doctor ";
                        }
                        username.innerText += " " + profile.getFamilyName();
                    }
                    document.cookie = "LoggedIn=True";
                    document.cookie = "userType=" + userType;
                } else {
                    var loggedOut = document.getElementById("notLogged");
                    loggedOut.style.display = "flex";
                    var loggedIn = document.getElementById("LoggedIn");
                    loggedIn.style.display = "none";
                    var error = document.getElementsByClassName("error")[0];
                    error.style.display = "initial";
                    error.innerText = res.reason;
                    var auth2 = gapi.auth2.getAuthInstance();
                    auth2.signOut().then(function() {
                        console.log('User signed out.');
                    });
                }
            }
        }
        req.open("POST", "/login.html", true);
        req.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
        req.send(JSON.stringify(user));

    } else {
        var error = document.getElementsByClassName("error")[0];
        error.style.display = "none";
        var loggedOut = document.getElementById("notLogged");
        loggedOut.style.display = "none";
        var loggedIn = document.getElementById("LoggedIn");
        loggedIn.style.display = "flex";
        if (profile.getImageUrl() != null) {
            var img = document.getElementById("UserImage");
            img.style.backgroundImage = "url(" + profile.getImageUrl() + ")"
        }
        if (profile.getFamilyName()) {
            var username = document.getElementById("UserName");
            username.innerText = "Bine ati venit ";
            if (document.cookie.includes("userType=Doctor")) {
                username.innerText += " doctor ";
            }
            username.innerText += " " + profile.getFamilyName();
            console.log(googleUser)
        }
    }
}

function signOut() {
    var auth2 = gapi.auth2.getAuthInstance();
    auth2.signOut();
    req = new XMLHttpRequest();
    req.open("POST", "/logout.html", true);
    req.send();
    document.cookie = "LoggedIn=False";
    document.cookie = "userType=None";
    window.location.reload();
}


function SelectChanged() {
    var type = document.getElementById("type");
    var checkbox = document.getElementById("createAccount")
    console.log(type.value)
    if (type.value == "Pacient") {
        checkbox.style.display = "initial";
    } else {
        checkbox.style.display = "none";
    }
}