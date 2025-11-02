const mongoose = require("mongoose");

const pendingUserSchema = new mongoose.Schema({
  phone:{
    type: String,
    required: [true, "Please add a phone number"],
    unique: true,
    trim: true,
    match: [
      /^\+?[1-9]\d{1,14}$/,
      "Please enter a valid phone number",
    ],
  },
  name: {
    type: String,
    required: [true, "Please add a name"],
  },
  email: {
    type: String,
    required: [true, "Please add an email"],
    unique: true,
    trim: true,
    match: [
      /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
      "Please enter a valid email",
    ],
  },
  role: {
    type: String,
    required: [true, "Please add a role"],
  },
  password: {
    type: String,
    required: [true, "Please add a password"],
  },
  verificationToken: String,
  expiresAt: Date,
});

module.exports = mongoose.model("PendingUser", pendingUserSchema);