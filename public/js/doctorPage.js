//this will genrate every tabel from the db
var script = document.createElement('script');
script.src = 'https://code.jquery.com/jquery-3.4.1.min.js';
script.type = 'text/javascript';
document.getElementsByTagName('head')[0].appendChild(script);

var database = {};

function requestDatabaseInformationReadOnly() {
    $.post("/read_only", null, function (data, status, xhr) {
        if (data) {
            document.getElementById("readOnly").style.display = "block";
        } else {
            document.getElementById("writeOnly").style.display = "block";
        }
    });
    const queryString = window.location.search.replace("?userKey=", "");

    $.get("/doctor_page?userKey=" + encodeURIComponent(queryString), function (data, status) {
        database = data
        personalizePage();
        generateInvoiceTable();
        generateDropDowns();
    });
}

function personalizePage() {
    //make the welcome text say the name of the firm
    document.getElementById("userInfo").innerHTML += database.Doctor[0][2].value + ", " + database.Doctor[0][1].value;
    //now get the address of the user
    document.getElementById("contactInfo").innerHTML += "<div style='float:right;margin-left:15px;'>" + database.Contact[0][1].value + "<br>" + database.Contact[0][2].value + "," + database.Contact[0][3].value + " " + database.Contact[0][4].value + "</div><div style='float:left;'> Phone: " + database.Contact[0][5].value + "<br> Email: " + database.Contact[0][6].value + "</div>";
    //set insurance to none if the id is null
    document.getElementById("insuranceInfo").innerHTML += database.Hospital[0][1].value + "<br>" + database.Hospital[0][2].value + "<br>" + database.Doctor[0][3].value;
    //now we change the page according to the level
    switch (database.Doctor[0][4].value) {
        case 0:
            //do nothing because the root sees everything
            break;
        case 1:
            //must sort by the dept
            break;
        case 2:
            //must sort by doctor
            break;
    }
}

function addInvoiceToSystem() {
    if (confirm("Are you sure you wish to have this invoice added?")) {
        //just add the info
        $.post("/add_invoice", {
            patient: document.getElementById("patientSelect").value,
            treatment: document.getElementById("treatmentSelect").value,
            drug: document.getElementById("drugSelect").value,
            doctor: database.Doctor[0][0].value
        }, function (data, status, xhr) {
            if (Object.keys(data).length == 0) {
                alert("The treatment has been sent to the database correctly!");
                location.reload();
            } else {
                alert(data);
            }
        });
    }
}

function generateInvoiceTable() {
    //general invoice table
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
        document.getElementById("invoiceTable").innerHTML += outputHtml;
    }
    //not paid by patient table
    if (database.Invoice.length > 0) {
        var outputHtml = "<div class='Table'> <table> <tr>";
        for (var i = 0; i < database.Invoice[0].length; i++) {
            outputHtml += "<th>" + database.Invoice[0][i].metadata.colName + "</th>";
        }
        outputHtml += "</tr>";
        //iterate through the User table
        for (var i = 0; i < database.Invoice.length; i++) {
            if (!database.Invoice[i][5].value) {
                // for each row (unique user)
                outputHtml += "<tr>";
                for (var j = 0; j < database.Invoice[i].length; j++) {
                    // for each data point
                    outputHtml += "<td>" + database.Invoice[i][j].value + "</td>";
                }
                outputHtml += "</tr>";
            }
        }
        outputHtml += "</table> </div>";
        //add it to the div
        document.getElementById("patientTable").innerHTML += outputHtml;
    }
    //not paid by patient table
    if (database.Invoice.length > 0) {
        var outputHtml = "<div class='Table'> <table> <tr>";
        for (var i = 0; i < database.Invoice[0].length; i++) {
            outputHtml += "<th>" + database.Invoice[0][i].metadata.colName + "</th>";
        }
        outputHtml += "</tr>";
        //iterate through the User table
        for (var i = 0; i < database.Invoice.length; i++) {
            if (!database.Invoice[i][4].value) {
                // for each row (unique user)
                outputHtml += "<tr>";
                for (var j = 0; j < database.Invoice[i].length; j++) {
                    // for each data point
                    outputHtml += "<td>" + database.Invoice[i][j].value + "</td>";
                }
                outputHtml += "</tr>";
            }
        }
        outputHtml += "</table> </div>";
        //add it to the div
        document.getElementById("insuranceTable").innerHTML += outputHtml;
    }
}

function generateDropDowns() {
    var outputHtml = "";
    for (var i = 0; i < database.Patients.length; i++) {
        outputHtml += "<option value='" + database.Patients[i][0].value + "'>" + database.Patients[i][3].value +" "+ database.Patients[i][4].value + "</option>";
    }
    document.getElementById("patientSelect").innerHTML += outputHtml;

    outputHtml = "";
    for (var i = 0; i < database.Treatments.length; i++) {
        outputHtml += "<option value='" + database.Treatments[i][0].value + "'>" + database.Treatments[i][1].value +" - "+ database.Treatments[i][0].value +" - $"+ database.Treatments[i][2].value + "</option>";
    }
    document.getElementById("treatmentSelect").innerHTML += outputHtml;

    outputHtml = "";
    for (var i = 0; i < database.Drugs.length; i++) {
        outputHtml += "<option value='" + database.Drugs[i][0].value + "'>" + database.Drugs[i][1].value +" - "+ database.Drugs[i][0].value +" - $"+ database.Drugs[i][2].value + "</option>";
    }
    document.getElementById("drugSelect").innerHTML += outputHtml;
}