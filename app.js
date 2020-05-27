var express = require('express');
const mysql = require('promise-mysql');
var session = require('express-session')
var app = express();
const cors = require('cors');
app.use(cors());

var app = express()
app.use(session({
    secret: 'some random stringmapfnfiaasugfa',
    saveUninitialized: false,
    resave: false,

}))
app.use(express.static('public/pages'));

pool = "";
var session;
async function initDatabase() {
    const createPool = async() => {
        return await mysql.createPool({
            user: "root",
            password: "root",
            database: "hospital_db",
            socketPath: `/cloudsql/cc2020project:europe-west1:cloud-sql-instance`,
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

app.get("/getHospitals.html", async function(req, res) {
    var county_code = req.headers["county_code"];
    const da = pool.query("SELECT name from hospitals;");
    da.then(resp => {
        let names = [];
        for (var i = 0; i < resp.length; i++) {
            names.push(resp[i]);
        }
        res.send(JSON.stringify(names));
        res.end();
    }).catch((err) => {
        console.log(err);
        res.send(err);
        res.end();
    });

})

app.post("/login.html", function(req, res) {
    req.session.user_info = JSON.parse(req.headers["user_info"]);
    res.end();
})


app.post("/logout.html", function(req, res) {
    req.session.destroy(function() {
        console.log("Logged Out");
    });
    res.end();
})

module.exports = app;