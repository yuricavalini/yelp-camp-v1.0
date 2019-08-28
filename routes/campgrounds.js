var express = require("express");
var router = express.Router();
var Campground = require("../models/campground");
var Comment = require("../models/comment");
var User = require("../models/user");
var Notification = require("../models/notification");
var middleware = require("../middleware");
const mbxGeocoding = require('@mapbox/mapbox-sdk/services/geocoding');
const geocodingClient = mbxGeocoding({ accessToken: process.env.MAPBOX_TOKEN });

// configure dotenv
require('dotenv').config();

// INDEX - show all campgrounds
router.get("/", function(req, res){
	var noMatch = null;
	if(req.query.search) {
		const regex = new RegExp(escapeRegex(req.query.search), 'gi');
		// Get all campground from DB
		Campground.find({ name:regex }, function(err, allCampgrounds){
			if(err){
				console.log(err);
			} else {
				if(allCampgrounds.length < 1) {
					noMatch = "No campgrounds match that query, please try again.";
				}
				res.render("campgrounds/index", { campgrounds:allCampgrounds, page:"campgrounds", noMatch:noMatch });
			}
		});
	}	else {
		// Get all campground from DB
		Campground.find({}, function(err, allCampgrounds){
			if(err){
				console.log(err);
			} else {
				res.render("campgrounds/index", {campgrounds:allCampgrounds, page:"campgrounds", noMatch:noMatch});
			}
		});
	}
}); 

// CREATE - add new campground to DB
router.post("/", middleware.isLoggedIn, async function(req, res){
	var name = req.body.name;
	var price = req.body.price;
	var image = req.body.image;
	var desc = req.body.description;
	var location = req.body.location;
	var author = {
		id: req.user._id,
		username: req.user.username
	};
	
	// API request to mapbox
	let response =  await geocodingClient
		.forwardGeocode({
			query: req.body.location,
			limit: 1
		})
		.send();
	
	req.body.coordinates = response.body.features[0].geometry.coordinates;
	console.log("This is the newcamp coordenate: " + response.body.features[0].geometry.coordinates);

	var coordinates = req.body.coordinates;
	
	var newCampground = {name: name, price: price, image: image, description: desc, author: author, location:location, coordinates:coordinates};
	
	// Create a new campground, save to DB and holds notification for followers
	try {
      let campground = await Campground.create(newCampground);
      let user = await User.findById(req.user._id).populate('followers').exec();
      let newNotification = {
        username: req.user.username,
        campgroundId: campground.id
      }
      for(const follower of user.followers) {
        let notification = await Notification.create(newNotification);
        follower.notifications.push(notification);
        follower.save();
      }

      //redirect back to campgrounds page
      res.redirect(`/campgrounds/${campground.id}`);
    } catch(err) {
      req.flash('error', err.message);
      res.redirect('back');
    }
});

// NEW - show form to create new campground
router.get("/new", middleware.isLoggedIn, function(req, res){
	res.render("campgrounds/new");
});

// SHOW - shows more info about one campground
router.get("/:id", function(req, res){
	Campground.findById(req.params.id).populate("comments").exec(function(err, foundCampground){
		if(err || !foundCampground){
			req.flash("error", "Campground not found");
			res.redirect("back");
		} else {
			console.log(foundCampground);
			res.render("campgrounds/show", {campground: foundCampground});
		}
	});
});


// EDIT CAMPGROUND ROUTE
router.get("/:id/edit", middleware.checkCampgroundOwnership, function(req, res){
	Campground.findById(req.params.id, function(err, foundCampground){
		res.render("campgrounds/edit", {campground: foundCampground});
	});
});

// UPDATE CAMPGROUND ROUTE
router.put("/:id", function(req, res){
	Campground.findByIdAndUpdate(req.params.id, req.body.campground, function(err, updatedCampground){
		if(err){
			res.redirect("/campgrounds");
		} else {
			res.redirect("/campgrounds/" + req.params.id);
		}
	});
});

// DELETE CAMPGROUND ROUTE
router.delete("/:id", middleware.checkCampgroundOwnership, function(req, res){
	Campground.findByIdAndRemove(req.params.id, function(err, campgroundRemoved){
		if(err){
			res.redirect("/campgrounds");
		} 
		Comment.deleteMany( {_id: { $in: campgroundRemoved.comments } }, function(err){
			if (err){
				console.log(err);
			} else {
				res.redirect("/campgrounds");
			}
		});
	});
});

// fuzzy search func
function escapeRegex(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
};

module.exports = router;