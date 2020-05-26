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
    while (isFixedTime == false){
        if(date.getMinutes() == 0)
            isFixedTime = true;
    }
    while (true) {
        var date = Date.now()
        pool.query("call get_appointments()", function(err, results) {
            if (err) {
                console.log("Error retrieving appointments.");
            }
            else {
                results.forEach(result => {
                    db_date = new Date(result.date)
                    db_date.setMinutes(0);
                    date.setMinutes(0);
                    if(db_date == date){
                        createNewRoom(result.doctor, result.patient, result.date);
                    }
                });
            }
        })
        await new Promise(resolve => setTimeout(resolve, 3600000));
    }
}

checkAppointments();

async function createNewRoom(doctor, patient, time){
    var room_name = hashCode("doctor" + "patient");

    rooms[room_name] = { users: {} }
    var sent = 0;
    clientAndSockets.forEach(cs => {
        if(cs.name == doctor || cs.name == patient) {
            io.sockets.socket(cs.socket).emit("room-invite", room_name);
            sent += 1;
        }
        if (sent == 2)
            break;
    });    
} 

async function hashCode(str) {
    return str.split('').reduce((prevHash, currVal) =>
      (((prevHash << 5) - prevHash) + currVal.charCodeAt(0))|0, 0);
  }

app.get("/test", function(req, res) {
    res.render("createRoom", {rooms: rooms})
});

app.get('/', (req, res) => {
    res.render('createRoom', {rooms: rooms})
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
    pool.query("CALL get_hospitals_list()", (err, results, fields) => {
        if(err){
            console.log("Error in retrieving hospitals list.");
        }

        res.send(results);
    })
})

app.get("/getDoctors/:hospital", (req, res) => {
    pool.query("CALL get_hospital_doctors(?)", req.params.hospital, (err, res, fields) => {
        if(err){
            console.log("Error in retrieving doctors list.");
        }

        res.send(res);
    })
})


app.post('/room', (req, res) => {
    if (rooms[req.body.room] != null){
        return res.redirect('/')
    }
    rooms[req.body.room] = { users: {} }
    res.redirect(req.body.room)
    io.emit('room-created', req.body.room)
})

app.get('/:room', (req, res) => {
    if (rooms[req.params.room] == null){
        return res.redirect('/')
    }
    res.render('room', { roomName: req.params.room})
})

app.get('/getTime/:doctor', (req, res) => {
    for (var i = 0; i < clientsAndSockets.length; i++){
        if(clientsAndSockets[i].name = req.params.doctorName){
            io.sockets.socket(clientsAndSockets[i].socket).emit('request-doctor-availability');
            io.sockets.socket.on('response-doctor-availability', dates => {
                res.send(dates)
            });
        }
    }
})

app.post('/finishAppointment', (req, res) => {
    for (var i = 0; i < clientsAndSockets.length; i++){
        if(clientsAndSockets[i].name = req.params.doctor){
            io.to(clientsAndSockets.socket).emit('doctor-add-appointment', {start: req.params.start, end: req.params.end} );
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
        socket.to(room).broadcast.emit('chat-message', { message: message, name: rooms[room].users[socket.id]})
    })
    socket.on('disconnect', () => {
        getUserRooms(socket).forEach(room => { 
            socket.to(room).broadcast.emit('user-disconnected', rooms[room].users[socket.id])
            delete rooms[room].users[socket.id]
        });
    })
});

function getUserRooms(socket) {
    return Object.entries(rooms).reduce((names, [name, room]) => {
        if(room.users[socket.id] != null){
            names.push(name)
        } 
        return names
    }, [])
}


module.exports = app;