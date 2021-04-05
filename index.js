const express = require('express');
const path = require('path');
const https = require('https');
const fs = require('fs');
const cookieParser = require('cookie-parser');
const { validateToken } = require('authentication');
require('dotenv').config();

const app = express();

app.disable('x-powered-by');
app.set('view engine', 'ejs');

app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieParser());
app.use(express.urlencoded({extended: true}));
app.use(express.json());

app.get('/', (req, res) => {
    try{
        if(req.cookies.token && validateToken(req.cookies.token)) // Validates token access (authentication.js)
            res.render('controlboard'); // Renders controlboard.ejs
        else 
            res.render('index'); // If the user isn't authenticated, render landing page
    } catch(e) { res.render('index'); } // If the token doesn't exist in the cookie, render landing page
});

app.get('/overlay', (req, res) => {
    res.render('overlay', {scenes: ["WAITING", "PRE_GAME", "MATCH", "POST_GAME", "PAUSE"]}); // Plug scenes in
});

app.post('/login', (req, res) => {
    if(req.body.token && validateToken(req.body.token))
        res.send('successful');
    return res.status(400).end();
});

function startSecureServer() {
    var options = {
        key: fs.readFileSync(process.env.KEY_PATH),
        cert: fs.readFileSync(process.env.CERT_PATH),
        passphrase: process.env.PASSPHRASE
    };
    var server = https.createServer(options, app);
    server.listen(process.env.HTTPS_PORT, () => {
        console.log('HTTPS Control Board started.');
    });

    var http = express();
    http.get('*', function(req, res) {
        res.redirect('https://' + req.headers.host + req.url);
    });
    http.listen(process.env.HTTP_PORT);
}

function startServer() {
    app.listen(process.env.HTTP_PORT, () => {
        console.log('HTTP Control Board started.');
    });
}

if(process.env.SECURE && process.env.SECURE === 1)
    startSecureServer();
else
    startServer();

