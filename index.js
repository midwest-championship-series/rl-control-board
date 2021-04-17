// Local Imports
require('dotenv').config();
const { processScene, getScenes, updateScene } = require('./modules/scenes.js');
const { sslRedirect } = require('./modules/ssl');
const { validateToken } = require('./modules/authentication');

// Package Imports
const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');
const fileupload = require('express-fileupload');
const { access, rmdir, readFileSync, existsSync, mkdirSync } = require('fs');

const app = express();

app.disable('x-powered-by');
app.set('view engine', 'ejs');

app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieParser());

if(process.env.NODE_ENV === "production")
    app.use(sslRedirect());
    
// 20mb file limit
app.use(fileupload({limits: {fileSize: 200000000}, abortOnLimit: true}));
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
    if(req.cookies.token && validateToken(req.cookies.token)) {
        let { err, scenes } = getScenes();
        let scenes_obj = {
            names: scenes,
            events: {}
        };
        scenes.forEach((entry) => {
            scenes_obj.events[entry] = JSON.parse(readFileSync("./scenes/" + entry + "/.scene"));
        });
        if(err)
            return res.status(500).render('overlay/error', {error_msg: err.message});
        else
            return res.status(200).render('overlay/overlay', {scenes: scenes_obj}); // Plug scenes in
    }
    res.render('overlay/login');
});

app.get('/scenes', (req, res) => {
    if(req.cookies.token && validateToken(req.cookies.token)) {
        let { err, scenes } = getScenes();
        if(err)
            return res.status(500).send({error: err}).end();
        else
            return res.status(200).send({scenes: scenes}).end();
    }
    return res.status(400).send({status:false,message:'User not authenticated'}).end();
});

app.post('/login', (req, res) => {
    if(req.body.token && validateToken(req.body.token))
        res.send('successful');
    return res.status(400).end();
});

app.post('/scenes', (req, res) => {
    console.log(req.body.token);
    if(req.body.token && validateToken(req.body.token)) {
        // Update .scene file
        if(!req.body.scene || !req.body.scene_data)
            return res.status(400).send({status:false,message:'No scene and/or scene_data provided'}).end();
        
        let err = updateScene(req.body.scene, JSON.parse(req.body.scene_data));
        if(err)
            return res.status(400).send({status:false,message:err.message}).end();
        else
            return res.status(200).end();
    }
    return res.status(400).send({status:false,message:'User not authenticated'}).end();
});

app.post('/upload-scene', (req, res) => {
    if(req.body.token && validateToken(req.body.token)) {
        try {
            if(!req.files) {
                return res.status(400).send({
                    status: false,
                    message: 'No file uploaded'
                }).end();
            } else {
                let scene = req.files.scene;

                if(scene.name.replace(".zip", "").length === 0)
                    return res.status(400).send({
                        status: false,
                        message: 'File name must be greater than 0'
                    }).end();

                if(!existsSync("./uploads"))
                    mkdirSync("./uploads");
                
                // Only allow zippers
                if(scene.mimetype === "application/zip" || scene.mimetype === "application/x-zip-compressed") {
                    scene.mv('./uploads/' + scene.name);
       
                    // send response
                    return processScene(scene.name.replace(".zip", ""), res);
                }
                return res.status(400).send({status:false,message:'Invalid mime type'}).end();
            }
        } catch (err) {
            console.log(err);
            return res.status(500).send(err).end();
        }
    }
    return res.status(400).send({status:false,message:'User not authenticated'}).end();
});

app.post('/remove-scene', (req, res) => {
    if(req.body.token && validateToken(req.body.token)) {
        try {
            let scene = req.body.scene_name;
            access("./scenes/" + scene + "/.scene", (err) => {
                if(err) {
                    // Scene doesn't exist
                    return res.status(400).send({
                        status: false,
                        message: "Scene doesn't exist"
                    })
                } else {
                    // Scene exists, remove
                    rmdir('./public/img/' + scene, {
                        recursive: true
                    }, () => {
                        rmdir('./scenes/' + scene, {
                            recursive: true
                        }, () => {
                            return res.send({
                                status: true,
                                message: "Scene removed"
                            }).end();
                        });
                    });
                }
            });
        } catch (err) {
            console.log(err);
            return res.status(500).send(err).end();
        }
    } else
        return res.status(400).send({status:false,message:'User not authenticated'}).end();
});

app.listen(process.env.PORT, () => {
    console.log('Control Board started.');
});

