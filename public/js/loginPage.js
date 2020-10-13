//add jquery to the html page
var script = document.createElement('script');
script.src = 'https://code.jquery.com/jquery-3.4.1.min.js';
script.type = 'text/javascript';
document.getElementsByTagName('head')[0].appendChild(script);

function login()
{
    //encypt the login information
    var encrypted = CryptoJS.AES.encrypt(document.getElementById("passkey").value, "Secret Passphrase");
    console.log(encrypted);
    // call the submit event
    $.post("/submit_login", { id: document.getElementById("id").value, passkey: CryptoJS.AES.encrypt(document.getElementById("passkey").value, "Secret Passphrase").toString() });
}