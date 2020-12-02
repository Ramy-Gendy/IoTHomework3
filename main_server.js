var express = require('express');
var cookieParser = require('cookie-parser');
var session = require('express-session');
const mongoose = require('mongoose');
var MongoStore = require('connect-mongo')(session);

var app = express();

app.set('port', process.env.PORT || 1234);

app.use(cookieParser());

app.use(session({
    name: 'userCookie',
    secret: 'session cookie',
    resave: false,
    saveUninitialized: true,
    store: new MongoStore({ mongooseConnection: mongoose.connection }),
    cookie: {
        maxAge: (1000 * 60 * 60 * 24 * 30) // 30 days
    }
}));

//app.use(app.router); // DEPRECATED
app.get('/', function (req, res) { 
    if (req.session.userLoggedIn) { // Old user
        console.log('User already logged in - going to map');

        User.findOne({ _id: req.session.userId })
        .exec(function (err, user) {
            if (err) { // Error reading DB, 
                console.log('Error reading DB - from initial /');
                res.redirect('/');
            }
            else if (user) { // If user found
                console.log('User info found');
                var uname = user.name;
                req.session.page_views++;
                var uviews = req.session.page_views;
                res.redirect('/get_map?name=' + encodeURIComponent(uname) + "&page_views=" + encodeURIComponent(uviews));
            }
            else {
                console.log('User not found in DB');
                res.redirect('/');
            }
        });

    } else { // New user
        console.log('New user - going to login');
        res.redirect('index.html');
    }
});
app.use(express.static(__dirname + '/public'));

// ===================================================================================================================================

var bodyParser = require('body-parser');
var urlencodedParser = bodyParser.urlencoded({
    extended: false
})

// Process user registration
app.post('/process_reg', urlencodedParser, function (req, res) {

    if (req.body.email && req.body.full_name && req.body.password) {

        var userData = {
            email: req.body.email,
            name: req.body.full_name,
            password: req.body.password,
        }

        //use schema.create to insert data into the db
        var User = mongoose.model('User', UserSchema);

        User.create(userData, function (err, user) {
            if (err) {
                console.log("error storing reg details into DB");
                return res.redirect('/');
            } else {
                console.log("successfully saved reg details into DB");
                req.session.userId = user._id;
                return res.redirect('/');
            }
        });
    }
    //res.redirect('login.html');
})

// Process user login
app.post('/process_login', urlencodedParser, function (req, res) {

    //var User = mongoose.model('User', UserSchema);

    User.findOne({ email: req.body.email })
        .exec(function (err, user) {
            if (err) { // Error reading DB, user may or may not exist
                console.log('Error reading DB - from process login');
                res.redirect('/');
            }
            else if (user) { // If user found

                var pwd = req.body.password;

                if (!(pwd === user.password)) {
                    console.log('Incorrect Password');
                    res.redirect('/');
                }
                else { // correct password
                    console.log('Successful login');
                    req.session.userId = user._id;

                    if (req.session.page_views) {
                        req.session.page_views++;
                        console.log("You visited this page " + req.session.page_views + " times");
                    } else {
                        req.session.page_views = 1;
                        console.log("Welcome to this page for the first time!");
                    }

                    req.session.userLoggedIn = true;

                    res.redirect('/get_map?name=' + encodeURIComponent(user.name) + "&page_views=" + encodeURIComponent(req.session.page_views));
                }

            }
            else {
                console.log('User not found in DB');
                req.session.userLoggedIn = false;
                res.redirect('/');
            }
        });
})

// Log user out by destroying session
app.get('/logout', function (req, res) {
    console.log('Logging out - redirecting to index/login');
    req.session.destroy();
    res.redirect('/');
})

// Handle thrown get after login
// app.get('/map', function (req, res) {
//     res.sendFile(__dirname + '/public/map.html');
// })

// Alternate function -- confirms if user is logged in first
app.get('/get_map', function (req, res) {
    if (req.session.userId) {
        console.log('User logged in - going to map');
        //res.redirect('map.html');
        res.sendFile(__dirname + '/public/map.html');
    }
    else {
        console.log('no user logged in - cannot access map - going to login');
        //res.redirect('login.html');
        res.redirect('error.html');
    }
})

// ===================================================================================================================================

// MongoDB

//Create or connect with DB with name users
mongoose.connect('mongodb://localhost:27017/users',
    { useNewUrlParser: true, useUnifiedTopology: true });

var UserSchema = new mongoose.Schema({
    email: {
        type: String,
        unique: true,
        required: true,
    },
    name: {
        type: String,
        unique: false,
        required: true,
    },
    password: {
        type: String,
        required: true,
    }
});

var User = mongoose.model('User', UserSchema);

// ===================================================================================================================================

// Start localhost server on 1234
app.listen(app.get('port'), function () {
    console.log('Express started on http://localhost:' +
        app.get('port') + '; press Ctrl-C to terminate.');
});