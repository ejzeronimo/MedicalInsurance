//////////////////////////////////////////////////////////////////////////////// GLOBALS
const express = require('express');
var bodyParser = require('body-parser');
var tedious = require('tedious');
var CryptoJS = require("crypto-js");

//////////////////////////////////////////////////////////////////////////////// SQL CONFIGS AND CONNECTION
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
        database: 'medicalRevisedDB',
        rowCollectionOnRequestCompletion: true
    }
};

var connection = new tedious.Connection(config);

connection.on('connect', function (err) {
    // If no error, then good to proceed.
    console.log("Connected to SQL database");
});

//////////////////////////////////////////////////////////////////////////////// SERVER HOMEPAGE AND STARTUP
app = express();
app.use(express.static(__dirname + '/public'));

app.use(bodyParser.urlencoded({
    extended: false
}));

app.use(bodyParser.json());

app.listen(3000, function () {
    console.log('Listening for website requests on port: 3000');
});

app.get('/', function (req, res) {
    res.sendFile(__dirname + "/public/index.html");
});

//////////////////////////////////////////////////////////////////////////////// SERVER LOGIN SYSTEM
app.post('/login_request', function (req, res) {
    //store the data in the unencrypted form
    var userId = req.body.id;
    var userPasskey = CryptoJS.AES.decrypt(req.body.passkey, "Secret Passphrase").toString(CryptoJS.enc.Utf8);
    //now each table must be checked for a match (Patient, Doctor, Insurance Company, etc)
    requestPatient = new tedious.Request("SELECT PatientId FROM Patient WHERE (UserName = '" + userId + "') AND (Password = '" + userPasskey + "');", function (err, rowCount, rows) {
        if (err) {
            console.log(err);
        }
        //assume that if it returns a row than they logged in
        if (rows[0] != undefined) {
            res.send("/patient?userKey=" + rows[0][0].value);
            //res.redirect("/patient?userKey=" + rows[0][1].value);
            /*
            //case statement to go through the patient access level
            switch (parseInt(rows[0][0].value, 10)) {
                case 0:
                    res.redirect("/database");
                    break;
                case 2:
                    res.redirect("/insurance?userKey=" + rows[0][1].value);
                    break;
                case 3:
                    res.redirect("/");
                    break;
                case 4:
                    res.redirect("/patient?userKey=" + rows[0][1].value);
                    break;   
            }*/
        } else {
            res.send("/");
        }
    });
    connection.execSql(requestPatient);
});

//////////////////////////////////////////////////////////////////////////////// SERVER DATABASE PAGE
app.get('/database', function (req, res) {
    res.sendFile(__dirname + "/public/database.html");
});

app.get('/sql_database', function (req, res) {
    var database = [];
    requestTableNames = new tedious.Request("SELECT * FROM information_schema.tables;", function (err, rowCount, rows) {
        var x = 0;
        var loopArray = function (arr, data) {
            requestDynamicTable = new tedious.Request("SELECT * FROM " + arr[x][2].value + ";", function (err, rowCount, rows) {
                data.unshift(rows);
                // any more items in array? continue loop
                x++;
                if (x < arr.length) {
                    loopArray(arr, data);
                } else if (x == arr.length) {
                    res.send(data);
                }
            });
            connection.execSql(requestDynamicTable);
        }
        loopArray(rows, database);
    });
    connection.execSql(requestTableNames);
});

//////////////////////////////////////////////////////////////////////////////// SERVER PATIENT PAGES
app.get('/patient', function (req, res) {
    res.sendFile(__dirname + "/public/patient.html");
});

app.get('/patient_page', function (req, res) {
    var patientKey = req.query.userKey
    let database = {};

    //request the patient data
    requestPatient = new tedious.Request("SELECT * FROM Patient WHERE PatientId IN ('" + patientKey + "');", function (err, rowCount, rows) {
        database.User = rows;
        //now get the patient contact data
        requestContact = new tedious.Request("SELECT * FROM Contact WHERE ContactId IN ('" + database.User[0][5].value + "');", function (err, rowCount, rows) {
            database.Contact = rows;
            //now get all of the patient billing information
            requestBilling = new tedious.Request("SELECT * FROM Billing_Information WHERE PatientId IN ('" + patientKey + "');", function (err, rowCount, rows) {
                database.Billing = rows;
                //now get the insurance plan
                requestInsurance = new tedious.Request("SELECT PlanId, PlanName, InsuranceCompanyId, (SELECT FirmName FROM Insurance_Company WHERE InsuranceCompanyId = (SELECT InsuranceCompanyId FROM Insurance_Plan WHERE PlanId IN ('" + database.User[0][6].value + "'))) FROM Insurance_Plan WHERE PlanId IN ('" + database.User[0][6].value + "');", function (err, rowCount, rows) {
                    database.Insurance = rows;
                    //now get the invoices that havent been paid yet
                    requestInvoice= new tedious.Request("SELECT * FROM Invoice WHERE PatientId IN ('" + patientKey + "');", function (err, rowCount, rows) {
                        database.Invoice = rows;
                        //now send it to the website
                        res.send(database)
                    });
                    connection.execSql(requestInvoice);
                });
                connection.execSql(requestInsurance);
            });
            connection.execSql(requestBilling);
        });
        connection.execSql(requestContact);
    });
    connection.execSql(requestPatient);
});

//////////////////////////////////////////////////////////////////////////////// SERVER INSURANCE PAGES
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