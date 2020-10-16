//this will load jquery into the website
var script = document.createElement('script');
script.src = 'https://code.jquery.com/jquery-3.4.1.min.js';
script.type = 'text/javascript';
document.getElementsByTagName('head')[0].appendChild(script);

var database = {};

function requestDatabaseInformationReadOnly() {
    var queryString = window.location.search.replace("?userKey=", "");

    $.get("/patient_page?userKey=" + encodeURIComponent(queryString), function (data, status) {
        database = data;
        console.log(database);

        //load the topbar with all needed information
        personalizePage();
        generateInvoiceTable();
    });
}

function personalizePage() {
    //make the welcome text say the name of the user
    document.getElementById("userInfo").innerHTML += database.User[0][4].value + ', ' + database.User[0][3].value;
    //now get the address of the user
    document.getElementById("contactInfo").innerHTML += database.Contact[0][1].value + " " + database.Contact[0][2].value + ",<br>" + database.Contact[0][3].value + " " + database.Contact[0][4].value + "<br> Phone: " + database.Contact[0][5].value + "<br> Email: " + database.Contact[0][6].value;
    //set insurance to none if the id is null
    if (database.User[0][6].value == undefined) {
        document.getElementById("insuranceInfo").innerHTML = "No viable insurance plan";
    } else {
        document.getElementById("insuranceInfo").innerHTML += "Insurance Plan:<br>" + database.Insurance[0][1].value + "<br>Provided By:<br>" + database.Insurance[0][3].value;
    }
}

function makeInvoiceButton(data) {
    return '<button type="button" onclick="payOutstandingInvoice(' + data + ')" >Pay Invoice</button>';
}

function generateInvoiceTable() {
    if (database.Invoice.length > 0) {
        var outputHtml = "<div class='Table'> <table> <tr>";
        for (var i = 0; i < database.Invoice[0].length; i++) {
            outputHtml += "<th>" + database.Invoice[0][i].metadata.colName + "</th>";
        }
        outputHtml += "</tr>";
        //iterate through the User table
        for (var i = 0; i < database.Invoice.length; i++) {
            // for each row (unique user)
            outputHtml += "<tr>";
            for (var j = 0; j < database.Invoice[i].length; j++) {
                // for each data point
                outputHtml += "<td>" + database.Invoice[i][j].value + "</td>";
            }
            outputHtml += "</tr>";
        }
        outputHtml += "</table> </div>";
        //add it to the div
        document.body.innerHTML += outputHtml;
    }
    //add it to the div
    document.getElementById("invoiceTable").innerHTML = outputHtml;
}