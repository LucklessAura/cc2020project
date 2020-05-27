var express = require('express');
const mysql = require('promise-mysql');


var app = express();

const io = require('socket.io')(3000)

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
            host: "35.195.74.83",
            //socketPath: `/cloudsql/cc2020project:europe-west1:cloud-sql-instance`,
            connectionLimit: 15,
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

initDatabase();

async function checkAppointments() {
    var isFixedTime = false;
    var date = new Date();
    while (isFixedTime == false) {
        if (date.getMinutes() == 0)
            isFixedTime = true;
    }
    while (true) {
        var date = Date.now()
        pool.query("call get_appointments()", function(err, results) {
            if (err) {
                console.log("Error retrieving appointments.");
            } else {
                results.forEach(result => {
                    db_date = new Date(result.date)
                    db_date.setMinutes(0);
                    date.setMinutes(0);
                    if (db_date == date) {
                        createNewRoom(result.doctor, result.patient, result.date);
                    }
                });
            }
        })
        await new Promise(resolve => setTimeout(resolve, 3600000));
    }
}

// checkAppointments();

async function createNewRoom(doctor, patient, time) {
    var room_name = hashCode("doctor" + "patient");

    rooms[room_name] = { users: {} }
    var sent = 0;
    clientsAndSockets.forEach(cs => {
        if (cs.name == doctor || cs.name == patient) {
            io.sockets.socket(cs.socket).emit("room-invite", room_name);
            sent += 1;
        }
        if (sent == 2)
            break;
    });
}

async function hashCode(str) {
    return str.split('').reduce((prevHash, currVal) =>
        (((prevHash << 5) - prevHash) + currVal.charCodeAt(0)) | 0, 0);
}

app.get("/test", function(req, res) {
    res.render("createRoom", { rooms: rooms })
});

app.get('/', (req, res) => {
    res.render('createRoom', { rooms: rooms })
})

app.get("/getHospitals.html", async function(req, res) {
    var county_code = req.headers["county_code"];
    const da = pool.query('SELECT * from hospitals where city_code ="' + county_code + '";');
    da.then(resp => {
        let names = [];
        for (var i = 0; i < resp.length; i++) {
            names.push(resp[i].name);
        }
        res.send(JSON.stringify(names));
        res.end();
    }).catch((err) => {
        console.log(err);
        res.send(JSON.stringify([]));
        res.end();
    });

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
    pool.query("CALL get_hospital_doctors(?)", req.params.hospital, (err, results, fields) => {
        if (err) {
            console.log("Error in retrieving doctors list.");
            console.log(err);
        }
        res.send(results[0]);
    })
})

app.get('/getTime/:doctor', (req, res) => {
    // console.log(clientsAndSockets[0].name)
    // console.log(clientsAndSockets[1].name)
    console.log(clientsAndSockets)
    for (var i = 0; i < clientsAndSockets.length; i++) {
        if (clientsAndSockets[i].name == req.params.doctor) {
            io.to(clientsAndSockets[i].socket).emit('request-doctor-availability');
            // io.sockets.socket.on('response-doctor-availability', dates => {
            //     res.send(dates)
            // });
            io.on('connection', socket => {
                socket.on('response-doctor-availability', dates => {
                    res.send(dates)
                })
            })
        }
    }
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

app.get("/existsUser.html", async function(req, res) {
    var first_name = req.headers["first_name"];
    var last_name = req.headers["last_name"];
    var rol = req.headers["rol"];

    console.log("<-!received a /existsUser request for " + rol + " " + last_name + " " + first_name + "!-->");

    if (rol == "doctor") {
        pool.query("CALL get_doctor(?,?)", [last_name, first_name], (err, result, fields) => {
            if (err) {
                return console.error(err.message);
            }
            if (result[0].length != 0) {
                console.log("\t|--> sending responce: true");
                res.send("true");
            } else {
                console.log("\t|--> sending responce: fasle");
                res.send("false");
            }
            res.end();
        });
    } else {
        pool.query("CALL get_patient(?,?)", [last_name, first_name], (err, result, fields) => {
            if (err) {
                return console.error(err.message);
            }
            if (result[0].length != 0) {
                console.log("\t|--> sending responce: true");
                res.send("true");
            } else {
                console.log("\t|--> sending responce: fasle");
                res.send("false");
            }
            res.end();
        });
    }

})

app.get("/updateInfo.html", async function(req, res) {
    var first_name = req.headers["first_name"];
    var last_name = req.headers["last_name"];
    var rol = req.headers["rol"];
    var tel = req.headers['tel'];
    var email = req.headers['email'];

    console.log("<-!received a /updateInfo request for " + rol + " " + last_name + " " + first_name + "!-->");

    if (rol == "doctor") {
        var special = req.headers['special'];
        pool.query("UPDATE doctors SET phone_number = ?,mail=?,speciality =? where first_name = ? and last_name=?", [tel, email, special, first_name, last_name], (err, result, fields) => {
            if (err) {
                return console.error(err.message);
            }
            res.send("\t|-->Update Succesfull");
            res.end();
        });
    } else {
        pool.query("UPDATE patients SET phone_number = ?,mail=? where first_name = ? and last_name=?", [tel, email, first_name, last_name], (err, result, fields) => {
            if (err) {
                return console.error(err.message);
            }
            res.send("\t|-->Update Succesfull");
            res.end();
        });
    }
    location.replace('./account.html');
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
        if (clientsAndSockets[i].name = req.params.doctor) {
            io.to(clientsAndSockets.socket).emit('doctor-add-appointment', { start: req.params.start, end: req.params.end });
        }
    }

    pool.query("CALL insert_appointment(?,?,?)", [req.params.start, req.params.doctor, req.params.patient])
})

io.on('connection', socket => {
    socket.on('new-user', (room, name) => {
        socket.join(room)
        rooms[room].users[socket.id] = name
        socket.to(room).broadcast.emit('user-connected', name)
    })
    socket.on('send-chat-message', (room, message) => {
        socket.to(room).broadcast.emit('chat-message', { message: message, name: rooms[room].users[socket.id] })
    })
    socket.on('disconnect', () => {
        getUserRooms(socket).forEach(room => {
            socket.to(room).broadcast.emit('user-disconnected', rooms[room].users[socket.id])
            delete rooms[room].users[socket.id]
        });
    })
    socket.on('logged-in', name => {
        console.log("Received")
        console.log(name)
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


module.exports = app;