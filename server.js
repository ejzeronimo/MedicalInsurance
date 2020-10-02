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

app.get('/patient', function (req, res) {
    res.sendFile(__dirname + "/public/patient.html");
});

app.get('/insurance', function (req, res) {
    res.sendFile(__dirname + "/public/insurance.html");
});

app.get('/insurance_page', function (req, res) {
    var userKey = req.query.userKey

    endThis(userKey, function (val) {
        let database = {};
        database.User = val;
        requestInsuranceFirm = new tedious.Request("SELECT * FROM InsuranceFirms WHERE InsuranceId  = '" + database.User[0][5].value + "';", function (err, rowCount, rows) {
            database.InsuranceTable = rows;
            //callback here
            endthat(database, res)
        });
        requestPlans = new tedious.Request("SELECT * FROM InsurancePlans WHERE insuranceProviderId = '" + database.User[0][5].value + "' ORDER BY CoverageRate;", function (err, rowCount, rows) {
            database.InsurancePlanTable = rows;
            connection.execSql(requestInsuranceFirm);
        });

        connection.execSql(requestPlans);
    });
});

function endMe(data) {
    var stringPat = "('"
    for (i = 0; i < data.PatientTable.length; i++) {
        if (data.PatientTable.length > 0 && i != 0) {
            stringPat += "','"
        }
        stringPat += data.PatientTable[i][0].value;
    }
    stringPat += "')";
    return stringPat;
}

function endthat(data, r) {
    var string = "('"

    for (i = 0; i < data.InsurancePlanTable.length; i++) {
        if (data.InsurancePlanTable.length > 0 && i != 0) {
            string += "','"
        }
        string += data.InsurancePlanTable[i][0].value;
    }
    string += "')";

    requestPatients = new tedious.Request("SELECT UserId, userCurrentInsurancePlan FROM Users WHERE userCurrentInsurancePlan IN " + string + ";", function (err, rowCount, rows) {
        data.PatientTable = rows;
        requestInvoices = new tedious.Request("SELECT * FROM Invoices WHERE patientId IN " + endMe(data) + ";", function (err, rowCount, rows) {
            data.InvoiceTable = rows;
            r.send(data)
        });
        connection.execSql(requestInvoices);
    });
    connection.execSql(requestPatients);
}

function endThis(userKey, callback) {
    requestUser = new tedious.Request("SELECT * FROM Users WHERE UserId = CONVERT(uniqueidentifier,'" + userKey + "');", function (err, rowCount, rows) {
        callback(rows)
    });
    connection.execSql(requestUser);
}

app.get('/database', function (req, res) {
    res.sendFile(__dirname + "/public/database.html");
});

app.get('/sql_database', function (req, res) {
    var database = {};
    requestInsuranceFirms = new tedious.Request("SELECT * FROM InsuranceFirms ORDER BY FirmName;", function (err, rowCount, rows) {
        database.InsuranceTable = rows;
        res.send(database);
    });
    requestInvoices = new tedious.Request("SELECT * FROM Invoices ORDER BY IsPaidByPatient;", function (err, rowCount, rows) {
        database.InvoiceTable = rows;
        connection.execSql(requestInsuranceFirms);
    });
    requestPlans = new tedious.Request("SELECT * FROM InsurancePlans ORDER BY CoverageRate;", function (err, rowCount, rows) {
        database.InsurancePlanTable = rows;
        connection.execSql(requestInvoices);
    });
    requestTreatements = new tedious.Request("SELECT * FROM Treatments ORDER BY StandardPrice;", function (err, rowCount, rows) {
        database.TreatmentTable = rows;
        connection.execSql(requestPlans);
    });
    requestHospitals = new tedious.Request("SELECT * FROM Hospitals ORDER BY HospitalName;", function (err, rowCount, rows) {
        database.HospitalTable = rows;
        connection.execSql(requestTreatements);
    });
    requestUsers = new tedious.Request("SELECT * FROM Users ORDER BY AccessLevel;", function (err, rowCount, rows) {
        database.UserTable = rows;
        connection.execSql(requestHospitals);
    });

    connection.execSql(requestUsers);
});


app.get('/', function (req, res) {
    res.sendFile(__dirname + "/public/index.html");
});

app.post('/submit_login', function (req, res) {
    //log onto the sql db
    var id = req.body.id;
    var passkey = req.body.passkey;
    //log the data shown
    console.log(JSON.stringify(req.body) + " requested login");
    //check to see if the user is legit
    request = new tedious.Request("SELECT AccessLevel, UserId FROM Users WHERE (UserName = '" + id + "') AND (Passkey = '" + passkey + "');", function (err, rowCount, rows) {
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
                    var string = encodeURIComponent(passkey);
                    res.redirect("/insurance?userKey=" + rows[0][1].value);
                    break;
                case 3:
                    res.redirect("/");
                    break;
                case 4:
                    res.redirect("/patient");
                    break;
            }
        } else {
            res.redirect("/");
        }
    });
    connection.execSql(request);
});