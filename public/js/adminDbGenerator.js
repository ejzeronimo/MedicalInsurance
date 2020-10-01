//this will genrate every tabel from the db
var script = document.createElement('script');
script.src = 'https://code.jquery.com/jquery-3.4.1.min.js';
script.type = 'text/javascript';
document.getElementsByTagName('head')[0].appendChild(script);

var database = {};

function requestDatabaseInformationReadOnly() {
    $.get("/sql_database", function (data, status) {
        database = data
        console.log(database);
        generateHospitalTable();
        generateFirmTable();
        generateUserTable();
        generateTreatmentTable();
        generateInsurancePlanTable();
        generateInvoiceTable();
    });
}

function generateUserTable() {
    outputHtml = "<table> <tr>";
    for (var i = 0; i < database.UserTable[0].length; i++) {
        outputHtml += "<th>" + database.UserTable[0][i].metadata.colName + "</th>";
    }
    outputHtml += "</tr>";
    //iterate through the User table
    for (var i = 0; i < database.UserTable.length; i++) {
        // for each row (unique user)
        outputHtml += "<tr>";
        for (var j = 0; j < database.UserTable[i].length; j++) {
            // for each data point
            outputHtml += "<td>" + database.UserTable[i][j].value  + "</td>";
        }
        outputHtml += "</tr>";
    }
    outputHtml += "</table>";
    //add it to the div
    document.getElementById("UserTable" ).innerHTML = outputHtml;
}

function generateHospitalTable() {
    outputHtml = "<table> <tr>";
    for (var i = 0; i < database.HospitalTable[0].length; i++) {
        outputHtml += "<th>" + database.HospitalTable[0][i].metadata.colName + "</th>";
    }
    outputHtml += "</tr>";
    //iterate through the User table
    for (var i = 0; i < database.HospitalTable.length; i++) {
        // for each row (unique user)
        outputHtml += "<tr>";
        for (var j = 0; j < database.HospitalTable[i].length; j++) {
            // for each data point
            outputHtml += "<td>" + database.HospitalTable[i][j].value  + "</td>";
        }
        outputHtml += "</tr>";
    }
    outputHtml += "</table>";
    //add it to the div
    document.getElementById("HospitalTable" ).innerHTML = outputHtml;
}

function generateFirmTable() {
    outputHtml = "<table> <tr>";
    for (var i = 0; i < database.InsuranceTable[0].length; i++) {
        outputHtml += "<th>" + database.InsuranceTable[0][i].metadata.colName + "</th>";
    }
    outputHtml += "</tr>";
    //iterate through the User table
    for (var i = 0; i < database.InsuranceTable.length; i++) {
        // for each row (unique user)
        outputHtml += "<tr>";
        for (var j = 0; j < database.InsuranceTable[i].length; j++) {
            // for each data point
            outputHtml += "<td>" + database.InsuranceTable[i][j].value  + "</td>";
        }
        outputHtml += "</tr>";
    }
    outputHtml += "</table>";
    //add it to the div
    document.getElementById("InsuranceTable" ).innerHTML = outputHtml;
}

function generateTreatmentTable() {
    outputHtml = "<table> <tr>";
    for (var i = 0; i < database.TreatmentTable[0].length; i++) {
        outputHtml += "<th>" + database.TreatmentTable[0][i].metadata.colName + "</th>";
    }
    outputHtml += "</tr>";
    //iterate through the User table
    for (var i = 0; i < database.TreatmentTable.length; i++) {
        // for each row (unique user)
        outputHtml += "<tr>";
        for (var j = 0; j < database.TreatmentTable[i].length; j++) {
            // for each data point
            outputHtml += "<td>" + database.TreatmentTable[i][j].value  + "</td>";
        }
        outputHtml += "</tr>";
    }
    outputHtml += "</table>";
    //add it to the div
    document.getElementById("TreatmentTable" ).innerHTML = outputHtml;
}

function generateInsurancePlanTable() {
    outputHtml = "<table> <tr>";
    for (var i = 0; i < database.InsurancePlanTable[0].length; i++) {
        outputHtml += "<th>" + database.InsurancePlanTable[0][i].metadata.colName + "</th>";
    }
    outputHtml += "</tr>";
    //iterate through the User table
    for (var i = 0; i < database.InsurancePlanTable.length; i++) {
        // for each row (unique user)
        outputHtml += "<tr>";
        for (var j = 0; j < database.InsurancePlanTable[i].length; j++) {
            // for each data point
            outputHtml += "<td>" + database.InsurancePlanTable[i][j].value  + "</td>";
        }
        outputHtml += "</tr>";
    }
    outputHtml += "</table>";
    //add it to the div
    document.getElementById("InsurancePlanTable" ).innerHTML = outputHtml;
}

function generateInvoiceTable() {
    outputHtml = "<table> <tr>";
    for (var i = 0; i < database.InvoiceTable[0].length; i++) {
        outputHtml += "<th>" + database.InvoiceTable[0][i].metadata.colName + "</th>";
    }
    outputHtml += "</tr>";
    //iterate through the User table
    for (var i = 0; i < database.InvoiceTable.length; i++) {
        // for each row (unique user)
        outputHtml += "<tr>";
        for (var j = 0; j < database.InvoiceTable[i].length; j++) {
            // for each data point
            outputHtml += "<td>" + database.InvoiceTable[i][j].value  + "</td>";
        }
        outputHtml += "</tr>";
    }
    outputHtml += "</table>";
    //add it to the div
    document.getElementById("InvoiceTable" ).innerHTML = outputHtml;
}