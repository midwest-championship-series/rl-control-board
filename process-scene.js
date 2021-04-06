const fs = require('fs');
const mkdirp = require('mkdirp');
const unzipper = require('unzipper');
const mime = require('mime-types');
const path = require('path');

function cleanup(scene, res, success = false) {
    if(!success) {
        // Delete files that were extracted on failure
        fs.rmdir('./public/img/' + scene, {
            recursive: true
        }, () => {});
        fs.rmdir('./overlays/' + scene, {
            recursive: true
        }, () => {});

        return res.status(400).send({
            status: false,
            message: "Invalid scene"
        }).end();
    } else {
        fs.unlink('./scenes/' + scene + '.zip', () => {});
    }
}

exports.processScene = function processScene(scene, res) {
    // process scene here
    try{

        fs.access("./overlays/" + scene, (err) => {
            if(!err)
                return res.status(400).send({
                    status: false,
                    message: "Scene already exists"
                }).end();
            else {
                let overlay = false;
                fs.mkdir('./overlays/' + scene, () => {
                    fs.mkdirSync('./public/img/' + scene);
                    console.log("Parsing ./scenes/" + scene + ".zip");
                    fs.createReadStream('./scenes/' + scene + ".zip")
                        .pipe(unzipper.Parse())
                        .on('entry', function (entry) {
                            const fileName = entry.path;
                            
                            if(entry.type === "Directory") {
                                fs.mkdirSync('./public/img/' + scene + '/' + fileName, true);
                            } else if (fileName === "overlay.html") {
                                overlay = true;
                                entry.pipe(fs.createWriteStream('./overlays/' + scene + '/overlay.html', { flags: 'w'}));
                            } else if(mime.lookup(fileName) && mime.lookup(fileName).includes('image/')) {
                                entry.pipe(fs.createWriteStream('./public/img/' + scene + '/' + fileName, { flags: 'w'}));
                            } else {
                                entry.autodrain();
                            }
                        })
                        .promise().then(() => {
                            if(overlay) {
                                // Update image references in overlay.html
                                fs.readFile('./overlays/' + scene + '/overlay.html', 'utf-8', (err, data) => {
                                    if(!err) {
                                        // Update img references
                                        var newText = data.replace(/.?\/?img/gm, "./img/" + scene);
                        
                                        fs.writeFile('./overlays/' + scene + '/overlay.html', newText, 'utf-8', (err) => {
                                            if(err)
                                                cleanup(scene, res);
                                            else {
                                                console.log("Parse successul!");
                                                cleanup(scene, res, true);
                                                return res.send({
                                                    status: true,
                                                    message: "Scene uploaded"
                                                }).end();
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