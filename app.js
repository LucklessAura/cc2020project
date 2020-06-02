var express = require('express');
const mysql = require('promise-mysql');
const session = require('express-session')
const { OAuth2Client } = require('google-auth-library');

var app = express();
app.set('view engine', 'ejs');
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.set('trust proxy', 1) // trust first proxy
app.use(session({
    secret: 'sdfgwsgsf34g6aa123',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: true }
}))

const server = require('http').Server(app)

const io = require('socket.io')(server)

const cors = require('cors');

app.use(cors());
app.use(express.static('./public/pages'));
app.use(express.urlencoded({ extended: true }))
app.set('views', './public/pages')
app.set('view engine', 'ejs')

pool = "";
const rooms = {}
const clientsAndSockets = []

async function initDatabase() {
    const createPool = async() => {
        return await mysql.createPool({
            user: "root",
            password: "root",
            database: "hospital_db",
            socketPath: `/cloudsql/cc2020project:europe-west1:cloud-sql-instance`,
            // host: "35.195.74.83",
            connectionLimit: 50,
            connectTimeout: 10000,
            acquireTimeout: 10000,
            waitForConnections: true,
            queueLimit: 0,
        });
    };
    const poolPromise = createPool()
        .then(async(pool) => {
            return pool;
        })
        .catch((err) => {

            console.log(err);
            process.exit(1)
        });
    pool = await poolPromise;
}

initDatabase().then(function() {
    var nextDate = new Date();
    console.log(nextDate)
    if (nextDate.getMinutes() === 0) { // You can check for seconds here too
        checkAppointments()
    } else {
        nextDate.setHours(nextDate.getHours() + 1);
        nextDate.setMinutes(0);
        nextDate.setSeconds(0); // I wouldn't do milliseconds too ;)
        nextDate.setMilliseconds(0)

        var difference = nextDate - new Date();
        setTimeout(checkAppointments, difference);
    }

    setTimeout(checkAppointments, 5000)
});



app.get("/getHospitals.html", function(req, res) {
    let code = "IS";
    code = req.get('code');
    const da = pool.query('SELECT name from hospitals where hospitals.city_code = \"' + code + '\";');
    da.then(resp => {
        let names = [];
        for (var i = 0; i < resp.length; i++) {
            names.push(resp[i].name);
        }
        res.send(JSON.stringify(names));
        res.end();

    }).catch((err) => {
        console.log(err);
        res.send(JSON.stringify(err));
        res.end();
    });

})

// insert into appointments (doctor_id, patient_id, date) values (
async function checkAppointments() {
    console.log(clientsAndSockets)
    var date = new Date("2020-06-01T15:13:03.969Z")
    pool.query("SELECT * FROM appointments", function(err, results) {
        if (err) {
            console.log("Error retrieving appointments.");
            console.log(err)
        } else {
            results.forEach(result => {
                db_date = new Date(result.date)
                db_date.setMinutes(0);
                db_date.setMilliseconds(0);
                date.setMinutes(0);
                date.setMilliseconds(0);
                if (db_date - date == 0) {
                    // createNewRoom(result.doctor, result.patient, result.date);
                    createNewRoom("Cristian Tugui", "Anonymous", date)
                }
            });
        }
    })
}



async function createNewRoom(doctor, patient, time) {
    var room_name = hashCode(doctor + patient + time);

    rooms[room_name] = { users: {} }
    var sentToDoctor = false;
    var sentToPatient = false;
    clientsAndSockets.forEach(cs => {
        if (cs.name == doctor) {
            inviteMemberToRoom(cs.socket, doctor, room_name)
            console.log("sent doctor")
            sentToDoctor = true;
        }
        if (cs.name == patient) {
            inviteMemberToRoom(cs.socket, patient, room_name)
            console.log("sent patient")
            sentToPatient = true;
        }
    });
    if (!sentToDoctor) {
        setTimeout(function() { secondInviteToRoom(doctor, room_name) }, 10000) // 15 min
    }
    if (!sentToPatient) {
        setTimeout(function() { secondInviteToRoom(patient, room_name) }, 10000) // 15 min
    }
}

function inviteMemberToRoom(memberSocket, memberName, roomName) {
    io.to(memberSocket).emit("room-invite", { roomName: roomName, memberName: memberName });
}

function secondInviteToRoom(member, roomName) {
    var found = false;
    clientsAndSockets.forEach(cs => {
        if (cs.name == member) {
            io.to(cs.socket).emit("room-invite-2", { roomName: roomName, memberName: member });
            found = true;
        }
    })
    if (!found) {
        io.sockets.on('connection', function(socket) {
            socket.to(roomName).broadcast.emit("user-unavailable", member)
        })
    }
}

function hashCode(str) {
    return str.split('').reduce((prevHash, currVal) =>
        (((prevHash << 5) - prevHash) + currVal.charCodeAt(0)) | 0, 0);
}

app.get("/test", function(req, res) {
    res.render("createRoom", { rooms: rooms })
});

app.get('/', (req, res) => {
    res.render('createRoom', { rooms: rooms })
})



app.get("/getAllHospitals", async function(req, res) {
    pool.query("CALL get_hospitals_list();", (err, results, fields) => {
        if (err) {
            console.log("Error in retrieving doctors list.");
            console.log(err);
        }

        res.send(results[0]);
    })
})

app.get("/getDoctors/:hospital", (req, res) => {
    var qr = "SELECT d.given_name, d.family_name from doctors as d Join hospitals as h on d.hospital_id = h.id where h.name ='" + req.params.hospital + "';"
    pool.query(qr, (err, results, fields) => {
        if (err) {
            console.log("Error in retrieving doctors list.");
            console.log(err);
        } else {
            console.log(results)
            res.send(results);
        }
    })
})

app.get("/getUser.html", async function(req, res) {
    var first_name = req.headers["first_name"];
    var last_name = req.headers["last_name"];
    var rol = req.headers["rol"];

    console.log("<-!received a /getUser request for " + rol + " " + last_name + " " + first_name + "!-->");

    if (rol == "doctor") {
        pool.query("CALL get_doctor(?,?)", [last_name, first_name], (err, result, fields) => {
            if (err) {
                return console.error(err.message);
            }
            console.log(result[0][0]);
            res.send(result[0][0]);
            res.end();
        });
    } else {
        pool.query("CALL get_patient(?,?)", [last_name, first_name], (err, result, fields) => {
            if (err) {
                return console.error(err.message);
            }
            console.log(result[0][0]);
            res.send(result[0][0]);
            res.end();
        });
    }
})


app.get("/createUser.html", async function(req, res) {
    var first_name = req.headers["first_name"];
    var last_name = req.headers["last_name"];
    var rol = req.headers["rol"];
    console.log("<-!received a /createUser request for " + rol + " " + last_name + " " + first_name + "!-->");
    var email = req.headers["email"];
    var tel = req.headers["tel"];
    if (rol == "doctor") {
        var special = req.headers["specializare"];
        var spital = req.headers["spital"];
        pool.query("CALL insert_doctor(?,?,?,?,?,?,?)", [spital, last_name, first_name, tel, email, "", special], (err, result, fields) => {
            if (err) {
                return console.error(err.message);
            }
            console.log("\t|-->created " + rol + " " + last_name + " " + first_name);
        });
    } else {
        pool.query("CALL insert_patient(?,?,?,?,?)", [last_name, first_name, tel, email, ""], function(err, result, fields) {
            if (err) {
                return console.error(err.message);
            }
            console.log("\t|-->created " + rol + " " + last_name + " " + first_name);
        });
    }


})

app.post('/room', (req, res) => {
    if (rooms[req.body.room] != null) {
        return res.redirect('/')
    }
    rooms[req.body.room] = { users: {} }
    res.redirect(req.body.room)
    io.emit('room-created', req.body.room)
})


app.get('/:room', (req, res) => {
    if (rooms[req.params.room] == null) {
        return res.redirect('/')
    }
    res.render('room', { roomName: req.params.room })
})

app.post('/finishAppointment', (req, res) => {
    for (var i = 0; i < clientsAndSockets.length; i++) {
        if (clientsAndSockets[i].name == req.body.doctorName) {
            console.log("Am gasit cui sa trimit.")
            console.log(clientsAndSockets[i].name)
            io.to(clientsAndSockets[i].socket).emit('doctor-add-appointment', { start: req.body.start, end: req.body.end });
            // pool.query("CALL insert_appointment(?,?,?)", [req.body.start, req.body.doctor, req.body.patient])
        }
    }

})

io.on('connection', socket => {
    socket.on('new-user', room => {
        var name = ""
        clientsAndSockets.forEach(cs => {
            if (cs.socket == socket.id)
                name = cs.name
        });
        console.log("New user")
        console.log(name)
        socket.join(room)
        console.log(rooms)
        console.log(room)
        console.log(socket.id)
        rooms[room].users[socket.id] = name
        socket.to(room).broadcast.emit('user-connected', name)
    })
    socket.on('send-chat-message', (room, message) => {
        socket.to(room).broadcast.emit('chat-message', { message: message, name: rooms[room].users[socket.id] })
        console.log(socket.id)
    })
    socket.on('chat message', (msg) => {
        io.emit('chat message', msg);
    });
    socket.on('disconnect', () => {
        getUserRooms(socket).forEach(room => {
            socket.to(room).broadcast.emit('user-disconnected', rooms[room].users[socket.id])
            delete rooms[room].users[socket.id]
        });
    })
    socket.on('logged-in', name => {
        var found = false
        clientsAndSockets.forEach(cs => {
            if (cs.name == name) {
                cs.socket = socket.id;
                found = true;
            }
        })
        if (found == false) {
            clientsAndSockets.push({ name: name, socket: socket.id });
        }
        console.log(clientsAndSockets)
    })

    socket.on('getTime', doctor => {
        let requester_id = socket.id;
        for (var i = 0; i < clientsAndSockets.length; i++) {
            if (clientsAndSockets[i].socket == requester_id) {
                requester = clientsAndSockets[i].name;
                break
            }
        }

        for (var i = 0; i < clientsAndSockets.length; i++) {
            if (clientsAndSockets[i].name == doctor) {
                console.log("gasit")
                io.to(clientsAndSockets[i].socket).emit('request-doctor-availability', requester);
            }
        }
    })

    socket.on('response-doctor-availability', (dates, requester) => {
        console.log(dates)
        console.log(requester)

        for (var i = 0; i < clientsAndSockets.length; i++) {
            if (clientsAndSockets[i].name == requester) {
                requester_id = clientsAndSockets[i].socket;
                io.to(requester_id).emit('getTime', dates)
                break
            }
        }
    })

    socket.on('invite-rejected', data => {
        var roomName = data.roomName
        var memberName = data.memberName
        setTimeout(function() { secondInviteToRoom(memberName, roomName) }, 10000) // 15 min 900000
    })

    socket.on('invite-rejected2', data => {
        socket.to(data.roomName).broadcast.emit("user-unavailable", data.memberName)
    })
});

function getUserRooms(socket) {
    return Object.entries(rooms).reduce((names, [name, room]) => {
        if (room.users[socket.id] != null) {
            names.push(name)
        }
        return names
    }, [])
}


app.post("/login.html", async function(req, res) {
    var received = req.body
    var client = new OAuth2Client("813562380833-v0273o7adbgtedm4s3udrurdiphjpfm6");
    //console.log(user.id_token);
    var token = await client.verifyIdToken({
        idToken: received.id_token,
    })
    let payload = token.getPayload();
    var user = {
        given_name: payload.given_name,
        family_name: payload.family_name,
        google_id: payload.sub,
        email: payload.email,
        account_type: received.userType,
    }
    var response;
    if (user.google_id != null) {
        if (received.userType == "Doctor") {
            const query = pool.query('SELECT id from doctors where doctors.google_id = \"' + user.google_id + '\";');
            query.then(val => {
                if (val.length > 1) {
                    console.log("this should be unique");
                } else if (val.length == 0) {
                    response = { valid: false, reason: "There are no doctors with that account" }
                    res.send(JSON.stringify(response));
                    res.end();
                } else {
                    response = { valid: true }
                    req.session.user_id = val.id;
                    req.session.userType = user.account_type;
                    res.send(JSON.stringify(response));
                    res.end();
                }
            }).catch(err => {
                console.log(err);
                response = { error: err };
                res.send(JSON.stringify(response));
                res.end();
            })
        } else if (received.userType == "Pacient") {
            const query = pool.query('SELECT id from patients where patients.google_id =\"' + user.google_id + '\";');
            query.then(val => {
                if (val.length > 1) {
                    console.log("this should be unique");
                } else if (val.length == 0) {
                    if (received.createAccount == true) {
                        const addQuery = pool.query(' INSERT INTO patients(given_name, family_name, email ,google_id) \
                        VALUES (\"' + user.given_name + '\",\"' + user.family_name + '\",\"' + user.email + '\",\"' + user.google_id + '\");')
                        addQuery.then(x => {
                            const queryGetId = pool.query('SELECT id from patients where patients.google_id =\"' + user.google_id + '\";');
                            queryGetId.then(resultId => {
                                req.session.user_id = resultId.id;
                                req.session.userType = user.account_type;
                            }).catch(err => {
                                console.log(err);
                                response = { error: err };
                                res.send(JSON.stringify(response));
                                res.end();
                            })
                            response = { valid: true }
                            res.send(JSON.stringify(response));
                            res.end();
                        }).catch(er => {
                            console.log(er);
                            response = { error: er };
                            res.send(JSON.stringify(response));
                            res.end();
                        })
                    } else {
                        response = { valid: false, reason: "Acel cont nu exista" };
                        res.send(JSON.stringify(response));
                        res.end();
                    }


                } else {
                    req.session.id = val.id;
                    req.session.userType = user.account_type;
                    response = { valid: true }
                    res.send(JSON.stringify(response));
                    res.end();
                }
            }).catch(err => {
                console.log(err);
                response = { error: err };
                res.send(JSON.stringify(response));
                res.end();
            })

        } else {
            response = { valid: false };
            res.send(JSON.stringify(response));
            res.end();
        }
    } else {
        response = { valid: false };
        res.send(JSON.stringify(response));
        res.end();
    }
})


app.post("/logout.html", function(req, res) {
    console.log("alskjdhlasd")
    req.session.destroy(function() {
        console.log("Logged Out");
    });
    res.end();
})


if (module === require.main) {
    const PORT = process.env.PORT || 8080;
    server.listen(PORT, () => {
        console.log(`App listening on port ${PORT}`);
    });
}