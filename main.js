var http = require('http');
var url = require('url');
var fs = require('fs');
var crypto = require('crypto');
var passwd = '1234';
var colors = require('colors');
var position = {};
const {
    Server
} = require("socket.io");
const {
    access
} = require('fs/promises');
const {
    init
} = require('express/lib/application');

var express = require('express');
var iotdata = {};
var oneuse = [];
var using = [];
var users = {};
var sunsun = {};
var currentImage = '';
var linuxmode = false;
var slashslash = linuxmode ? '/' : '\\';
var ids = {};

var accessfiles = ['style.css'];
var sessionTimeout = {};
var sessionKey = {}; // FORMAT: Session:key
var sessionKeyCounter = {};

(function init() {
    if (fs.existsSync('data.json')) {
        fs.readFile(__dirname + slashslash+'data.json', 'utf8', function (err, data) {
            if (err) {
                return console.log(err);
            }

            iotdata = JSON.parse(data);
        });
        console.log('read data.json')
    } else {
        fs.writeFile('data.json', '{}', function (err) {
            if (err) throw err;
            console.log('Saved!');
        });
        console.log('added data.json')
    }
    fs.readFile(__dirname + slashslash+'users.json', 'utf8', function (err, data) {
        if (err) {
            return console.log(err);
        }

        users = JSON.parse(data);
    });
    fs.readFile(__dirname + slashslash+'gps.position', 'utf8', function (err, data) {
        if (err) {
            return console.log(err);
        }

        position = JSON.parse(data);
        console.log(position);
        sunsun.sunrise = SunriseSunsetJS.getSunrise(position.LAT, position.LNG);
        sunsun.sunset = SunriseSunsetJS.getSunset(position.LAT, position.LNG);
        fs.writeFile('sunsun.json', JSON.stringify(sunsun), function (err) {
            if (err) throw err;
            console.log('Saved!');
        });

    });
    fs.readFile(__dirname + slashslash+'ids.json', 'utf8', function (err, data) {
        if (err) {
            return console.log(err);
        }

        ids = JSON.parse(data);
    });
})();

var server = http.createServer(function (req, res) {

    var ur = req.url.replace('/', '').split('/');
    var u = req.url;
    //console.log(ur)
    if (req.method === "POST") {


        var body = "";
        req.on("data", function (chunk) {
            body += chunk;
        });

        req.on("end", function () {

            res.writeHead(200, {
                "Content-Type": "text/plain"
            });
            var decoded = JSON.parse(body);
            if (ur[0] == 'auth') {
                if (decoded.p != passwd) {
                    res.end(JSON.stringify({
                        p: false
                    }));
                } else {
                    var session = crypto.randomUUID();
                    var k = crypto.randomUUID();
                    sessionKey[session] = k;
                    sessionKeyCounter[session] = 0;
                    res.end(JSON.stringify({
                        p: true,
                        t: session,
                        k: k,
                        users: users
                    }));
                    oneuse.push(session);
                    //oneuse[session]=true;
                }
            } else if (ur[0] == 'ping') {

                //beacon
                //ping every 2s
                //timeout 10s
                //console.log(decoded.d, decoded.g);
                try {
                    if (sessionKey[decoded.d]) {
                        if (decoded.g == sessionKey[decoded.d].split('')[sessionKeyCounter[decoded.d] % sessionKey[decoded.d].split('').length]) {
                            (async function () {
                                clearInterval(sessionTimeout[decoded.d]);
                                sessionTimeout[decoded.d] = setTimeout(function () {
                                    delete using[using.indexOf(decoded.d)];
                                    using = using.filter(function (p) {
                                        return p != null;
                                    });
                                    console.log('SESSION '.yellow + decoded.d.cyan + ' has been disabled'.yellow);
                                    try {
                                        if (sessionKeyCounter[decoded.d]) {
                                            delete sessionKeyCounter[decoded.d];
                                        }
                                        if (sessionKey[decoded.d]) {
                                            delete sessionKey[decoded.d];
                                        }
                                    } catch (e) {
                                        console.log(e)
                                        console.log('78')
                                    }
                                }, 10000);

                                res.end(JSON.stringify({
                                    status: true,
                                    session: decoded.d
                                }));
                                sessionKeyCounter[decoded.d]++;
                            })();
                        } else {
                            console.log(89);
                            try {
                                delete using[using.indexOf(decoded.d)];
                                using = using.filter(function (p) {
                                    return p != null;
                                });
                                console.log('SESSION '.yellow + decoded.d.cyan + ' has been disabled'.yellow);
                                res.end(JSON.stringify({
                                    status: false
                                }));
                                try {

                                    if (sessionKeyCounter[decoded.d]) {
                                        delete sessionKeyCounter[decoded.d];
                                    }
                                    if (sessionKey[decoded.d]) {
                                        delete sessionKey[decoded.d];
                                    }
                                } catch (e) {
                                    console.log(e);
                                    console.log('102');
                                    res.end(0);

                                }
                            } catch (e) {
                                console.log(e);
                                console.log('89err');
                                res.end(0);
                            }

                        }
                    } else {
                        res.end(JSON.stringify({
                            status: false
                        }))
                    }

                } catch (e) {
                    console.log(e);
                    console.log(121);
                    res.end(0);
                }

            } else if (ur[0] == 'iot') {
                if (using.includes(decoded.d)) {
                    if (decoded.iot && (decoded.change != undefined)) {

                        var pr = changeIot(decoded.iot, decoded.change, decoded.d, decoded.value, decoded.color, decoded.automated);
                        pr.then(function (y) {
                            res.end(JSON.stringify({
                                status: true,
                                code: y,
                                d: iotdata
                            }))
                        });
                        pr.catch((error) => {
                            res.end(JSON.stringify({
                                status: false,
                                code: error
                            }));
                        });
                    } else {
                        res.end(JSON.stringify({
                            status: false,
                            error: 'Missing Information'
                        }));
                    }
                } else {
                    res.end(JSON.stringify({
                        status: false,
                        error: 'Not Authorized'
                    }));
                }
            } else if (ur[0] == 'getIot') {
                if (using.includes(decoded.d)) {
                    res.end(JSON.stringify(iotdata));
                } else {
                    res.end(JSON.stringify({
                        status: false,
                        error: 'Not Authorized'
                    }));
                }
            } else if (ur[0] == 'securityCamera') {
                if (using.includes(decoded.d)) {
                    res.end(JSON.stringify({
                        status: true,
                        d: currentImage
                    }));
                } else {
                    res.end(JSON.stringify({
                        status: false,
                        error: 'Not Authorized'
                    }));
                }
            }

        });
    }
    if (u == '/') {
        fs.readFile(__dirname + slashslash+'gui'+slashslash+'password'+slashslash+'index.html', 'utf8', function (err, data) {
            if (err) {
                return console.log(err);
            }

            res.writeHead(200, {
                'Content-Type': 'text/html'
            });
            res.write(data);
            res.end();
        });
    } else if (ur.length >= 2) {

        if (ur[0] == 'dashboard' && oneuse.includes(ur[1])) {
            fs.readFile(__dirname + slashslash+'gui'+slashslash+'dashboard'+slashslash+'index.html', 'utf8', function (err, data) {
                if (err) {
                    res.writeHead(404, {
                        'Content-Type': 'text/plain'
                    });
                    res.write('An error occured: ' + err);
                    res.end();
                    return console.log(err);
                }

                res.writeHead(200, {
                    'Content-Type': 'text/html'
                });
                res.write(data);
                res.end();
            });


            (async function () {
                using.push(ur[1]);
                sessionTimeout[ur[1]] = setTimeout(function () {
                    delete using[using.indexOf(ur[1])];
                    using = using.filter(function (p) {
                        return p != null;
                    });
                    console.log('SESSION '.yellow + ur[1].cyan + ' has been disabled'.yellow);
                    try {

                        if (sessionKeyCounter[decoded.d]) {
                            delete sessionKeyCounter[decoded.d];
                        }
                        if (sessionKey[decoded.d]) {
                            delete sessionKey[decoded.d];
                        }
                    } catch (e) {
                        console.log(e);
                        console.log('159')
                    }
                }, 10000);
                delete oneuse[oneuse.indexOf(ur[1])];
                oneuse = oneuse.filter(function (p) {
                    return p != null;
                });
            })();

        } else {

            if ((ur[0] == 'dashboard' && ur[2] == 'style.css') || ur[0] == 'dashboard' && ur[1] == 'style.css') {
                fs.readFile(__dirname + slashslash+'gui'+slashslash+'dashboard'+slashslash+'style.css', 'utf8', function (err, data) {
                    if (err) {
                        return console.log(err);
                    }

                    res.writeHead(200, {
                        'Content-Type': 'text/css'
                    });
                    res.write(data);
                    res.end();
                });
            } else if ((ur[0] == 'dashboard' && ur[2] == 'libs.min.js') || ur[0] == 'dashboard' && ur[1] == 'libs.min.js') {
                fs.readFile(__dirname + slashslash+'gui'+slashslash+'libs.min.js', 'utf8', function (err, data) {
                    if (err) {
                        return console.log(err);
                    }

                    res.writeHead(200, {
                        'Content-Type': 'text/javascript'
                    });
                    res.write(data);
                    res.end();
                });
            } else {

                res.writeHead(401, {
                    'Content-Type': 'text/plain'
                });
                res.write('Unauthorized');
                res.end();
            }
        }
    }
});
const {
    ensureConnection
} = require('./ngrok');
const {
    exec
} = require("child_process");
var opn = require('opn');
const port = process.env.PORT || 80;
(async function () {
    await ensureConnection(url => {
        console.log(`Listening to ${url}`);
        coolUrl = url;
        opn('http://localhost:1337');
    });
})();
var coolUrl = '';
if (false) {

    process.stdin.resume();

    function exitHandler(options, exitCode) {
        exec("taskkill /F /IM ngrok.exe", (error, stdout, stderr) => {
            if (error) {
                console.log(`error: ${error.message}`);
                return;
            }
            if (stderr) {
                console.log(`stderr: ${stderr}`);
                return;
            }
            console.log(`stdout: ${stdout}`);
            console.log('Goodbye!'.bold.cyan);
            if (options.exit) process.exit();
        });
    }

    //do something when app is closing
    process.on('exit', exitHandler.bind(null, {
        cleanup: true
    }));

    //catches ctrl+c event
    process.on('SIGINT', exitHandler.bind(null, {
        exit: true
    }));

    // catches "kill pid" (for example: nodemon restart)
    process.on('SIGUSR1', exitHandler.bind(null, {
        exit: true
    }));
    process.on('SIGUSR2', exitHandler.bind(null, {
        exit: true
    }));

    //catches uncaught exceptions
    process.on('uncaughtException', exitHandler.bind(null, {
        exit: true
    }));

}

function changeIot(iot, change, session, val, col, automated) {
    oldNight = true;
    console.log('Session '.gray + session.bold.brightCyan + ' changed '.gray + JSON.stringify(change).yellow + ' of '.gray + iot.yellow);
    if (val) {
        if (col) {
            Object.keys(iotdata).forEach(function (key, i) {
                iotdata[key].forEach(function (iotobj, ii) {
                    if (iotobj.id == iot) {
                        iotdata[key][ii].color = change;
                        saveIot();
                    }
                });
            });
        } else {
            Object.keys(iotdata).forEach(function (key, i) {
                iotdata[key].forEach(function (iotobj, ii) {
                    if (iotobj.id == iot) {
                        iotdata[key][ii].value = change;
                        saveIot();
                    }
                });
            });
        }

    } else {
        if (col) {
            Object.keys(iotdata).forEach(function (key, i) {
                iotdata[key].forEach(function (iotobj, ii) {
                    if (iotobj.id == iot) {
                        iotdata[key][ii].color = change;
                        saveIot();
                    }
                });
            });
        } else {
            if (automated) {
                Object.keys(iotdata).forEach(function (key, i) {
                    iotdata[key].forEach(function (iotobj, ii) {
                        if (iotobj.id == iot) {
                            iotdata[key][ii].automatic = change;
                            saveIot();
                            if (!change) { //if turned off automatic
                                if (iotdata[key][ii].status) {
                                    ChangePin(iot, iotdata[key][ii].value, iotdata[key][ii].color);
                                } else {
                                    ChangePin(iot, 0);
                                }
                            }
                        }
                    });
                });
            } else {
                Object.keys(iotdata).forEach(function (key, i) {
                    iotdata[key].forEach(function (iotobj, ii) {
                        if (iotobj.id == iot) {
                            iotdata[key][ii].status = change;
                            saveIot();
                        }
                    });
                });
            }

        }

    }

    if (!automated) {
        iotPin(iot, change, val, col);
    }
    return new Promise(function (resolve, reject) {
        resolve('yes');
    });
}

function saveIot() {
    fs.writeFile('data.json', JSON.stringify(iotdata), function (err) {
        if (err) throw err;
        console.log('Saved!');
    });
}

function iotPin(iot, change, val, col) {
    var stat, bright, color;
    Object.keys(iotdata).forEach(function (key, i) {
        iotdata[key].forEach(function (iotobj, ii) {
            if (iotobj.id == iot) {
                stat = iotdata[key][ii].status;
                bright = iotdata[key][ii].value;
                color = iotdata[key][ii].color;
            }
        });
    });
    if (stat) {
        if (val || col) { //brightness or colour has changed
            ChangePin(iot, bright, color);
        } else { //turned on or off
            if (change) {
                ChangePin(iot, bright, color); //turn on at brightness
            } else {
                ChangePin(iot, 0); //turn off
            }
        }
    } else {
        ChangePin(iot, 0);
    }

}

function ChangePin(iot, val, color) {
    console.log(iot + ' ' + val + ' ' + color);
    if(color){

    }else{

    }
}

var cP = express(); //controlpanel

cP.use(express.json())
cP.use(express.urlencoded({
    extended: true
}))
cP.get('/', function (req, res) {
    var g = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    //console.log(g)
    if (g == '::1' || g == '::ffff:127.0.0.1') {
        fs.readFile(__dirname + slashslash+'gui'+slashslash+'controlpanel'+slashslash+'index.html', 'utf8', function (err, data) {
            if (err) {
                return console.log(err);
            }

            res.send(data)
        });;
    } else {
        res.status(401).send('Unauthorized');
    }
});
cP.post('/cam', function (req, res) {
    var g = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    //console.log(g)

    if (g == '::1' || g == '::ffff:127.0.0.1') {

        var decoded = req.body;
        res.send(true);
        //Object.keys(decoded)[0]
        //currentImage=Object.keys(decoded)[0];
        //currentImage=JSON.parse(decoded).d;
        console.log(decoded);
        /*
        fs.writeFile('img.json', decoded, function (err) {
            if (err) throw err;
            console.log('Saved!');
        });*/
    } else {
        res.status(401).send('Unauthorized');
    }
});
cP.get('/main.js', function (req, res) {
    var g = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    //console.log(g)

    if (g == '::1' || g == '::ffff:127.0.0.1') {
        fs.readFile(__dirname + slashslash+'gui'+slashslash+'controlpanel'+slashslash+'main.js', 'utf8', function (err, data) {
            if (err) {
                return console.log(err);
            }

            res.send(data)
        });;
    } else {
        res.status(401).send('Unauthorized');
    }
});
cP.get('/libs.min.js', function (req, res) {
    var g = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    //console.log(g)

    if (g == '::1' || g == '::ffff:127.0.0.1') {
        fs.readFile(__dirname + slashslash+'gui'+slashslash+'controlpanel'+slashslash+'libs.min.js', 'utf8', function (err, data) {
            if (err) {
                return console.log(err);
            }

            res.send(data)
        });;
    } else {
        res.status(401).send('Unauthorized');
    }
});

cP.get('/qrcode.min.js', function (req, res) {
    var g = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    //console.log(g)

    if (g == '::1' || g == '::ffff:127.0.0.1') {
        fs.readFile(__dirname + slashslash+'gui'+slashslash+'controlpanel'+slashslash+'qrcode.min.js', 'utf8', function (err, data) {
            if (err) {
                return console.log(err);
            }

            res.send(data)
        });;
    } else {
        res.status(401).send('Unauthorized');
    }
});

cP.get('/getip', function (req, res) {
    var g = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    //console.log(g)

    if (g == '::1' || g == '::ffff:127.0.0.1') {
        res.send(coolUrl);
    } else {
        res.status(401).send('Unauthorized');
    }
});

cP.get('/everything', function (req, res) {
    var g = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    //console.log(g)

    if (g == '::1' || g == '::ffff:127.0.0.1') {

        var i = {};
        i.s = using;


        res.send(JSON.stringify(i));
    } else {
        res.status(401).send('Unauthorized');
    }
});
cP.post('/kickSession', function (req, res) {
    var g = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    //console.log(g)

    if (g == '::1' || g == '::ffff:127.0.0.1') {
        var s = req.body.session;
        console.log('Control Panel Kicked ' + s);

        delete using[using.indexOf(s)];
        using = using.filter(function (p) {
            return p != null;
        });
        console.log('SESSION '.yellow + s.cyan + ' has been disabled'.yellow);
        try {

            if (sessionKeyCounter[s]) {
                delete sessionKeyCounter[s];
            }
            if (sessionKey[s]) {
                delete sessionKey[s];
            }
        } catch (e) {
            console.log(e);
            console.log('512')
        }
        res.send(true);
    } else {
        res.status(401).send('Unauthorized');
    }
});
cP.use(function (req, res, next) {
    console.log(req.url);
    res.status(404).send("Sorry, that route doesn't exist. Have a nice day :)");
});

cP.listen(1337, function () {
    console.log('Control Panel on port 1337');
});
const axios = require('axios');
var SunriseSunsetJS=function(t){"use strict";var e=90.8333;function n(t){return Math.sin(2*t*Math.PI/360)}function a(t){return 360*Math.acos(t)/(2*Math.PI)}function r(t){return Math.cos(2*t*Math.PI/360)}function u(t,e){var n=t%e;return n<0?n+e:n}function i(t,e,i,o,M){var h,c,f=function(t){return Math.ceil((t.getTime()-new Date(t.getFullYear(),0,1).getTime())/864e5)}(M),s=e/15,l=i?f+(6-s)/24:f+(18-s)/24,g=.9856*l-3.289,v=u(g+1.916*n(g)+.02*n(2*g)+282.634,360),P=.91764*(h=v,Math.tan(2*h*Math.PI/360));c=u(c=360/(2*Math.PI)*Math.atan(P),360),c+=90*Math.floor(v/90)-90*Math.floor(c/90),c/=15;var D,I=.39782*n(v),S=r((D=I,360*Math.asin(D)/(2*Math.PI))),d=(r(o)-I*n(t))/(S*r(t)),w=u((i?360-a(d):a(d))/15+c-.06571*l-6.622-e/15,24),T=Date.UTC(M.getFullYear(),M.getMonth(),M.getDate());return new Date(T+36e5*w)}return t.getSunrise=function(t,n,a){return void 0===a&&(a=new Date),i(t,n,!0,e,a)},t.getSunset=function(t,n,a){return void 0===a&&(a=new Date),i(t,n,!1,e,a)},Object.defineProperty(t,"__esModule",{value:!0}),t}({});


var autocounter = 0;
var isNight, oldNight;
setInterval(async function () {
    if ((autocounter % 6) == 0) {
        sunsun.sunrise = SunriseSunsetJS.getSunrise(position.LAT, position.LNG);
        sunsun.sunset = SunriseSunsetJS.getSunset(position.LAT, position.LNG);
    }

    if (Date.parse(sunsun.sunrise) < Date.now()) { //past sunrise ----night-----|HERE AND PAST(sunrise)-----day------|(sunset)-----night----
        if (Date.parse(sunsun.sunset) < Date.now()) { //past sunset ----night-----|(sunrise)-----day------|(sunset)--HERE---night----
            isNight = true;
        } else {
            // ----night--HERE---|(sunrise)-----day--HERE----|(sunset)-----night----
            isNight = false;
        }
    } else { // ----night--HERE---|(sunrise)-----day------|(sunset)-----night----
        isNight = true;
    }

    if ((oldNight != isNight) || (oldNight == undefined)) {

        oldNight = isNight;
        console.log("Night: " + String(isNight));


        Object.keys(iotdata).forEach(function (key) {
            iotdata[key].forEach(function (iotobj, ii) {
                if (iotdata[key][ii].automatic) {
                    if(iotdata[key][ii].blinds){
                        ChangePin(iotdata[key][ii].id, isNight ? iotdata[key][ii].value : 0);
                    }else{
                        ChangePin(iotdata[key][ii].id, isNight ? iotdata[key][ii].value : 0, iotdata[key][ii].color);
                    }
                    
                }
            });
        });
    }


    autocounter++;
}, 5000); // automation



function encrypt(message, key) {

    // generate 16 bytes of random data
    const iv = crypto.randomBytes(16).toString("hex").slice(0, 16);

    // make the encrypter function
    const encrypter = crypto.createCipheriv("aes-256-cbc", key, iv);

    // encrypt the message
    // set the input encoding
    // and the output encoding
    let encryptedMsg = encrypter.update(message, "utf-8", "hex");

    // stop the encryption using
    // the final method and set
    // output encoding to hex
    encryptedMsg += encrypter.final("hex");

    return {enc:encryptedMsg,iv:iv};
}

function decrypt(message, key,iv) {

    // make the decrypter function
    const decrypter = crypto.createDecipheriv("aes-256-cbc", key, iv);

    // decrypt the message
    // set the input encoding
    // and the output encoding
    let decryptedMsg = decrypter.update(message, "hex", "utf8");

    // stop the decryption using
    // the final method and set
    // output encoding to utf8
    decryptedMsg += decrypter.final("utf8");

    return decryptedMsg;
}


// camera live stream




server.listen(80);