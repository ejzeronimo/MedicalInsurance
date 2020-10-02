//this will genrate every tabel from the db
var script = document.createElement('script');
script.src = 'https://code.jquery.com/jquery-3.4.1.min.js';
script.type = 'text/javascript';
document.getElementsByTagName('head')[0].appendChild(script);

var database = {};

function requestDatabaseInformationReadOnly() 
{
    const queryString = window.location.search.replace("?userKey=","");

    $.get("/insurance_page?userKey=" + encodeURIComponent(queryString), function (data, status) {
        database = data
        console.log(database);

        //say hello
        document.getElementById("topbar").innerHTML += '<div id="welcomeText"> Welcome: ' + database.User[0][2].value + " of " + database.InsuranceTable[0][1].value + "</div>";

        generateUserTable();
        generateInsurancePlanTable();
        generateInvoiceTable();
    });
}

function payOutstandingInvoicesAuto()
{
    alert("Command has been sent to the database to be processed, database will be updated accordingly once the request copmpletes.");
}

function payOutstandingInvoice(index)
{
    if(confirm("You are confirming that the invoice is to be calculated and paid for the \nTreatment: " + database.InvoiceTable[index][0].value +  "\nHospital: " + database.InvoiceTable[index][1].value+  "\nPatient: " + database.InvoiceTable[index][2].value +  "\nProctor: " + database.InvoiceTable[index][3].value +  "\nAre you sure this is the correct invoice?"))
    {
        alert("Command has been sent to the database to be processed, database will be updated accordingly once the request copmpletes.");
    }
}

function generateUserTable() {
    outputHtml = "<table> <tr>";
    for (var i = 0; i < database.PatientTable[0].length; i++) {
        outputHtml += "<th>" + database.PatientTable[0][i].metadata.colName + "</th>";
    }
    outputHtml += "</tr>";
    //iterate through the User table
    for (var i = 0; i < database.PatientTable.length; i++) {
        // for each row (unique user)
        outputHtml += "<tr>";
        for (var j = 0; j < database.PatientTable[i].length; j++) {
            // for each data point
            outputHtml += "<td>" + database.PatientTable[i][j].value + "</td>";
        }
        outputHtml += "</tr>";
    }
    outputHtml += "</table>";
    //add it to the div
    document.getElementById("UserTableInsurance").innerHTML += outputHtml;
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
            outputHtml += "<td>" + database.InsurancePlanTable[i][j].value + "</td>";
        }
        outputHtml += "</tr>";
    }
    outputHtml += "</table>";
    //add it to the div
    document.getElementById("InsurancePlanTableInsurance").innerHTML += outputHtml;
}



function makeInvoiceButton(data)
{
    return  '<button type="button" onclick="payOutstandingInvoice('+ data +')" >Pay Invoice</button>';
}


function generateInvoiceTable() {
    outputHtml = "<table> <tr>";
    for (var i = 0; i < database.InvoiceTable[0].length; i++) {
        outputHtml += "<th>" + database.InvoiceTable[0][i].metadata.colName + "</th>";
    }
    //will add teh button row
    outputHtml += "<th> Pay Invoice </th>";
    outputHtml += "</tr>";
    //iterate through the User table
    for (var i = 0; i < database.InvoiceTable.length; i++) {
        // for each row (unique user)
        outputHtml += "<tr>";
        for (var j = 0; j < database.InvoiceTable[i].length; j++) {
            // for each data point
            outputHtml += "<td>" + database.InvoiceTable[i][j].value + "</td>";
        }
        outputHtml += "<td>" + makeInvoiceButton(i) + "</td>";
        outputHtml += "</tr>";
    }
    outputHtml += "</table>";
    //add it to the div
    document.getElementById("InvoiceTableInsurance").innerHTML += outputHtml;
}