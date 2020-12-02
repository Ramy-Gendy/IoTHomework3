var express = require('express');
var mongoose = require('mongoose');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var mqtt = require('mqtt');
var bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
var MongoStore = require('connect-mongo')(session);

var client = mqtt.connect('ws://localhost:8883')

var app = express();

var urlencodedParser = bodyParser.urlencoded({ extended: false });

app.use(session({
    name: 'session',
    secret: "userSess",
    resave: true,
    saveUninitialized: true,
    store: new MongoStore({ mongooseConnection: mongoose.connection }),
    cookie: {
        maxAge: (1000 * 60 * 60 * 24 * 30)
    },
    unset: "destroy"
}));

mongoose.connect('mongodb://localhost:27017/users', { useNewUrlParser: true, useUnifiedTopology: true });

const User = mongoose.model('User', new mongoose.Schema({
    name: {
        type: String,
        required: true,
        minlength: 5,
        maxlength: 50
    },
    password: {
        type: String,
        required: true,
        minlength: 5,
        maxlength: 1024
    },
    source: {
        type: String
    },
    destination: {
        type: String
    }
}));

client.on('connect', function () {
    client.subscribe('coe457/Homework3', function (err) {
        if (err) {
            console.log('Error subscribing!');
        }
        else {
            console.log('Success');
            client.on('message', function (topic, message) {
                var splitMessage = message.toString().split(' ');
                var coordinates = splitMessage[0].toString().split(',');
                coordinates = JSON.parse(coordinates);
                var sourceCoordinates = "Lat: " + coordinates['sourceLat'].toString() + " Lng:  " + coordinates['sourceLng'].toString();
                if (sourceCoordinates) {
                    var destCoordinates = "Lat: " + coordinates['destLat'].toString() + " Lng:  " + coordinates['destLng'].toString();
                    User.updateOne({ name: splitMessage[1] }, { source: sourceCoordinates, destination: destCoordinates }, function (err, user) {
                        if (err) {
                            console.log('Failure');
                        }
                        else {
                            console.log("Location Updated");
                        }
                    })
                }

            })
        }
    })


});

app.set('port', process.env.PORT || 8080);
app.use(cookieParser());

app.get('/', async function (req, res) {
    if (req.session.isLoggedIn) {
        let user = await User.findOne({ _id: req.session.userId });
        if (user) {
            res.redirect('/map?username=' + encodeURIComponent(req.session.username) + '&time=' + encodeURIComponent(new Date().toString()));
        }
        else {
            res.sendFile(__dirname + '/index.html');
        }
    }
    else {
        req.session.isLoggedIn = false;
        res.sendFile(__dirname + '/index.html');
    }
});

app.use(express.static(__dirname + '/'));

app.get('/register', function (req, res) {
    res.sendFile(__dirname + '/register.html');
});

app.post('/reg', urlencodedParser, async function (req, res) {

    let user = await User.findOne({ name: req.body.username });
    if (user) {
        res.redirect('/register?error=' + encodeURIComponent('Incorrect_Credential'));
    } else {
        user = new User({
            name: req.body.username,
            password: req.body.password
        });
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
        await user.save();
        req.session.userId = user._id;
        res.sendFile(__dirname + '/index.html')
    }
});

app.post('/map', urlencodedParser, async function (req, res) {
    let user = await User.findOne({ name: req.body.username });
    if (!user) {
        res.redirect('/?error=' + encodeURIComponent('Incorrect_Credential'));
        req.session.isLoggedIn = false;
        return;
    }

    const validPassword = await bcrypt.compare(req.body.password, user.password);
    if (!validPassword) {
        res.redirect('/?error=' + encodeURIComponent('Incorrect_Credential'));
        return;
    }
    else {
        req.session.userId = user._id;
        req.session.isLoggedIn = true;
        if (req.body.checkBox == 'on') {
            req.session.remember_me = true;
        }
        if (req.session.lastVisited) {
            req.session.lastVisited = req.session.currentVisited;
            req.session.currentVisited = new Date().toString();
        } 
        else {
            req.session.lastVisited = new Date().toString();
            req.session.currentVisited = req.session.lastVisited;
        }
        req.session.username = user.name;
        res.redirect('/map?username=' + encodeURIComponent(user.name) + ' &time=' + encodeURIComponent(req.session.lastVisited));
    }
});

app.get('/map', function (req, res) {
    if (req.session.isLoggedIn) {
        if (!req.session.remember_me) {
            req.session.isLoggedIn = false;
        }
        res.sendFile(__dirname + '/mymap.html');
    }
    else {
        res.redirect('/');
    }
})

app.get('/compass', function (req,res) {
    if (req.session.isLoggedIn) {
        if (!req.session.remember_me) {
            req.session.isLoggedIn = false;
        }
        res.sendFile(__dirname + '/mycompass.html');
    }
    else {
        res.redirect('/');
    }
})

app.get('/logout', function (req, res) {
    req.session.destroy();
    res.redirect('/');
})

app.listen(app.get('port'), function () {
    console.log('Express started on http://localhost:' + app.get('port') + '; press Ctrl-C to terminate.');
});