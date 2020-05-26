var express = require('express');
const mysql = require('promise-mysql');

var app = express();
const cors = require('cors');
app.use(cors());
app.use(express.static('public/pages'));

pool = "";

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

app.get("/existsUser.html",async function(req, res){
    var first_name = req.headers["first_name"];
    var last_name = req.headers["last_name"];
    var rol = req.headers["rol"];

    console.log("<-!received a /existsUser request for " + rol + " " + last_name + " " + first_name + "!-->");

    if(rol=="doctor"){
        pool.query("CALL get_doctor(?,?)", [last_name, first_name], (err, result, fields) => {
            if (err) {
                return console.error(err.message);
              }
              if(result[0].length != 0){
                console.log("\t|--> sending responce: true");
                res.send("true");
            }else{
                console.log("\t|--> sending responce: fasle");
                res.send("false");
            }
            res.end();
        });
    }else{
        pool.query("CALL get_patient(?,?)", [last_name, first_name], (err, result, fields) => {
            if (err) {
                return console.error(err.message);
              }
            if(result[0].length != 0){
                console.log("\t|--> sending responce: true");
                res.send("true");
            }else{
                console.log("\t|--> sending responce: fasle");
                res.send("false");
            }
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
    if(rol=="doctor"){
        var special = req.headers["specializare"];
        var spital = req.headers["spital"];
        pool.query("CALL insert_doctor(?,?,?,?,?,?,?)", [spital, last_name, first_name,tel,email,"",special], (err, result, fields) => {
            if (err) {
                return console.error(err.message);
              }
              console.log("\t|-->created "+ rol + " " + last_name + " " + first_name);
        });
    }else{
        pool.query("CALL insert_patient(?,?,?,?,?)", [last_name, first_name,tel,email,""], function(err, result, fields) {
            if (err) {
                return console.error(err.message);
              }
              console.log("\t|-->created "+ rol + " " + last_name + " " + first_name);
            });
    }

    
})
module.exports = app;