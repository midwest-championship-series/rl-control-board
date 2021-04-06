require('dotenv').config();
const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');
const fileupload = require('express-fileupload');
const { sslRedirect } = require('./ssl');
const { validateToken } = require('./authentication');
const { processScene } = require('./process-scene.js');

const app = express();

app.disable('x-powered-by');
app.set('view engine', 'ejs');

app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieParser());

if(process.env.NODE_ENV === "production")
    app.use(sslRedirect());
    
app.use(fileupload());
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

app.post('/upload-scene', async (req, res) => {
    if(req.body.token && validateToken(req.body.token)) {
        try {
            if(!req.files) {
                return res.status(400).send({
                    status: false,
                    message: 'No file uploaded'
                }).end();
            } else {
                let scene = req.files.scene;

                // Only allow zippers
                if(scene.mimetype === "application/zip") {
                    scene.mv('./scenes/' + req.body.name + ".zip");
       
                    // send response
                    return processScene(req.body.name, res);
                }
            }
        } catch (err) {
            console.log(err);
            return res.status(500).send(err).end();
        }
    }
    return res.status(400).end();
});

app.listen(process.env.PORT, () => {
    console.log('Control Board started.');
});

