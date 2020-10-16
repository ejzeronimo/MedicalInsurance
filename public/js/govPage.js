//this will load jquery into the website
var script = document.createElement('script');
script.src = 'https://code.jquery.com/jquery-3.4.1.min.js';
script.type = 'text/javascript';
document.getElementsByTagName('head')[0].appendChild(script);

var database = {};
var govKey;

function requestDatabaseInformationReadOnly() {
    govKey = window.location.search.replace("?userKey=", "");

    $.get("/government_page?userKey=" + encodeURIComponent(govKey), function (data, status) {
        database = data;
        console.log(database);

        //load the topbar with all needed information
        personalizePage();
        generateTreatmentTable();
        generateDrugTable();
    });
}

function personalizePage() {
    //change the welcome text to show the amount of treatments and drugs
    document.getElementById("userInfo").innerHTML += database.Drug.length + " Government standardized drugs<br>" + database.Treatment.length + " Government standardized treatments";
}

function generateTreatmentTable() {
    if (database.Treatment.length > 0) {
        var outputHtml = "<div class='Table'> <table> <tr>";
        for (var i = 0; i < database.Treatment[0].length; i++) {
            outputHtml += "<th>" + database.Treatment[0][i].metadata.colName + "</th>";
        }
        outputHtml += "</tr>";
        //iterate through the User table
        for (var i = 0; i < database.Treatment.length; i++) {
            // for each row (unique user)
            outputHtml += "<tr>";
            for (var j = 0; j < database.Treatment[i].length; j++) {
                // for each data point
                outputHtml += "<td>" + database.Treatment[i][j].value + "</td>";
            }
            outputHtml += "</tr>";
        }
        outputHtml += "</table> </div>";
        //add it to the div
        document.getElementById("treatmentTable").innerHTML += outputHtml;
    }
}

function generateDrugTable() {
    if (database.Drug.length > 0) {
        var outputHtml = "<div class='Table'> <table> <tr>";
        for (var i = 0; i < database.Drug[0].length; i++) {
            outputHtml += "<th>" + database.Drug[0][i].metadata.colName + "</th>";
        }
        outputHtml += "</tr>";
        //iterate through the User table
        for (var i = 0; i < database.Drug.length; i++) {
            // for each row (unique user)
            outputHtml += "<tr>";
            for (var j = 0; j < database.Drug[i].length; j++) {
                // for each data point
                outputHtml += "<td>" + database.Drug[i][j].value + "</td>";
            }
            outputHtml += "</tr>";
        }
        outputHtml += "</table> </div>";
        //add it to the div
        document.getElementById("drugTable").innerHTML += outputHtml;
    }
}

function addTreatmentToSystem() {
    //just add the info
    $.post("/add_treatment", {
        description: document.getElementById("treatmentDescription").value,
        price: document.getElementById("treatmentPrice").value,
        govId: govKey
    }, function (data, status, xhr) {
        if (Object.keys(data).length == 0) {
            alert("The treatment has been added to the database correctly!");
            location.reload();
        } else {
            alert(data);
        }
    });
}

function addDrugToSystem() {
    //just add the info
    $.post("/add_drug", {
        description: document.getElementById("drugDescription").value,
        price: document.getElementById("drugPrice").value,
        govId: govKey
    }, function (data, status, xhr) {
        if (Object.keys(data).length == 0) {
            alert("The drug has been added to the database correctly!");
            location.reload();
        } else {
            alert(data);
        }
    });
}