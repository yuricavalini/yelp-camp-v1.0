var express    = require("express"),
	app        = express(),
	bodyParser = require("body-parser"),
	mongoose   = require("mongoose"),
	flash      = require("connect-flash"),
	passport   = require("passport"),
	LocalStrategy = require("passport-local"),
	methodOverride = require("method-override"),
	Campground = require("./models/campground"),
	Comment    = require("./models/comment"),
	User       = require("./models/user"),

//requiring routes
	indexRoutes      = require("./routes/index"),
	commentRoutes    = require("./routes/comments"),
	campgroundRoutes = require("./routes/campgrounds");

// configure dotenv
require('dotenv').config();

var url = process.env.DATABASEURL;
mongoose.connect(url, {useNewUrlParser: true});
mongoose.set("useFindAndModify", false);
mongoose.set('useCreateIndex', true);
app.use(bodyParser.urlencoded({extended: true}));
app.set("view engine", "ejs");
app.use(express.static(__dirname + "/public"));	
app.use(methodOverride("_method"));
app.use(flash());
app.locals.moment = require("moment");

// PASSPORT CONFIGURATION
app.use(require("express-session")({
	secret: "Once again Rusty wins cutest dog!",
	resave: false,
	saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// middleware running in every single route to check for currentUser, and if it's logged or not.
app.use( async function(req, res, next) {
	res.locals.currentUser = req.user;
	if(req.user) {
		try {
			let user = await User.findById(req.user._id).populate('notifications', null, { isRead: false }).exec();
			res.locals.notifications = user.notifications.reverse(); 
		} catch(err) {
			console.log(err.message);
		}
	}
	res.locals.error = req.flash("error");
	res.locals.success = req.flash("success");
	next();
});

app.use("/", indexRoutes);
app.use("/campgrounds", campgroundRoutes);
app.use("/campgrounds/:id/comments", commentRoutes);

app.listen(process.env.PORT, process.env.IP, function(){
	console.log("The YelpCamp Has Started!!!");
});
