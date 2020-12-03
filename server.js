//////////////////////////////////////////////////////////////////////////////// GLOBALS
const express = require('express');
var bodyParser = require('body-parser');
var tedious = require('tedious');
var CryptoJS = require("crypto-js");
var readOnly = false;
var hosted = true;

//////////////////////////////////////////////////////////////////////////////// SQL CONFIGS AND CONNECTION
var config = {
    server: (hosted ? 'localhost' : '172.16.17.117'),
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

//////////////////////////////////////////////////////////////////////////////// SERVER READONLY SYSTEM
app.post('/read_only', function (req, res) {
    res.send(readOnly);
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
                                    res.send("/?failed=true");
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

//////////////////////////////////////////////////////////////////////////////// SERVER PATIENT PAGE
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
                    requestInvoice = new tedious.Request("SELECT (SELECT FirstName + ' ' +  LastName FROM Doctor WHERE DoctorId = Invoice.DoctorId) AS Doctor, DateIssued, (SELECT Description FROM Treatment WHERE TreatmentId = Invoice.TreatmentId) AS Treatment, (SELECT Description FROM Drug WHERE DrugId = Invoice.DrugId) AS Drug, OutstandingBalance FROM Invoice WHERE PatientId IN ('" + patientKey + "') AND IsPaidByPatient = 0 AND IsPaidByInsurance = 1 ORDER BY DateIssued;", function (err, rowCount, rows) {
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
    if (!readOnly) {
        payInvoice = new tedious.Request("UPDATE Invoice SET outstandingbalance = 0, IsPaidByPatient = 1 WHERE PatientId = '" + req.body.patient + "' AND DoctorId = (SELECT doctorid FROM doctor WHERE (FirstName + ' ' + LastName) = '" + req.body.doctor + "') AND DateIssued = '" + req.body.time + "';", function (err, rowCount, rows) {
            res.send(err);
        });
        connection.execSql(payInvoice);
    }
    res.send(null);
});

app.post('/request_refund', function (req, res) {
    if (!readOnly) {
        addRefund = new tedious.Request("INSERT INTO Refund (RefundId, RefundAmount,IsRefunded, PatientId,DoctorId,DateIssued ) VALUES (NEWID()," + req.body.amount + ",0,'" + req.body.patient + "',(SELECT doctorid FROM doctor WHERE (FirstName + ' ' + LastName) = '" + req.body.doctor + "'),'" + req.body.time + "');", function (err, rowCount, rows) {
            res.send(err);
        });
        connection.execSql(addRefund);
    }
    res.send(null);
});

app.post('/change_billing', function (req, res) {
    if (!readOnly) {
        var changeBilling;
        if (req.body.isCash == 'true') {
            changeBilling = new tedious.Request("UPDATE Billing_Information SET CreditCardNumber = null, CredCardExpiractionDate = null, CreditCardCVV = null, isCashPay = 1 WHERE PatientId = '" + req.body.patient + "';", function (err, rowCount, rows) {
                res.send(err);
            });
        } else {
            changeBilling = new tedious.Request("UPDATE Billing_Information SET CreditCardNumber = '"+req.body.cardNumber+"', CredCardExpiractionDate ='"+req.body.expirationDate+"', CreditCardCVV = '"+req.body.cvv+"', isCashPay = 0 WHERE PatientId = '" + req.body.patient + "';", function (err, rowCount, rows) {
                res.send(err);
            });
        }
        connection.execSql(changeBilling);
    }
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
    if (!readOnly) {
        addTreatment = new tedious.Request("INSERT INTO Treatment (TreatmentId, Description,Price, GovOfficialId) VALUES (NEWID(),'" + req.body.description + "'," + req.body.price + ",'" + req.body.govId + "');", function (err, rowCount, rows) {
            res.send(err);
        });
        connection.execSql(addTreatment);
    }
    //temp no edit database
    res.send(null);
});

app.post('/add_drug', function (req, res) {
    if (!readOnly) {
        addDrug = new tedious.Request("INSERT INTO Drug (DrugId, Description,Price, GovOfficialId) VALUES (NEWID(),'" + req.body.description + "'," + req.body.price + ",'" + req.body.govId + "');", function (err, rowCount, rows) {
            res.send(err);
        });
        connection.execSql(addDrug);
    }
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
                        requestRefund = new tedious.Request("SELECT * FROM Refund WHERE PatientId IN (" + patientList + ") AND IsRefunded  = 0 ORDER BY DateIssued;", function (err, rowCount, rows) {
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

app.post('/accept_refund', function (req, res) {
    //get refund by id
    if (!readOnly) {
        alterRefund = new tedious.Request("UPDATE Refund SET isrefunded = 1 WHERE refundid = '" + req.body.id + "';", function (err, rowCount, rows) {
            res.send(err);
        });
        connection.execSql(alterRefund);
    }
    res.send(null);
});

app.post('/pay_insurance', function (req, res) {
    var payment = 0;
    var plan;
    var tPayment = 0;
    var dPayment = 0;
    if (!readOnly) {
        getPlan = new tedious.Request("SELECT * FROM Insurance_Plan WHERE PlanId = (SELECT planid FROM patient WHERE (FirstName + ' ' + LastName) = '" + req.body.patient + "');", function (err, rowCount, rows) {
            plan = rows;
            getTreatment = new tedious.Request("SELECT * FROM Treatment WHERE Description = '" + req.body.treatment + "';", function (err, rowCount, rows) {
                tPayment = rows[0][2].value;
                getDrug = new tedious.Request("SELECT * FROM Drug WHERE Description = '" + req.body.drug + "';", function (err, rowCount, rows) {
                    dPayment = rows[0][2].value;
                    if (plan[0][2].value <= (dPayment + tPayment)) {
                        //take action
                        payment = (plan[0][3].value * tPayment) + (plan[0][4].value * dPayment);
                    }
                    payInvoice = new tedious.Request("UPDATE Invoice SET outstandingbalance = " + ((dPayment + tPayment) - payment) + ", IsPaidByInsurance = 1 WHERE PatientId = (SELECT PatientId FROM patient WHERE (FirstName + ' ' + LastName) = '" + req.body.patient + "') AND DoctorId = (SELECT doctorid FROM doctor WHERE (FirstName + ' ' + LastName) = '" + req.body.doctor + "') AND DateIssued = '" + req.body.time + "';", function (err, rowCount, rows) {
                        res.send(err);
                    });
                    connection.execSql(payInvoice);
                });
                connection.execSql(getDrug);
            });
            connection.execSql(getTreatment);
        });
        connection.execSql(getPlan);
    }
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
                requestPatients = new tedious.Request("SELECT * FROM Patient;", function (err, rowCount, rows) {
                    database.Patients = rows;
                    requestTreatments = new tedious.Request("SELECT * FROM Treatment;", function (err, rowCount, rows) {
                        database.Treatments = rows;
                        requestDrugs = new tedious.Request("SELECT * FROM Drug;", function (err, rowCount, rows) {
                            database.Drugs = rows;
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
                        connection.execSql(requestDrugs);
                    });
                    connection.execSql(requestTreatments);
                });
                connection.execSql(requestPatients);
                //now the get the required invoices
            });
            connection.execSql(requestContact);
        });
        connection.execSql(requestContact);
    });
    connection.execSql(requestDoctor);
});

app.post('/add_invoice', function (req, res) {
    if (!readOnly) {
        var bal = 0;
        var queryString = "";
        getDrugSum = new tedious.Request("SELECT SUM(price) FROM (SELECT 1 as id,price FROM Drug WHERE DrugId = '" + req.body.drug + "' UNION SELECT 1 as id,price FROM Treatment WHERE TreatmentId = '" + req.body.treatment + "') x group by id;", function (err, rowCount, rows) {
            bal = rows[0][0].value
            getBilling = new tedious.Request("SELECT billingId FROM Billing_Information WHERE patientid ='" + req.body.patient + "';", function (err, rowCount, rows) {
                if (rows[0] == undefined) {
                    queryString = "INSERT INTO Invoice (PatientId, DoctorId, DateIssued, TreatmentId, DrugId,OutstandingBalance,IsPaidByInsurance,IsPaidByPatient) VALUES ('" + req.body.patient + "','" + req.body.doctor + "',CONVERT(DATETIME,GETDATE()),'" + req.body.treatment + "','" + req.body.drug + "'," + bal + ",0,0);";
                } else {
                    queryString = "INSERT INTO Invoice (PatientId, DoctorId, DateIssued, TreatmentId, DrugId,BillingId,OutstandingBalance,IsPaidByInsurance,IsPaidByPatient) VALUES ('" + req.body.patient + "','" + req.body.doctor + "',CONVERT(DATETIME,GETDATE()),'" + req.body.treatment + "','" + req.body.drug + "','" + rows[0][0].value + "'," + bal + ",0,0);"
                }
                addInvoice = new tedious.Request(queryString, function (err, rowCount, rows) {
                    res.send(err);
                });
                connection.execSql(addInvoice);
            });
            connection.execSql(getBilling);
        });
        connection.execSql(getDrugSum);
    }
    //temp no edit database
    res.send(null);
});