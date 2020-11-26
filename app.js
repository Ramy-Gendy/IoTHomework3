var express = require('express');
var mongoose = require('mongoose');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var mqtt = require('mqtt');
var bodyParser = require('body-parser');
const bcrypt = require('bcrypt');


var app = express();

var urlencodedParser = bodyParser.urlencoded({ extended: false });

app.use(session({
    name: 'session',
    secret: "gaehensfnsfnmsfnsfnsns",
    resave: true,
    saveUninitialized: true,
    cookie: {
        maxAge: (1000 * 60 * 1000)
    }
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
    }
}));

app.set('port', process.env.PORT || 8080);

app.get('/', function (req, res) {
    console.log(req.session);
    if (req.session.isLoggedIn) {
        res.redirect('/map?username=' + encodeURIComponent(req.session.username));
    }
    else {
        req.session.isLoggedIn = false;
        res.sendFile(__dirname + '/index.html');
    }
});

app.get('/register', function (req, res) {
    res.sendFile(__dirname + '/register.html');
});

app.post('/reg', urlencodedParser, async function (req, res) {
    console.log('/REGISTER called');

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
        res.sendFile(__dirname + '/index.html')
    }
});

app.post('/map', urlencodedParser, async function (req, res) {
    console.log('/LOGIN called');

    let user = await User.findOne({ name: req.body.username });
    if (!user) {
        res.redirect('/?error=' + encodeURIComponent('Incorrect_Credential'));
    }

    const validPassword = await bcrypt.compare(req.body.password, user.password);
    if (!validPassword) {
        res.redirect('/?error=' + encodeURIComponent('Incorrect_Credential'));
    }
    else {
        console.log('Valid password!');
        if (req.session.page_views) {
            req.session.page_views++;
        }
        else {
            req.session.page_views = 1;
        }
        req.session.isLoggedIn = true;
        req.session.username = user.name;
        res.redirect('/map?username=' + encodeURIComponent(user.name) + "&page_views=" + encodeURIComponent(req.session.page_views)); 
    }
});

app.get('/map', function (req, res) {
    res.sendFile(__dirname + '/mymap.html');
})

app.get('/logout', function (req, res) {
    res.sendFile(__dirname + '/');
})

app.listen(app.get('port'), function () {
    console.log('Express started on http://localhost:' + app.get('port') + '; press Ctrl-C to terminate.');
});