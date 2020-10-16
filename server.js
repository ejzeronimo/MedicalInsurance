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
            //need to check other login types here
            requestGovernment = new tedious.Request("SELECT GovOfficialId FROM Government_Official WHERE (UserName = '" + userId + "') AND (Password = '" + userPasskey + "');", function (err, rowCount, rows) {
                //assume that if it returns a row than they logged in
                if (rows[0] != undefined) {
                    res.send("/government?userKey=" + rows[0][0].value);
                } else {
                    //check the insurance companies now
                    requestInsurance = new tedious.Request("SELECT InsuranceCompanyId FROM Insurance_Company WHERE (UserName = '" + userId + "') AND (Password = '" + userPasskey + "');", function (err, rowCount, rows) {
                        //assume that if it returns a row than they logged in
                        if (rows[0] != undefined) {
                            res.send("/insurance?userKey=" + rows[0][0].value);
                        } else {
                            //now go back
                            res.send("/");
                        }
                    });
                    connection.execSql(requestInsurance);
                }
            });
            connection.execSql(requestGovernment);
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
                    requestInvoice = new tedious.Request("SELECT * FROM Invoice WHERE PatientId IN ('" + patientKey + "');", function (err, rowCount, rows) {
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

//////////////////////////////////////////////////////////////////////////////// SERVER GOVERNMENT PAGES
app.get('/government', function (req, res) {
    res.sendFile(__dirname + "/public/government.html");
});

app.get('/government_page', function (req, res) {
    var govKey = req.query.userKey
    let database = {};

    //request every treatment
    requestTreatment = new tedious.Request("SELECT * FROM Treatment WHERE GovOfficialId IN ('" + govKey + "');", function (err, rowCount, rows) {
        database.Treatment = rows;
        //now get every drug
        requestDrug = new tedious.Request("SELECT * FROM Drug WHERE GovOfficialId IN ('" + govKey + "');", function (err, rowCount, rows) {
            database.Drug = rows;
            //now get the patient contact data
            res.send(database);
        });
        connection.execSql(requestDrug);
    });
    connection.execSql(requestTreatment);
});

app.post('/add_treatment', function (req, res) {
    addTreatment = new tedious.Request("INSERT INTO Treatment (TreatmentId, Description,Price, GovOfficialId) VALUES (NEWID(),'" + req.body.description + "'," + req.body.price + ",'" + req.body.govId + "');", function (err, rowCount, rows) {
        res.send(err);
    });
    connection.execSql(addTreatment);
});

app.post('/add_drug', function (req, res) {
    addDrug = new tedious.Request("INSERT INTO Drug (DrugId, Description,Price, GovOfficialId) VALUES (NEWID(),'" + req.body.description + "'," + req.body.price + ",'" + req.body.govId + "');", function (err, rowCount, rows) {
        res.send(err);
    });
    connection.execSql(addDrug);
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