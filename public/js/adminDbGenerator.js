//this will genrate every tabel from the db
var script = document.createElement('script');
script.src = 'https://code.jquery.com/jquery-3.4.1.min.js';
script.type = 'text/javascript';
document.getElementsByTagName('head')[0].appendChild(script);

var database = {};

function requestDatabaseInformationReadOnly() {
    //have tha app get
    $.get("/user_database", function (data, status) {
        database = data
        generateUserTable();
    });
}

function generateUserTable() {
    outputHtml = "<table> <tr> <th>" + database.UserTable[0][0].metadata.colName + "</th> <th>" + database.UserTable[0][1].metadata.colName + "</th> <th>" + database.UserTable[0][2].metadata.colName + "</th> <th>" + database.UserTable[0][3].metadata.colName + "</th> </tr> ";
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