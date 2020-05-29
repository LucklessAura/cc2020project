const messageContainer = document.getElementById('message-container')
const roomContainer = document.getElementById('room-container')
const messageForm = document.getElementById('send-container')
const messageInput = document.getElementById('message-input')
const socket = io({
                    transports: ['polling']
                })


if (messageForm != null){

    const name = prompt("What is your name?")
    
    appendMessage('You joined')
    socket.emit('new-user', roomName, name)

    messageForm.addEventListener('submit', e => {
        e.preventDefault()
        const message = messageInput.value
        appendMessage(`You: ${message}`)
        socket.emit('send-chat-message', roomName, message)
        messageInput.value = ''
    })
}


gapi.load("client:auth2", function() {
    auth2 = gapi.auth2.init({
        client_id: "813562380833-v0273o7adbgtedm4s3udrurdiphjpfm6.apps.googleusercontent.com",
        'scope': 'profile'
    }).then(function () {
        var googleUser = gapi.auth2.getAuthInstance().currentUser.get();
        if(googleUser != undefined){
            let profile = googleUser.getBasicProfile();
            socket.emit("logged-in", profile.getName())
        }
    })
});

socket.on('chat-message', data => {
     appendMessage(`${data.name}: ${data.message}`)
});

socket.on('user-connected', name => {
    appendMessage(`${name} connected`)
});

socket.on('user-disconnected', name => {
    appendMessage(`${name} disconnected`)
});

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
    console.log("Received request")
    authenticate().then(loadClient()).then(function() {
        getDoctorAvailability().then(function(res){
            var dates = res
            console.log(dates)
            console.log(dates.length)
            socket.emit("response-doctor-availability", dates, requester);
            console.log("Emis response")
        })
    })
})

socket.on('doctor-add-appointment', data =>{
    insertAppointment(data.start, data.end, true);
})

socket.on('room-invite', roomName => {
    if(confirm("You are invited to the appointment.")) {
        window.location.href = '/' + roomName
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
    var returnedMessage = document.getElementById("returnedMessage");
    var dateSelect = document.getElementById("dates");
    var eventDate = new Date(dateSelect.options[dateSelect.selectedIndex].text);  
    var eventStartTime = new Date(eventDate);
    var eventEndTime = new Date (eventDate);
    eventEndTime.setMinutes(eventEndTime.getMinutes() + 60);
    console.log(eventStartTime);
    console.log(eventEndTime);
    
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
            console.log(response)
            var eventsArr = response.result.calendars.primary.busy;
        
            if(eventsArr.length === 0) 
                insertAppointment(eventStartTime, eventEndTime, false);
            else{
                returnedMessage.innerHTML = "You are not free during " + eventStartTime + " and " + eventEndTime
            }
        },
        function(err){
            returnedMessage.innerHTML = "Time validation error.";
            console.error("Time validation error", err);
    });
}

async function getDoctorAvailability() {
    var dates = new Array();
    
    var startTime = new Date();
    startTime.setHours(startTime.getHours() + 1);
    startTime.setMinutes(0);
    var endTime = new Date(startTime);
    endTime.setHours(endTime.getHours() + 1);
        
    var i = -1
    while (i < 1)
    {
        i += 1;
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
                    dates.push(new Date(startTime));
                    startTime.setHours(startTime.getHours() + 1);
                    endTime.setHours(endTime.getHours() + 1);
                }
            },
            function(err){
                console.log(err)
            }
        );

    }
    console.log(dates)
    return dates;
}

function insertAppointment(eventStartTime, eventEndTime, isDoctor) {
    var returnedMessage = document.getElementById("returnedMessage");
    var doctors = document.getElementById("doctors");
    var doctor = doctors.options[doctors.selectedIndex].value;
      
    const event = {
        summary: 'Medical Appointment',
        location: 'Medical Center Location',
        description: 
        'Your medical appointment is set on ' + eventStartTime,
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
                returnedMessage.innerHTML = ("Event added.");
                $.post("./finishAppointment", {
                    doctor: doctor,
                    start: eventStartTime,
                    end: eventEndTime
                }, function(data, status){
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
    clearReturnedMessage()
    var retrievedAvailableDates = [];
    var selectDoctors = document.getElementById('doctors')
    var doctor = selectDoctors.options[selectDoctors.selectedIndex].value;
    var labelDate = document.getElementById("dates-label")
    var selectDate = document.getElementById("dates")
    var url = "/getTime/" + doctor;
    // $.get(url, function (data, status) {
    //     console.log("slkajdh");
    //     retrievedAvailableDates = data;
    //     retrievedAvailableDates.forEach(date => {
    //         var createdOption = document.createElement("option");
    //         createdOption.text = date;
    //         selectDate.add(createdOption);  
    //     });
    // })

    socket.emit('getTime', doctor);
    console.log("Emis getTimes")

    // labelDate.hidden = false;
    // selectDate.hidden = false;
    // if(selectDate.length == 0){
    //     var returnedMessage = document.getElementById("returnedMessage")
    //     returnedMessage.innerHTML = "The selected doctor is not online."
    //     returnedMessage.style = "color: red";
    // }
}

socket.on('getTime', dates => {
    var labelDate = document.getElementById("dates-label")
    var selectDate = document.getElementById("dates")
    labelDate.hidden = false;
    selectDate.hidden = false;
    console.log(dates)
    
    dates.forEach(date => {
        var aux = new Date(date)
        var createdOption = document.createElement("option");
        createdOption.text = aux.toString();
        selectDate.add(createdOption);  
    });

    if(selectDate.length == 0){
        var returnedMessage = document.getElementById("returnedMessage")
        returnedMessage.innerHTML = "The selected doctor is not online."
        returnedMessage.style = "color: red";
    }
})

function clearReturnedMessage(){
    var returnedMessage = document.getElementById("returnedMessage")
    returnedMessage.innerHTML = "";
    returnedMessage.style = "";
}

function makeSubmitAvaialable() {
    document.getElementById("submit-button").disabled = false;
}