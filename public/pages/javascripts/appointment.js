const messageContainer = document.getElementById('message-container')
const roomContainer = document.getElementById('room-container')
const messageForm = document.getElementById('send-container')
const messageInput = document.getElementById('message-input')
const socket = io({
                    transports: ['polling']
                })

var isLoggedIn = false

gapi.load("client:auth2", function() {
    auth2 = gapi.auth2.init({
        client_id: "813562380833-v0273o7adbgtedm4s3udrurdiphjpfm6.apps.googleusercontent.com",
        'scope': 'profile'
    }).then(function () {
        var googleUser = gapi.auth2.getAuthInstance().currentUser.get();
        try{
            isLoggedIn = true
            if(googleUser != undefined){
                let profile = googleUser.getBasicProfile();
                socket.emit("logged-in", profile.getName())
                
                if (messageForm != null){
                    socket.emit("new-user", roomName)
                
                    messageForm.addEventListener('submit', e => {
                        e.preventDefault()
                        const message = messageInput.value
                        appendMessage(`You: ${message}`)
                        socket.emit('send-chat-message', roomName, message)
                        messageInput.value = ''
                    })
                }
            }
            populateHospitals();
        }
        catch(err) {
            isLoggedIn = false
            try{
                var returnedMessage = document.getElementById("returnedMessage")
                returnedMessage.innerHTML = "Pentru a face o programare este necesara autentificare cu un cont."
                returnedMessage.style = "color: red";
            }
            catch {}
        }
    })
});

socket.on('chat-message', data => {
     appendMessage(`${data.name}: ${data.message}`)
});

socket.on('user-connected', name => {
    appendMessage(`${name} s-a conectat.`)
});

socket.on('user-disconnected', name => {
    appendMessage(`${name} s-a deconectat.`)
});

socket.on('user-unavailable', name => {
    appendMessage(`${name} nu este disponibil.`)
})

socket.on('room-created', room => {
    const roomElement = document.createElement('div')
    roomElement.innerText = room
    const roomLink = document.createElement('a')
    roomLink.href = `/${room}`
    roomLink.innerText = "Join"
    roomContainer.append(roomElement)
    roomContainer.append(roomLink)
});

socket.on('request-doctor-availability', requester => {
    authenticate().then(loadClient()).then(function() {
        getDoctorAvailability().then(function(res){
            var dates = res
            socket.emit("response-doctor-availability", dates, requester);
        })
    })
})

socket.on('doctor-add-appointment', data =>{
    insertAppointment(data.start, data.end, true);
})

socket.on('room-invite', data => {
    if(confirm("Sunteti invitat la programare. Daca refuzati, veti fi invitat din nou peste 15 minute.")) {
        window.location.href = '/' + data.roomName
    }
    else{
        socket.emit("invite-rejected", {roomName: data.roomName, memberName:data.memberName});
    }
})

socket.on('room-invite-2', data => {
    if(confirm("Sunteti invitat la programare.")) {
        window.location.href = "/" + data.roomName
    }
    else {
        socket.emit("invite-rejected2", {roomName: data.roomName, memberName:data.memberName});
    }
})


socket.on('getTime', dates => {
    document.getElementById('loader').hidden = true
    var labelDate = document.getElementById("dates-label")
    var selectDate = document.getElementById("dates")
    labelDate.hidden = false;
    selectDate.hidden = false;
    
    dates.forEach(date => {
        var aux = new Date(date)
        var createdOption = document.createElement("option");
        createdOption.text = aux.toString();
        selectDate.add(createdOption);  
    });

    if(selectDate.length == 0){
        var returnedMessage = document.getElementById("returnedMessage")
        returnedMessage.innerHTML = "Medicul selectat nu este online."
        returnedMessage.style = "color: red";
    }
})

function appendMessage(message){
    const messageElement = document.createElement('div')
    messageElement.innerText = message
    messageContainer.append(messageElement)
}

      
function authenticate() {
    return gapi.auth2.getAuthInstance()
        .signIn({scope: "https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/plus.login"})
        .then(function() { console.log("Sign-in successful"); },
              function(err) { console.error("Error signing in", err); });
} 

function loadClient() {
    gapi.client.setApiKey('AIzaSyCLMI60gh3A2gk8NGXtsB8_HUymue0ERpU');
    return gapi.client.load("https://content.googleapis.com/discovery/v1/apis/calendar/v3/rest")
        .then(function() { 
            console.log("GAPI client loaded for API");
        },  
        function(err) { console.error("Error loading GAPI client for API", err); });
}

function checkAvailability() {

    authenticate().then(loadClient()).then(function() {
        var returnedMessage = document.getElementById("returnedMessage");
        var dateSelect = document.getElementById("dates");
        var eventDate = new Date(dateSelect.options[dateSelect.selectedIndex].text);  
        var eventStartTime = new Date(eventDate);
        var eventEndTime = new Date (eventDate);
        var appointmentForm = document.getElementById("make-appointment");
        eventEndTime.setMinutes(eventEndTime.getMinutes() + 60);
    
        appointmentForm.addEventListener('submit', e => {
            e.preventDefault()
        })
            
        return gapi.client.calendar.freebusy.query({
            "resource":{
                timeMin: eventStartTime,
                timeMax: eventEndTime,
                timeZone: 'Europe/Bucharest',
                items: [{id: 'primary'}]
            }
        })
            .then(
            function(response){
                var eventsArr = response.result.calendars.primary.busy;
            
                if(eventsArr.length === 0) 
                    insertAppointment(eventStartTime, eventEndTime, false);
                else{
                    returnedMessage.innerHTML = "Calendarul dumneavoastra nu este liber intre orele " + eventStartTime + " si " + eventEndTime
                }
            },
            function(err){
                returnedMessage.innerHTML = "Time validation error.";
                console.error("Time validation error", err);
        });
    })
    
}

async function getDoctorAvailability() {
    var dates = new Array();
    
    var startTime = new Date();
    startTime.setHours(startTime.getHours() + 1);
    startTime.setMinutes(0);
    var endTime = new Date(startTime);
    endTime.setHours(endTime.getHours() + 1);
        
    while (dates.length < 10)
    {
        await gapi.client.calendar.freebusy.query({
            "resource":{
                timeMin: startTime,
                timeMax: endTime,
                timeZone: 'Europe/Bucharest',
                items: [{id: 'primary'}]
            }
        })
        .then(
            function(response){
                var eventsArr = response.result.calendars.primary.busy;
                if(eventsArr.length === 0) {
                    if(endTime.getHours() >= 16 || startTime.getHours() >= 15){
                        startTime.setHours(startTime.getHours() + (8 - startTime.getHours()) % 24)
                        startTime.setDate(startTime.getDate() + 1)
                        endTime.setDate(endTime.getDate() + 1)
                        endTime.setHours(startTime.getHours() + 1)
                    }
                    else {
                        startTime.setHours(startTime.getHours() + 1);
                        endTime.setHours(endTime.getHours() + 1);
                    }
                    dates.push(new Date(startTime));
                }
            },
            function(err){
                console.log(err)
            }
        );

    }
    return dates;
}

function insertAppointment(eventStartTime, eventEndTime, isDoctor) {
    
    if(isDoctor){
        var description = "";
    }
    else {
        var hospitalsForm = document.getElementById("hospitals")
        var hospital = hospitalsForm.options[hospitalsForm.selectedIndex].value
        var doctorsForm = document.getElementById("doctors")
        var doctor = doctorsForm.options[doctorsForm.selectedIndex].value
        var description = "Ati programat un consult cu Dr. " + doctor
    }

    const event = {
        summary: 'Programare medicala',
        location: hospital,
        description: description,
        start: {
            dateTime: eventStartTime,
            timeZone: 'Europe/Bucharest'
        },
        end: {
            dateTime: eventEndTime,
            timeZone: 'Europe/Bucharest'
        },
        colorId: 10,
    } 
    
    return gapi.client.calendar.events.insert({calendarId: 'primary', resource: event})
    .then(function(response) {
        if(!isDoctor) {
            var returnedMessage = document.getElementById("returnedMessage");
            var doctors = document.getElementById("doctors");
            var doctor = doctors.options[doctors.selectedIndex].value;
            returnedMessage.innerHTML = ("Event added.");
            $.ajax({
                url: '/finishAppointment',
                type: "POST",
                data: JSON.stringify({ doctorName: doctor, start: eventStartTime, end: eventEndTime}),
                contentType: "application/json; charset=utf-8",
                dataType: "json"
            })
        }
    },
    function(err) {
        if(!isDoctor)
            returnedMessage.innerHTML = "Execute error";
    });
}

function populateHospitals() {
    $.get("/getAllHospitals", hospitals => {
        var selectHospitals = $("#hospitals")
        hospitals.forEach(hospital => {
            var createdOption = new Option(hospital.name);
            selectHospitals.append(createdOption);
        });
    })
}

function populateDoctors() {
    clearReturnedMessage()
    var retrievedDoctors = [];
    var selectHospitals = document.getElementById("hospitals")
    var hospital = selectHospitals.options[selectHospitals.selectedIndex].value;
    var labelDoctors = document.getElementById("doctors-label")
    var selectDoctors = document.getElementById("doctors")

    selectDoctors.length = 0;
    var defaultOption = document.createElement("option");
    defaultOption.text = "--";
    selectDoctors.add(defaultOption);

    var url = "/getDoctors/" + hospital;
    $.get(url, retrievedDoctors => {
        retrievedDoctors.forEach(doctor => {
            var createdOption = new Option(doctor.given_name + " " + doctor.family_name);
            selectDoctors.append(createdOption);
        });
    })

    labelDoctors.hidden = false
    selectDoctors.hidden = false;
}

function populateTime() {
    var loader = document.getElementById('loader')
    loader.hidden = false;
    clearReturnedMessage()
    var retrievedAvailableDates = [];
    var selectDoctors = document.getElementById('doctors')
    var doctor = selectDoctors.options[selectDoctors.selectedIndex].value;
    var labelDate = document.getElementById("dates-label")
    var selectDate = document.getElementById("dates")
    var url = "/getTime/" + doctor;

    if(doctor != "--")
    socket.emit('getTime', doctor);

    setTimeout(awaitResponse, 3500)
}

function awaitResponse(){    
    var dates = document.getElementById("dates");
    if(dates.hidden == true){
        var returnedMessage = document.getElementById("returnedMessage")
        returnedMessage.innerHTML = "Medicul selectat nu este online."
        returnedMessage.style = "color: red";
    }
    else{
        makeSubmitAvaialable()
    }
    document.getElementById('loader').hidden = true
}

function clearReturnedMessage(){
    var returnedMessage = document.getElementById("returnedMessage")
    returnedMessage.innerHTML = "";
    returnedMessage.style = "";
}

function makeSubmitAvaialable() {
    document.getElementById("submit-button").disabled = false;
}