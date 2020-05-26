const socket = io('http://localhost:3000')
const messageContainer = document.getElementById('message-container')
const roomContainer = document.getElementById('room-container')
const messageForm = document.getElementById('send-container')
const messageInput = document.getElementById('message-input')


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
    console.log("kjsdhf");
    const roomElement = document.createElement('div')
    roomElement.innerText = room
    const roomLink = document.createElement('a')
    roomLink.href = `/${room}`
    roomLink.innerText = "Join"
    roomContainer.append(roomElement)
    roomContainer.append(roomLink)
});

socket.on('request-doctor-availability', () => {
    var dates = getDoctorAvailability();
    socket.emit("response-doctor-availability", dates);
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
        .signIn({scope: "https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events"})
        .then(function() { console.log("Sign-in successful"); },
              function(err) { console.error("Error signing in", err); });
} 

function loadClient() {
    gapi.client.setApiKey('AIzaSyCLMI60gh3A2gk8NGXtsB8_HUymue0ERpU');
    return gapi.client.load("https://content.googleapis.com/discovery/v1/apis/calendar/v3/rest")
        .then(function() { 
            console.log("GAPI client loaded for API");
            var authButton = document.getElementById("authBtn").setAttribute("hidden", "hidden");
            var submitBtn = document.getElementById("submitBtn").removeAttribute("hidden"); 
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

function getDoctorAvailability() {
    var dates = []
    
    var startTime = new Date();
    startTime.setHours(startTime.getHours() + 1);
    startTime.setMinutes(0);
    var endTime = startTime;
    endTime.setHours(endTime.getHours() + 1);
    
    while (dates.length < 10)
    {
        gapi.client.calendar.freebusy.query({
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
            
                if(eventsArr.length === 0) 
                    date.add(startTime);
            },
            function(err){}
        );

        startTime.setHours(startTime.getHours() + 1);
        endTime.setHours(endTime.getHours() + 1);
    }

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

gapi.load("client:auth2", function() {
    gapi.auth2.init({client_id: "813562380833-v0273o7adbgtedm4s3udrurdiphjpfm6.apps.googleusercontent.com"});
});

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
            var createdOption = new Option(doctor.last_name + " " + doctor.first_name);
            selectDoctors.append(createdOption);
        });
    })

    labelDoctors.hidden = false
    selectDoctors.hidden = false;
}

function populateTime() {
    var retrievedAvailableDates = [];
    var selectDoctors = document.getElementById('doctors')
    var doctor = selectDoctors.options[selectDoctors.selectedIndex].value;
    var labelDate = document.getElementById("dates-label")
    var selectDate = document.getElementById("dates")
    var url = "/getTime/" + doctor;
    $.get(url, function (data, status) {
        retrievedAvailableDates = data;
        retrievedAvailableDates.forEach(date => {
            var createdOption = document.createElement("option");
            createdOption.text = date;
            selectDate.add(createdOption);  
        });
    })

    labelDate.hidden = false;
    selectDate.hidden = false;
}

function makeSubmitAvaialable() {
    document.getElementById("submit-button").disabled = false;
}