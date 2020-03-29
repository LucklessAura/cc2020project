var express = require('express');

var app = express();
const cors = require('cors');

app.use(cors());
app.use(express.static('public/pages'));


module.exports = app;