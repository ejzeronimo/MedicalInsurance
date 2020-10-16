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

    });
}
