var express = require('express');

var app = express();
const cors = require('cors');

app.use(cors());
app.use(express.static('public/pages'));
app.use(express.static('public/stylesheets'));


module.exports = app;