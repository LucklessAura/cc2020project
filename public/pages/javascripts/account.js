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
                    document.cookie = "LoggedIn=True";
                    document.cookie = "userType=" + userType;
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
        req.open("POST", "/login", true);
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

    gapi.load("client:auth2", function() {
        auth2 = gapi.auth2.init({
            client_id: "813562380833-v0273o7adbgtedm4s3udrurdiphjpfm6.apps.googleusercontent.com",
            'scope': 'profile'
        }).then(function() {
            var googleUser = gapi.auth2.getAuthInstance().currentUser.get();
            try {
                isLoggedIn = true
                if (googleUser != undefined) {
                    let profile = googleUser.getBasicProfile();
                    var given_name = profile.getName();
                    var family_name = profile.getFamilyName();
                    given_name = given_name.replace(family_name, "")
                    console.log("Name: ")
                    console.log(given_name);
                    console.log(family_name);
                    if (document.cookie.includes("userType=Doctor")) {
                        console.log("Doctor");
                        $.get("/getDoctorAppointments?family_name=" + family_name + "&given_name=" + given_name, appointments => {
                            console.log(appointments);
                            var table = document.getElementById("AppointmentsTable");
                            var row = table.insertRow(0);
                            var cell1 = row.insertCell(0);
                            var cell2 = row.insertCell(1);
                            var cell3 = row.insertCell(2);
                            cell1.innerHTML = "Patient";
                            cell2.innerHTML = "Date";
                            cell3.innerHTML = "Time";
                            if (appointments.length == 0){
                                var table = document.getElementById("AppointmentsTable");
                                var row = table.insertRow(1);
                                var cell_name = row.insertCell(0);
                                var cell_day = row.insertCell(1);
                                var cell_time = row.insertCell(2);
                                cell_name.innerHTML = "None";
                                cell_day.innerHTML = "";
                                cell_time.innerHTML = "";
                            }
                            appointments.forEach(appointment => {
                                var patient_name = appointment.family_name + " " + appointment.given_name;
                                var date = appointment.date;
                                date = date.split("T");
                                var day = date[0];
                                var time = date[1];
                                var table = document.getElementById("AppointmentsTable");
                                var row = table.insertRow(1);
                                var cell_name = row.insertCell(0);
                                var cell_day = row.insertCell(1);
                                var cell_time = row.insertCell(2);
                                cell_name.innerHTML = patient_name;
                                cell_day.innerHTML = day;
                                cell_time.innerHTML = time.substring(0, 5);
                            })
                        })
                        $.get("/getDoctorPrescriptions?family_name=" + family_name + "&given_name=" + given_name, prescriptions => {
                            console.log(prescriptions);
                            var table = document.getElementById("PrescriptionsTable");
                            var row = table.insertRow(0);
                            var cell1 = row.insertCell(0);
                            var cell2 = row.insertCell(1);
                            var cell3 = row.insertCell(2);
                            var cell4 = row.insertCell(3);
                            cell1.innerHTML = "Patient";
                            cell2.innerHTML = "Start";
                            cell3.innerHTML = "End";
                            cell4.innerHTML = "Interval";
                            if(prescriptions.length == 0) {
                                var table = document.getElementById("PrescriptionsTable");
                                var row = table.insertRow(1);
                                var cell_name = row.insertCell(0);
                                var cell_start = row.insertCell(1);
                                var cell_end = row.insertCell(2);
                                var cell_interval = row.insertCell(3);
                                cell_name.innerHTML = "None";
                                cell_start.innerHTML = "";
                                cell_end.innerHTML = "";
                                cell_interval.innerHTML = "";
                            }
                            prescriptions.forEach(prescription => {
                                var patient_name = prescription.family_name + " " + prescription.given_name;
                                var start_date = prescription.start_date.split("T")[0];
                                var end_date = prescription.end_date.split("T")[0];
                                var interval = prescription.minutes_interval;
                                var table = document.getElementById("PrescriptionsTable");
                                var row = table.insertRow(1);
                                var cell_name = row.insertCell(0);
                                var cell_start = row.insertCell(1);
                                var cell_end = row.insertCell(2);
                                var cell_interval = row.insertCell(3);
                                cell_name.innerHTML = patient_name;
                                cell_start.innerHTML = start_date;
                                cell_end.innerHTML = end_date;
                                cell_interval.innerHTML = interval;
                            })
                        })

                    }else{
                        console.log("Patient");
                        $.get("/getPatientAppointments?family_name=" + family_name + "&given_name=" + given_name, appointments => {
                            console.log(appointments);
                            var table = document.getElementById("AppointmentsTable");
                            var row = table.insertRow(0);
                            var cell1 = row.insertCell(0);
                            var cell2 = row.insertCell(1);
                            var cell3 = row.insertCell(2);
                            cell1.innerHTML = "Doctor";
                            cell2.innerHTML = "Date";
                            cell3.innerHTML = "Time";
                            if (appointments.length == 0){
                                var table = document.getElementById("AppointmentsTable");
                                var row = table.insertRow(1);
                                var cell_name = row.insertCell(0);
                                var cell_day = row.insertCell(1);
                                var cell_time = row.insertCell(2);
                                cell_name.innerHTML = "None";
                                cell_day.innerHTML = "";
                                cell_time.innerHTML = "";
                            }
                            appointments.forEach(appointment => {
                                var doctor_name = appointment.family_name + " " + appointment.given_name;
                                var date = appointment.date;
                                date = date.split("T");
                                var day = date[0];
                                var time = date[1];
                                var table = document.getElementById("AppointmentsTable");
                                var row = table.insertRow(1);
                                var cell_name = row.insertCell(0);
                                var cell_day = row.insertCell(1);
                                var cell_time = row.insertCell(2);
                                cell_name.innerHTML = doctor_name;
                                cell_day.innerHTML = day;
                                cell_time.innerHTML = time.substring(0, 5);
                            })
                        })
                        $.get("/getPatientPrescriptions?family_name=" + family_name + "&given_name=" + given_name, prescriptions => {
                            console.log(prescriptions);
                            var table = document.getElementById("PrescriptionsTable");
                            var row = table.insertRow(0);
                            var cell1 = row.insertCell(0);
                            var cell2 = row.insertCell(1);
                            var cell3 = row.insertCell(2);
                            var cell4 = row.insertCell(3);
                            cell1.innerHTML = "Doctor";
                            cell2.innerHTML = "Start";
                            cell3.innerHTML = "End";
                            cell4.innerHTML = "Interval";
                            if (prescriptions.length == 0){
                                var table = document.getElementById("PrescriptionsTable");
                                var row = table.insertRow(1);
                                var cell_name = row.insertCell(0);
                                var cell_start = row.insertCell(1);
                                var cell_end = row.insertCell(2);
                                var cell_interval = row.insertCell(3);
                                cell_name.innerHTML = "None";
                                cell_start.innerHTML = "";
                                cell_end.innerHTML = "";
                                cell_interval.innerHTML = "";
                            }
                            prescriptions.forEach(prescription => {
                                var doctor_name = prescription.family_name + " " + prescription.given_name;
                                var start_date = prescription.start_date.split("T")[0];
                                var end_date = prescription.end_date.split("T")[0];
                                var interval = prescription.minutes_interval;
                                var table = document.getElementById("PrescriptionsTable");
                                var row = table.insertRow(1);
                                var cell_name = row.insertCell(0);
                                var cell_start = row.insertCell(1);
                                var cell_end = row.insertCell(2);
                                var cell_interval = row.insertCell(3);
                                cell_name.innerHTML = doctor_name;
                                cell_start.innerHTML = start_date;
                                cell_end.innerHTML = end_date;
                                cell_interval.innerHTML = interval;
                            })
                        })    
                    }

                }
            } catch (err) {
                isLoggedIn = false
            }
        })
    });
}


function signOut() {
    var auth2 = gapi.auth2.getAuthInstance();
    auth2.signOut();
    req = new XMLHttpRequest();
    req.open("POST", "/logout", true);
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
