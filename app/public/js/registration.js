

const req = new XMLHttpRequest();

req.open("POST", "/registration", true);
req.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');

const password = sha256( document.getElementById( 'password' ).value + salt );

let params = 'action=reg';