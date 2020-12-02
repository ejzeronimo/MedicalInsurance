//add jquery to the html page
var script = document.createElement('script');
script.src = 'https://code.jquery.com/jquery-3.4.1.min.js';
script.type = 'text/javascript';
document.getElementsByTagName('head')[0].appendChild(script);

function onload() {
    var queryString = window.location.search.replace("?failed=", "");
    if (queryString == "true")
    {
        document.getElementById("error").style.display = "block";
    }
}

function login() {
    //encypt the login information
    var encrypted = CryptoJS.AES.encrypt(document.getElementById("passkey").value, "Secret Passphrase");
    // call the submit event
    $.post("/login_request", {
        id: document.getElementById("id").value,
        passkey: CryptoJS.AES.encrypt(document.getElementById("passkey").value, "Secret Passphrase").toString()
    }, function (data, status, xhr) {
        window.location.assign(data)
    });
}