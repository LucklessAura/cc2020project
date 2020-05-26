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
        query_text = "CALL get_doctor(" + last_name + ", " + first_name + ");";
        const da = pool.query(query_text);
        da.then(resp =>{
            if(resp[0].length != 0){
                console.log("\t|--> sending responce: true");
                res.send("true");
            }else{
                console.log("\t|--> sending responce: fasle");
                res.send("false");
            }
            res.end();
        });
    }else{
        query_text = 'CALL get_patient("'+first_name+'","'+last_name+'");';
        const da = pool.query(query_text);
        da.then(resp =>{
            if(resp[0].length != 0){
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
    console.log(tel);
    if(rol=="doctor"){
        
        var special = req.headers["specializare"];
        var spital = req.headers["spital"];
        query_text = "CALL insert_doctor("+spital + ", " + last_name + ", " + first_name + "," + tel + " ," + email + ",''," + special + ");";
        const da = pool.query(query_text);
    }else{
        query_text = 'CALL insert_patient(' + last_name + ','  + first_name + ',' + tel + ' ,' + email + ',"");';
        const da = pool.query(query_text);
    }
})
module.exports = app;