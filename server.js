//////////////////////////////////////////////////////////////////////////////// GLOBALS
const express = require('express');
var bodyParser = require('body-parser');
var tedious = require('tedious');
var CryptoJS = require("crypto-js");

//////////////////////////////////////////////////////////////////////////////// SQL CONFIGS AND CONNECTION
var config = {
    server: 'localhost',
    //server: '172.16.17.117',
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
                            //check the last set of doctors
                            requestDoctor = new tedious.Request("SELECT DoctorId FROM Doctor WHERE (UserName = '" + userId + "') AND (Password = '" + userPasskey + "');", function (err, rowCount, rows) {
                                //assume that if it returns a row than they logged in
                                if (rows[0] != undefined) {
                                    //case statement to go through the patient access level
                                    res.send("/doctor?userKey=" + rows[0][0].value);
                                } else {
                                    //now go back
                                    res.send("/");
                                }
                            });
                            connection.execSql(requestDoctor);
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
    var patientKey = req.query.userKey;
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
                    requestInvoice = new tedious.Request("SELECT (SELECT FirstName + ' ' +  LastName FROM Doctor WHERE DoctorId = Invoice.DoctorId) AS Doctor, DateIssued, (SELECT Description FROM Treatment WHERE TreatmentId = Invoice.TreatmentId) AS Treatment, (SELECT Description FROM Drug WHERE DrugId = Invoice.DrugId) AS Drug, OutstandingBalance FROM Invoice WHERE PatientId IN ('" + patientKey + "') AND IsPaidByPatient = 0 ORDER BY DateIssued;", function (err, rowCount, rows) {
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

app.post('/pay_invoice', function (req, res) {
    //need to add next sprint
    //temp no edit database
    res.send(null);
});

//////////////////////////////////////////////////////////////////////////////// SERVER GOVERNMENT PAGES
app.get('/government', function (req, res) {
    res.sendFile(__dirname + "/public/government.html");
});

app.get('/government_page', function (req, res) {
    var govKey = req.query.userKey;
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
    //connection.execSql(addTreatment);
    //temp no edit database
    res.send(null);
});

app.post('/add_drug', function (req, res) {
    addDrug = new tedious.Request("INSERT INTO Drug (DrugId, Description,Price, GovOfficialId) VALUES (NEWID(),'" + req.body.description + "'," + req.body.price + ",'" + req.body.govId + "');", function (err, rowCount, rows) {
        res.send(err);
    });
    //connection.execSql(addDrug);
    //temp no edit database
    res.send(null);
});

//////////////////////////////////////////////////////////////////////////////// SERVER INSURANCE PAGES
app.get('/insurance', function (req, res) {
    res.sendFile(__dirname + "/public/insurance.html");
});

app.get('/insurance_page', function (req, res) {
    var insuranceKey = req.query.userKey;
    let database = {};

    //get all of the firm data
    requestFirm = new tedious.Request("SELECT * FROM Insurance_Company WHERE InsuranceCompanyId IN ('" + insuranceKey + "');", function (err, rowCount, rows) {
        database.Firm = rows;
        //now get the firm contact data
        requestContact = new tedious.Request("SELECT * FROM Contact WHERE ContactId IN ('" + database.Firm[0][4].value + "');", function (err, rowCount, rows) {
            database.Contact = rows;
            //get every plan offered by the firm
            requestPlan = new tedious.Request("SELECT * FROM Insurance_Plan WHERE InsuranceCompanyId IN ('" + insuranceKey + "');", function (err, rowCount, rows) {
                database.Plan = rows;
                //now get all invoices with involved patients
                var planList = "";
                for (var i = 0; i < database.Plan.length; i++) {
                    if (i > 0) {
                        planList += ",";
                    }
                    planList += "'" + database.Plan[i][0].value + "'";
                }
                requestPatient = new tedious.Request("SELECT PatientId FROM Patient WHERE PlanId IN (" + planList + ");", function (err, rowCount, rows) {
                    database.Patient = rows;
                    //now get those invoices
                    var patientList = "";
                    for (var i = 0; i < database.Patient.length; i++) {
                        if (i > 0) {
                            patientList += ",";
                        }
                        patientList += "'" + database.Patient[i][0].value + "'";
                    }
                    requestInvoice = new tedious.Request("SELECT (SELECT FirstName + ' ' +  LastName FROM Patient WHERE PatientId = Invoice.PatientId) AS Patient, (SELECT FirstName + ' ' +  LastName FROM Doctor WHERE DoctorId = Invoice.DoctorId) AS Doctor, DateIssued, (SELECT Description FROM Treatment WHERE TreatmentId = Invoice.TreatmentId) AS Treatment, (SELECT Description FROM Drug WHERE DrugId = Invoice.DrugId) AS Drug, OutstandingBalance FROM Invoice WHERE PatientId IN (" + patientList + ") AND IsPaidByInsurance = 0 ORDER BY DateIssued;", function (err, rowCount, rows) {
                        database.Invoice = rows;
                        requestRefund = new tedious.Request("SELECT * FROM Refund WHERE PatientId IN (" + patientList + ") ORDER BY DateIssued;", function (err, rowCount, rows) {
                            database.Refund = rows;
                            //now send it to the website
                            res.send(database)
                        });
                        connection.execSql(requestRefund);
                    });
                    connection.execSql(requestInvoice);
                });
                connection.execSql(requestPatient)
            });
            connection.execSql(requestPlan);
        });
        connection.execSql(requestContact);
    });
    connection.execSql(requestFirm);
});

app.post('/pay_insurance', function (req, res) {
    //need to add next sprint
    //temp no edit database
    res.send(null);
});

//////////////////////////////////////////////////////////////////////////////// SERVER DOCTOR PAGES
app.get('/doctor', function (req, res) {
    res.sendFile(__dirname + "/public/doctor.html");
});

app.get('/doctor_page', function (req, res) {
    var docKey = req.query.userKey;
    let database = {};

    //request the doctor data
    requestDoctor = new tedious.Request("SELECT * FROM Doctor WHERE DoctorId IN ('" + docKey + "');", function (err, rowCount, rows) {
        database.Doctor = rows;
        //request the contact data
        requestContact = new tedious.Request("SELECT * FROM Contact WHERE ContactId IN ('" + database.Doctor[0][7].value + "');", function (err, rowCount, rows) {
            database.Contact = rows;
            //now the get the hospital data
            requestContact = new tedious.Request("SELECT * FROM Hospital WHERE HospitalId IN ('" + database.Doctor[0][8].value + "');", function (err, rowCount, rows) {
                database.Hospital = rows;
                var requestString = "";
                //now the get the required invoices
                switch (database.Doctor[0][4].value) {
                    case 0:
                        requestList = new tedious.Request("SELECT DoctorId FROM Doctor WHERE HospitalId IN ('" + database.Doctor[0][8].value + "');", function (err, rowCount, rows) {
                            var docList = "";
                            for (var i = 0; i < rows.length; i++) {
                                if (i > 0) {
                                    docList += ",";
                                }
                                docList += "'" + rows[i][0].value + "'";
                            }
                            requestInvoice = new tedious.Request("SELECT (SELECT FirstName + ' ' +  LastName FROM Patient WHERE PatientId = Invoice.PatientId) AS Patient, (SELECT FirstName + ' ' +  LastName FROM Doctor WHERE DoctorId = Invoice.DoctorId) AS Doctor,  (SELECT Description FROM Treatment WHERE TreatmentId = Invoice.TreatmentId) AS Treatment, (SELECT Description FROM Drug WHERE DrugId = Invoice.DrugId) AS Drug, IsPaidByInsurance, IsPaidByPatient FROM Invoice WHERE DoctorId IN (" + docList + ") ORDER BY DateIssued;", function (err, rowCount, rows) {
                                database.Invoice = rows;
                                //now send that stuff
                                res.send(database)
                            });
                            connection.execSql(requestInvoice);
                        });
                        connection.execSql(requestList);
                        break;
                    case 1:
                        requestList = new tedious.Request("SELECT DoctorId FROM Doctor WHERE Department IN ('" + database.Doctor[0][3].value + "');", function (err, rowCount, rows) {
                            var docList = "";
                            for (var i = 0; i < rows.length; i++) {
                                if (i > 0) {
                                    docList += ",";
                                }
                                docList += "'" + rows[i][0].value + "'";
                            }
                            requestInvoice = new tedious.Request("SELECT (SELECT FirstName + ' ' +  LastName FROM Patient WHERE PatientId = Invoice.PatientId) AS Patient, (SELECT FirstName + ' ' +  LastName FROM Doctor WHERE DoctorId = Invoice.DoctorId) AS Doctor,  (SELECT Description FROM Treatment WHERE TreatmentId = Invoice.TreatmentId) AS Treatment, (SELECT Description FROM Drug WHERE DrugId = Invoice.DrugId) AS Drug, IsPaidByInsurance, IsPaidByPatient FROM Invoice WHERE DoctorId IN (" + docList + ") ORDER BY DateIssued;", function (err, rowCount, rows) {
                                database.Invoice = rows;
                                //now send that stuff
                                res.send(database)
                            });
                            connection.execSql(requestInvoice);
                        });
                        connection.execSql(requestList);
                        break;
                    case 2:
                        requestInvoice = new tedious.Request("SELECT (SELECT FirstName + ' ' +  LastName FROM Patient WHERE PatientId = Invoice.PatientId) AS Patient, (SELECT FirstName + ' ' +  LastName FROM Doctor WHERE DoctorId = Invoice.DoctorId) AS Doctor,  (SELECT Description FROM Treatment WHERE TreatmentId = Invoice.TreatmentId) AS Treatment, (SELECT Description FROM Drug WHERE DrugId = Invoice.DrugId) AS Drug, IsPaidByInsurance, IsPaidByPatient FROM Invoice WHERE DoctorId IN ('" + docKey + "') ORDER BY DateIssued;", function (err, rowCount, rows) {
                            database.Invoice = rows;
                            //now send that stuff
                            res.send(database)
                        });
                        connection.execSql(requestInvoice);
                        break;
                }
            });
            connection.execSql(requestContact);
        });
        connection.execSql(requestContact);
    });
    connection.execSql(requestDoctor);
});