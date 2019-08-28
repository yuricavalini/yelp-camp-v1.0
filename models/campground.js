var mongoose = require("mongoose");

var campgroundSchema = new mongoose.Schema({
	name: String,
	price: Number,
	image: String,
	description: String,
	location: String,
	coordinates: Array,
	createdAt: { 
		type: Date,
		default: Date.now
	},
	author: {
	   id: {
		   type: mongoose.Schema.Types.ObjectId,
		   ref: "User"
	   },
	   username: String
	},
	comments: [
		{
			type: mongoose.Schema.Types.ObjectId,
			ref: "Comment"
		}
	]
});

module.exports = mongoose.model("Campground", campgroundSchema);