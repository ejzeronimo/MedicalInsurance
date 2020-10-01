//the server
const express = require('express');
var bodyParser = require('body-parser');
var tedious = require('tedious');

////////////////////////////////////////////////////////////////////////////////
var config = {
    server: '172.16.17.117',
    authentication: {
        type: 'default',
        options: {
            userName: 'sa',
            password: 'PurdueM3dic@l'
        }
    },
    options: {
        encrypt: false,
        database: 'medicalDB',
        rowCollectionOnRequestCompletion: true
    }
};

var connection = new tedious.Connection(config);

connection.on('connect', function (err) {
    // If no error, then good to proceed.
    console.log("Connected to SQL database");
});
////////////////////////////////////////////////////////////////////////////////
app = express();
app.use(express.static(__dirname + '/public'));

app.use(bodyParser.urlencoded({
    extended: false
}));

app.use(bodyParser.json());

app.listen(3000, function () {
    console.log('listening for website requests on port: 3000');
});

app.get('/?retry=false', function (req, res) {
    res.sendFile(__dirname + "/public/index.html");
});

app.get('/database', function (req, res) {
    res.sendFile(__dirname + "/public/database.html");
});

app.get('/insurance', function (req, res) {
    res.sendFile(__dirname + "/public/insurance.html");
});

app.get('/patient', function (req, res) {
    res.sendFile(__dirname + "/public/patient.html");
});

app.get('/sql_database', function (req, res) {
    var database = {};
    requestInsuranceFirms = new tedious.Request("SELECT * FROM InsuranceFirms ORDER BY FirmName;", function (err, rowCount, rows) {
        if (err) {
            console.log(err);
        }
        database.InsuranceTable = rows;
        res.send(database);
    });
    requestInvoices= new tedious.Request("SELECT * FROM Invoices ORDER BY IsPaidByPatient;", function (err, rowCount, rows) {
        if (err) {
            console.log(err);
        }
        database.InvoiceTable = rows;
        connection.execSql(requestInsuranceFirms); 
    });
    requestPlans= new tedious.Request("SELECT * FROM InsurancePlans ORDER BY CoverageRate;", function (err, rowCount, rows) {
        if (err) {
            console.log(err);
        }
        database.InsurancePlanTable = rows;
        connection.execSql(requestInvoices); 
    });
    requestTreatements = new tedious.Request("SELECT * FROM Treatments ORDER BY StandardPrice;", function (err, rowCount, rows) {
        if (err) {
            console.log(err);
        }
        database.TreatmentTable = rows;
        connection.execSql(requestPlans); 
    });
    requestHospitals = new tedious.Request("SELECT * FROM Hospitals ORDER BY HospitalName;", function (err, rowCount, rows) {
        if (err) {
            console.log(err);
        }
        database.HospitalTable = rows;
        connection.execSql(requestTreatements); 
    });
    requestUsers = new tedious.Request("SELECT * FROM Users ORDER BY AccessLevel;", function (err, rowCount, rows) {
        if (err) {
            console.log(err);
        }
        database.UserTable = rows;
        connection.execSql(requestHospitals); 
    });
    
    connection.execSql(requestUsers);
});

app.post('/submit_login', function (req, res) {
    //log onto the sql db
    var id = req.body.id;
    var passkey = req.body.passkey;
    //log the data shown
    console.log(JSON.stringify(req.body) + " requested login");
    //check to see if the user is legit
    request = new tedious.Request("SELECT AccessLevel FROM Users WHERE (UserName = '" + id + "') AND (Passkey = '" + passkey + "');", function (err, rowCount, rows) {
        if (err) {
            console.log(err);
        }
        //assume that if it returns a row than they logged in
        if (rows[0] != undefined) {
            switch (parseInt(rows[0][0].value, 10)) {
                case 0:
                    res.redirect("/database");
                    break;
                case 2:
                    res.redirect("/insurance");
                    break;
                case 3:
                    break;
                case 4:
                    res.redirect("/patient");
                    break;
            }
        } else {
            res.redirect("/?retry=true");
        }
    });
    connection.execSql(request);
});