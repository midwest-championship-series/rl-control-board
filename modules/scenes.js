const fs = require('fs');
const unzipper = require('unzipper');
const mime = require('mime-types');

function cleanup(scene, res, success = false) {
    if(!success) {
        // Delete files that were extracted on failure
        fs.rmdir('./public/img/' + scene, {
            recursive: true
        }, () => {});
        fs.rmdir('./scenes/' + scene, {
            recursive: true
        }, () => {});

        return res.status(400).send({
            status: false,
            message: "Invalid scene"
        }).end();
    }
    fs.unlink('./uploads/' + scene + '.zip', () => {});
}

exports.getScenes = () => {
    try {
        let scenes = fs.readdirSync("./scenes", {withFileTypes: true})
            .filter(x => x.isDirectory())
            .map(x => x.name)
            .filter(x => fs.existsSync("./scenes/" + x + "/.scene"));
        return {error: undefined, scenes: scenes};
    } catch(err) {
        return {error: err, scenes: []};
    }
};

// data must be complete
exports.updateScene = (scene, data) => {
    fs.writeFile('./scenes/' + scene + '/.scene', JSON.stringify(data), 'utf-8', (err) => {
        return err;
    });
};

exports.processScene = (scene, res) => {
    // process scene here
    try{

        fs.access("./scenes/" + scene, (err) => {
            if(!err) {
                fs.unlink('./uploads/' + scene + '.zip', () => {});
                return res.status(400).send({
                    status: false,
                    message: "Scene already exists"
                }).end();
            } else {
                let overlay = false;
                fs.mkdir('./scenes/' + scene, {recursive: true}, () => {
                    fs.mkdirSync('./public/overlay/img/' + scene, {recursive: true});
                    console.log("Parsing ./uploads/" + scene + ".zip");
                    fs.createReadStream('./uploads/' + scene + ".zip")
                        .pipe(unzipper.Parse())
                        .on('entry', function (entry) {
                            const fileName = entry.path;
            
                            if(entry.type === "Directory" && fileName !== "img/") {
                                fs.mkdirSync('./public/overlay/img/' + scene + '/' + fileName.replace("img/", ""), {recursive: true});
                            } else if (fileName === "overlay.html") {
                                overlay = true;
                                entry.pipe(fs.createWriteStream('./scenes/' + scene + '/overlay.html', { flags: 'w'}));
                            } else if(mime.lookup(fileName) && (mime.lookup(fileName).includes('image/') || mime.lookup(fileName).includes('video/') || mime.lookup(fileName).includes('font/'))) {
                                entry.pipe(fs.createWriteStream('./public/overlay/img/' + scene + '/' + fileName.replace("img/", ""), { flags: 'w'}));
                            } else {
                                entry.autodrain();
                            }
                        })
                        .promise().then(() => {
                            if(overlay) {
                                // Update image references in overlay.html
                                fs.readFile('./scenes/' + scene + '/overlay.html', 'utf-8', (err, data) => {
                                    if(!err) {
                                        // Update img references
                                        var newText = data.replace(/.{1}\/{1}img/gm, "./img/" + scene);
                        
                                        fs.writeFile('./scenes/' + scene + '/overlay.html', newText, 'utf-8', (err) => {
                                            if(err)
                                                cleanup(scene, res);
                                            else {
                                                fs.writeFile('./scenes/' + scene + '/.scene', "{\"show\":{},\"hide\": {}}", 'utf-8', (err) => {
                                                    if(err)
                                                        cleanup(scene, res);
                                                    else {
                                                        console.log("Parse successul!");
                                                        cleanup(scene, res, true);
                                                        return res.send({
                                                            status: true,
                                                            message: "Scene uploaded",
                                                            scene: scene
                                                        }).end();
                                                    }
                                                });
                                            }
                                        });
                        
                                    } else {
                                        return cleanup(scene, res);
                                    }
                                });
                            } else {
                                return cleanup(scene, res);
                            }
                        });
                });
            }
        });
    } catch(ex) {
        return cleanup(scene, res);
    }

}