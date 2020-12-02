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
    document.getElementById("userInfo").innerHTML += database.User[0][3].value + " " +  database.User[0][4].value;
    //now get the address of the user
    document.getElementById("contactInfo").innerHTML += "<div style='float:right;margin-left:15px;'>" + database.Contact[0][1].value + "<br>" + database.Contact[0][2].value + "," + database.Contact[0][3].value + " " + database.Contact[0][4].value + "</div><div style='float:left;'> Phone: " + database.Contact[0][5].value + "<br> Email: " + database.Contact[0][6].value  + "</div>";
    //set insurance to none if the id is null
    if (database.User[0][6].value == undefined) {
        document.getElementById("insuranceInfo").innerHTML = "No viable insurance company";
    } else {
        document.getElementById("insuranceInfo").innerHTML += "<div style='float:right;margin-left:15px;'>Insurance Plan:<br>" + database.Insurance[0][1].value + "</div><div style='float:left;'>Provided By:<br>" + database.Insurance[0][3].value + "</div>";
    }
}

function changeBillingType() {
    if (document.getElementById("billingType").value == "cash") {
        document.getElementById("billingCash").style.display = "block";
        document.getElementById("billingCard").style.display = "none";
    } else {
        document.getElementById("billingCash").style.display = "none";
        document.getElementById("billingCard").style.display = "block";
    }
}

function updateBillingInformation() {
    if (document.getElementById("billingType").value == "cash") {
        //check if accepted
        if (document.getElementById("consentYes").checked) {
            //then let it go
            document.getElementById("formBilling").style.display = "none";
        } else {
            alert("You must consent to use cash payment type.");
        }
    } else {
        if (document.getElementById("cardNumber").value.length != 16 || document.getElementById("cvv").value.length != 3 || document.getElementById("expirationDate").value.length != 7) {
            alert("You must fill out all information properly.");
        } else {
            //then let it go
            document.getElementById("formBilling").style.display = "none";
        }
    }

}

function payOutstandingInvoice(index) {
    $.post("/pay_invoice", {
        foo: index
    }, function (data, status, xhr) {
        if (Object.keys(data).length == 0) {
            alert("The payment is being processed, will take up to 24 hours");
            location.reload();
        } else {
            alert(data);
        }
    });
}

function helpWithOutstandingInvoice(index)
{
    alert("The refund has been requested.");
}

function generateInvoiceTable() {
    if (database.Invoice.length > 0) {
        var outputHtml = "<div class='Table'> <table> <tr>";
        for (var i = 0; i < database.Invoice[0].length; i++) {
            outputHtml += "<th>" + database.Invoice[0][i].metadata.colName + "</th>";
        }
        outputHtml += "<th>Pay</th><th>Refund</th></tr>";
        //iterate through the User table
        for (var i = 0; i < database.Invoice.length; i++) {
            // for each row (unique user)
            outputHtml += "<tr>";
            for (var j = 0; j < database.Invoice[i].length; j++) {
                // for each data point
                outputHtml += "<td>" + database.Invoice[i][j].value + "</td>";
            }
            outputHtml += '<td><button type="button" onclick="payOutstandingInvoice(' + i + ')" >Pay Invoice</button></td><td><button type="button" onclick="helpWithOutstandingInvoice(' + i + ')" >Request Refund</button></td></tr>';
        }
        outputHtml += "</table> </div>";
        //add it to the div
        document.getElementById("invoiceTable").innerHTML = outputHtml;
        //now we add it to the help page
        dropHtml = "";
        //iterate through the User table
        for (var i = 0; i < database.Invoice.length; i++) {
            dropHtml += '<option value="' + i + '">' + database.Invoice[i][0].value + " - " + database.Invoice[i][1].value + " - $" + database.Invoice[i][4].value + "</option>";
        }
        document.getElementById("selectedInvoice").innerHTML += dropHtml;
    }
}