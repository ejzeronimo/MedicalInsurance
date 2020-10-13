//this will genrate every tabel from the db
var script = document.createElement('script');
script.src = 'https://code.jquery.com/jquery-3.4.1.min.js';
script.type = 'text/javascript';
document.getElementsByTagName('head')[0].appendChild(script);

var database = [];

function requestDatabaseInformationReadOnly() {
    $.get("/sql_database", function (data, status) {
        database = data
        console.log(database);
        generateTables();
    });
}

function generateTables() {
    for (var d = 0; d < database.length; d++) {
        if (database[d].length > 0) {
            var outputHtml = "<div class='Table'> <table> <tr>";
            for (var i = 0; i < database[d][0].length; i++) {
                outputHtml += "<th>" + database[d][0][i].metadata.colName + "</th>";
            }
            outputHtml += "</tr>";
            //iterate through the User table
            for (var i = 0; i < database[d].length; i++) {
                // for each row (unique user)
                outputHtml += "<tr>";
                for (var j = 0; j < database[d][i].length; j++) {
                    // for each data point
                    outputHtml += "<td>" + database[d][i][j].value + "</td>";
                }
                outputHtml += "</tr>";
            }
            outputHtml += "</table> </div>";
            //add it to the div
            document.body.innerHTML += outputHtml;
        }
    }
}