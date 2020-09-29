//the front end that can be logged into and send data to the database
const express = require('express');
var app = new express();
const http = require('http').Server(app);

app.use(express.static(__dirname + '/public'));
// Create an instance of the http server to handle HTTP requests
app.get('/', function (req, res) {
    
});

http.listen(3000, function () {
    console.log('listening on : 3000');
});