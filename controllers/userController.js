const asyncHandler = require("express-async-handler");
const User = require("../models/userModel");
const PendingUser = require("../models/pendingUserModel");
const bcrypt = require("bcryptjs");
const { generateToken, hashToken } = require("../utils/generateToken");
var parser = require("ua-parser-js");
const jwt = require("jsonwebtoken");
const sendEmail = require("../utils/sendEmail");
const Token = require("../models/tokenModel");
const crypto = require("crypto");
const Cryptr = require("cryptr");
const { OAuth2Client } = require("google-auth-library");
const axios = require("axios");


const cryptr = new Cryptr(process.env.CRYPTR_KEY);

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Register User
const registerUser = asyncHandler(async (req, res) => {
  const { phone, name, email, role, password } = req.body;

  // Validation
  if (!phone || !name || !email || !role || !password) {
    res.status(400);
    throw new Error("Please fill in all the required fields.");
  }

  if (password.length < 6) {
    res.status(400);
    throw new Error("Password must be up to 6 characters.");
  }

  // Check if user exists
  const userExists = await User.findOne({ email });

  if (userExists) {
    res.status(400);
    throw new Error("Email already in use.");
  }

  // Get UserAgent
  const ua = parser(req.headers["user-agent"]);
  const userAgent = [ua.ua];
  // const hashedPassword = await bcrypt.hash(password, 10);

  //   Create new user
  const user = await User.create({
    phone,
    name,
    email,
    role,
    password: password,
    userAgent,
  });

  // Generate Token
  const token = generateToken(user._id);

  // Send HTTP-only cookie
  res.cookie("token", token, {
    path: "/",
    httpOnly: true,
    expires: new Date(Date.now() + 1000 * 86400), // 1 day
    sameSite: "none",
    secure: true,
  });

  if (user) {
    const { _id, name, email, phone, bio, photo, role, isVerified } = user;

    res.status(201).json({
      _id,
      name,
      email,
      phone,
      bio,
      photo,
      role,
      isVerified,
      token,
    });
  } else {
    res.status(400);
    throw new Error("Invalid user data");
  }
});

// Login User
const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  //   Validation
  if (!email || !password) {
    res.status(400);
    throw new Error("Please add email and password");
  }

  const user = await User.findOne({ email });

  if (!user) {
    res.status(404);
    throw new Error("User not found, please signup");
  }

  const passwordIsCorrect = await bcrypt.compare(password, user.password);

  if (!passwordIsCorrect) {
    res.status(400);
    throw new Error("Invalid email or password");
  }

  // Trgger 2FA for unknow UserAgent
  const ua = parser(req.headers["user-agent"]);
  const thisUserAgent = ua.ua;
  console.log(thisUserAgent);
  const allowedAgent = user.userAgent.includes(thisUserAgent);

  if (!allowedAgent) {
    // Genrate 6 digit code
    const loginCode = Math.floor(100000 + Math.random() * 900000);
    console.log(loginCode);

    // Encrypt login code before saving to DB
    const encryptedLoginCode = cryptr.encrypt(loginCode.toString());

    // Delete Token if it exists in DB
    let userToken = await Token.findOne({ userId: user._id });
    if (userToken) {
      await userToken.deleteOne();
    }

    // Save Token to DB
    await new Token({
      userId: user._id,
      lToken: encryptedLoginCode,
      createdAt: Date.now(),
      expiresAt: Date.now() + 60 * (60 * 1000), // 60mins
    }).save();

    res.status(400);
    throw new Error("New browser or device detected");
  }

  // Generate Token
  const token = generateToken(user._id);

  if (user && passwordIsCorrect) {
    // Send HTTP-only cookie
    res.cookie("token", token, {
      path: "/",
      httpOnly: true,
      expires: new Date(Date.now() + 1000 * 86400), // 1 day
      sameSite: "none",
      secure: true,
    });

    const { _id, name, email, phone, bio, photo, role, isVerified } = user;

    res.status(200).json({
      _id,
      name,
      email,
      phone,
      bio,
      photo,
      role,
      isVerified,
      token,
    });
  } else {
    res.status(500);
    throw new Error("Something went wrong, please try again");
  }
});

// Send Login Code
const sendLoginCode = asyncHandler(async (req, res) => {
  const { email } = req.params;
  const user = await User.findOne({ email });

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  // Find Login Code in DB
  let userToken = await Token.findOne({
    userId: user._id,
    expiresAt: { $gt: Date.now() },
  });

  if (!userToken) {
    res.status(404);
    throw new Error("Invalid or Expired token, please login again");
  }

  const loginCode = userToken.lToken;
  const decryptedLoginCode = cryptr.decrypt(loginCode);

  // Send Login Code
  const subject = "Login Access Code - AUTH:Buysell Market";
  const send_to = email;
  const sent_from = process.env.EMAIL_USER;
  const reply_to = "buysell80market@gmail.com";
  const template = "loginCode";
  const name = user.name;
  const link = decryptedLoginCode;

  try {
    await sendEmail(
      subject,
      send_to,
      sent_from,
      reply_to,
      template,
      name,
      link
    );
    res.status(200).json({ message: `Access code sent to ${email}` });
  } catch (error) {
    res.status(500);
    throw new Error("Email not sent, please try again");
  }
});

// Login With Code
const loginWithCode = asyncHandler(async (req, res) => {
  const { email } = req.params;
  const { loginCode } = req.body;

  const user = await User.findOne({ email });

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  // Find user Login Token
  const userToken = await Token.findOne({
    userId: user.id,
    expiresAt: { $gt: Date.now() },
  });

  if (!userToken) {
    res.status(404);
    throw new Error("Invalid or Expired Token, please login again");
  }

  const decryptedLoginCode = cryptr.decrypt(userToken.lToken);

  if (loginCode !== decryptedLoginCode) {
    res.status(400);
    throw new Error("Incorrect login code, please try again");
  } else {
    // Register userAgent
    const ua = parser(req.headers["user-agent"]);
    const thisUserAgent = ua.ua;
    user.userAgent.push(thisUserAgent);
    await user.save();

    // Generate Token
    const token = generateToken(user._id);

    // Send HTTP-only cookie
    res.cookie("token", token, {
      path: "/",
      httpOnly: true,
      expires: new Date(Date.now() + 1000 * 86400), // 1 day
      sameSite: "none",
      secure: true,
    });

    const { _id, name, email, phone, bio, photo, role, isVerified } = user;

    res.status(200).json({
      _id,
      name,
      email,
      phone,
      bio,
      photo,
      role,
      isVerified,
      token,
    });
  }
});

// Send Verification Email (for registration)
const sendVerificationEmail = asyncHandler(async (req, res) => {
  const { phone, name, email, role, password } = req.body;

  // Validation
  if (!phone || !name || !email || !role || !password) {
    res.status(400);
    throw new Error("Please fill in all the required fields.");
  }

  // Check if user already exists
  const userExists = await User.findOne({ email });
  if (userExists) {
    res.status(400);
    throw new Error("Email already in use.");
  }

  // Check if pending user already exists
  const pendingExists = await PendingUser.findOne({ email });
  if (pendingExists) {
    res.status(400);
    throw new Error("A verification email has already been sent to this address.");
  }

  // Create verification token
  const verificationToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = hashToken(verificationToken);

  // Save pending user in DB
  const pendingUser = await PendingUser.create({
    phone,
    name,
    email,
    role,
    password,
    verificationToken: hashedToken,
    expiresAt: Date.now() + 60 * 60 * 1000, // 1 hour
  });

  // Construct email details
  const verificationUrl = `${process.env.FRONTEND_URL}/verify/${verificationToken}`;
  const subject = "Verify Your Account - AUTH: Buysell Market";
  const send_to = email;
  const sent_from = process.env.EMAIL_USER;
  const reply_to = "buysell80market@gmail.com";
  const template = "verifyEmail";
  const link = verificationUrl;

  console.log("📧 Sending verification email to:", send_to);

  try {
    const info = await sendEmail(subject, send_to, sent_from, reply_to, template, name, link);

    console.log("✅ Verification email sent:", info.response);

    res.status(200).json({
      message: "Verification Email Sent",
      pendingUser, // optional: can remove if you don’t want to return DB data
    });
  } catch (error) {
    console.error("❌ Verification email failed:", error.message);
    res.status(500);
    throw new Error("Email not sent, please try again.");
  }
});



// Send Verification Email
const sendVerificationGoogleEmail = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  if (user.isVerified) {
    res.status(400);
    throw new Error("User already verified");
  }

  // Delete Token if it exists in DB
  let token = await Token.findOne({ userId: user._id });
  if (token) {
    await token.deleteOne();
  }

  //   Create Verification Token and Save
  const verificationToken = crypto.randomBytes(32).toString("hex") + user._id;
  console.log(verificationToken);

  // Hash token and save
  const hashedToken = hashToken(verificationToken);
  await new Token({
    userId: user._id,
    vToken: hashedToken,
    createdAt: Date.now(),
    expiresAt: Date.now() + 60 * (60 * 1000), // 60mins
  }).save();

  // Construct Verification URL
  const verificationUrl = `${process.env.FRONTEND_URL}/verify/${verificationToken}`;

  // Send Email
  const subject = "Verify Your Account - AUTH: Buysell Market";
  const send_to = user.email;
  const sent_from = process.env.EMAIL_USER;
  const reply_to = "buysell80market@gmail.com";
  const template = "verifyEmail";
  const name = user.name;
  const link = verificationUrl;

  try {
    await sendEmail(
      subject,
      send_to,
      sent_from,
      reply_to,
      template,
      name,
      link
    );
    res.status(200).json({ message: "Verification Email Sent" });
  } catch (error) {
    res.status(500);
    throw new Error("Email not sent, please try again");
  }
});



// Verify User (complete registration)
const verifyUser = asyncHandler(async (req, res) => {
  const { verificationToken } = req.params;
  const hashedToken = hashToken(verificationToken);

  // Find pending user
  const pendingUser = await PendingUser.findOne({
    verificationToken: hashedToken,
    expiresAt: { $gt: Date.now() },
  });

  if (!pendingUser) {
    res.status(404);
    throw new Error("Invalid or expired verification token.");
  }

  // Hash the password before saving
  // console.log("Pending user found:", pendingUser);
  // console.log("Pending user password (before hash):", pendingUser.password);
  // const hashedPassword = await bcrypt.hash(pendingUser.password, 10);
  // console.log("Password after hash:", hashedPassword);

  // Get UserAgent from request
  const ua = parser(req.headers["user-agent"]);
  const userAgent = [ua.ua];

  // Create user in main User collection
  const { phone, name, email, role } = pendingUser;
  const user = await User.create({
    phone,
    name,
    email,
    role,
    password: pendingUser.password,
    isVerified: true,
    userAgent,
  });

  // Remove pending user
  await pendingUser.deleteOne();

  // Generate Token
  const token = generateToken(user._id);

  // Send HTTP-only cookie
  res.cookie("token", token, {
    path: "/",
    httpOnly: true,
    expires: new Date(Date.now() + 1000 * 86400), // 1 day
    sameSite: "none",
    secure: true,
  });

  res.status(200).json({
    message: "Account Verification Successful",
    token,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      isVerified: user.isVerified,
    },
  });
});


// Logout User
const logoutUser = asyncHandler(async (req, res) => {
  res.cookie("token", "", {
    path: "/",
    httpOnly: true,
    expires: new Date(0), // 1 day
    sameSite: "none",
    secure: true,
  });
  return res.status(200).json({ message: "Logout successful" });
});

const getUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user) {
    const { _id, name, email, phone, bio, photo, role, isVerified } = user;

    res.status(200).json({
      _id,
      name,
      email,
      phone,
      bio,
      photo,
      role,
      isVerified,
    });
  } else {
    res.status(404);
    throw new Error("User not found");
  }
});

// Update User
const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user) {
    const { name, email, phone, bio, photo, role, isVerified } = user;

    user.email = email;
    user.name = req.body.name || name;
    user.phone = req.body.phone || phone;
    user.bio = req.body.bio || bio;
    user.photo = req.body.photo || photo;
    user.role = req.body.role || role;
    user.isVerified = req.body.isVerified || isVerified;

    const updatedUser = await user.save();

    res.status(200).json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      phone: updatedUser.phone,
      bio: updatedUser.bio,
      photo: updatedUser.photo,
      role: updatedUser.role,
      isVerified: updatedUser.isVerified,
    });
  } else {
    res.status(404);
    throw new Error("User not found");
  }
});

// Delete User
const deleteUser = asyncHandler(async (req, res) => {
  const user = User.findById(req.params.id);
  // PendingUser
  const pendingUser = PendingUser.findById(req.params.id);

  if (!user && !pendingUser) {
    res.status(404);
    throw new Error("User not found");
  }

  await user.remove();
  await pendingUser.remove();
  res.status(200).json({
    message: "User deleted successfully",
  });
});

// Get Users
const getUsers = asyncHandler(async (req, res) => {
  const users = await User.find().sort("-createdAt").select("-password");
  if (!users) {
    res.status(500);
    throw new Error("Something went wrong");
  }
  res.status(200).json(users);
});


// Get Pending Users
const getPendingUsers = asyncHandler(async (req, res) => {
  const users = await PendingUser.find().sort("-createdAt").select("-password");
  if (!users) {
    res.status(500);
    throw new Error("Something went wrong");
  }
  res.status(200).json(users);
});

// Get Login Status
const loginStatus = asyncHandler(async (req, res) => {
  const token = req.cookies.token;
  if (!token) {
    return res.json(false);
  }

  // Verify token
  const verified = jwt.verify(token, process.env.JWT_SECRET);

  if (verified) {
    return res.json(true);
  }
  return res.json(false);
});

const upgradeUser = asyncHandler(async (req, res) => {
  const { role, id } = req.body;

  const user = await User.findById(id);

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  user.role = role;
  await user.save();

  res.status(200).json({
    message: `User role updated to ${role}`,
  });
});

// Send Automated emails
const sendAutomatedEmail = asyncHandler(async (req, res) => {
  const { subject, send_to, reply_to, template, url } = req.body;

  // Validate required parameters
  if (!subject || !send_to || !reply_to || !template) {
    res.status(400);
    throw new Error("Missing required email parameters: subject, send_to, reply_to, or template.");
  }

  try {
    // Get user details
    const user = await User.findOne({ email: send_to });

    if (!user) {
      res.status(404);
      throw new Error("User not found with the provided email address.");
    }

    const sent_from = process.env.EMAIL_USER;
    const name = user.name;
    const link = `${process.env.FRONTEND_URL}${url || ''}`; // Ensure URL is optional

    // Send the email
    await sendEmail(subject, send_to, sent_from, reply_to, template, name, link);

    res.status(200).json({ message: `Email successfully sent to ${send_to}` });
  } catch (error) {
    console.error("Error sending automated email:", error.message);
    res.status(500);
    throw new Error("Failed to send email. Please check the email service configuration and try again.");
  }
});

// Forgot Password
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });

  if (!user) {
    res.status(404);
    throw new Error("No user with this email");
  }

  // Delete Token if it exists in DB
  let token = await Token.findOne({ userId: user._id });
  if (token) {
    await token.deleteOne();
  }

  //   Create Verification Token and Save
  const resetToken = crypto.randomBytes(32).toString("hex") + user._id;
  console.log(resetToken);

  // Hash token and save
  const hashedToken = hashToken(resetToken);
  await new Token({
    userId: user._id,
    rToken: hashedToken,
    createdAt: Date.now(),
    expiresAt: Date.now() + 60 * (60 * 1000), // 60mins
  }).save();

  // Construct Reset URL
  const resetUrl = `${process.env.FRONTEND_URL}/resetPassword/${resetToken}`;

  // Send Email
  const subject = "Password Reset Request - AUTH:Buysell Market";
  const send_to = user.email;
  const sent_from = process.env.EMAIL_USER;
  const reply_to = "buysell80market@gmail.com";
  const template = "forgotPassword";
  const name = user.name;
  const link = resetUrl;

  try {
    await sendEmail(
      subject,
      send_to,
      sent_from,
      reply_to,
      template,
      name,
      link
    );
    res.status(200).json({ message: "Password Reset Email Sent" });
  } catch (error) {
    res.status(500);
    throw new Error("Email not sent, please try again");
  }
});

// Reset Password
const resetPassword = asyncHandler(async (req, res) => {
  const { resetToken } = req.params;
  const { password } = req.body;
  console.log(resetToken);
  console.log(password);

  const hashedToken = hashToken(resetToken);

  const userToken = await Token.findOne({
    rToken: hashedToken,
    expiresAt: { $gt: Date.now() },
  });

  if (!userToken) {
    res.status(404);
    throw new Error("Invalid or Expired Token");
  }

  // Find User
  const user = await User.findOne({ _id: userToken.userId });

  // Now Reset password
  user.password = await bcrypt.hash(password, 10);
  await user.save();

  res.status(200).json({ message: "Password Reset Successful, please login" });
});

// Change Password
const changePassword = asyncHandler(async (req, res) => {
  const { oldPassword, password } = req.body;
  const user = await User.findById(req.user._id);

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  if (!oldPassword || !password) {
    res.status(400);
    throw new Error("Please enter old and new password");
  }

  // Check if old password is correct
  const passwordIsCorrect = await bcrypt.compare(oldPassword, user.password);

  // Save new password
  if (user && passwordIsCorrect) {
    user.password = await bcrypt.hash(password, 10);
    await user.save();

    res
      .status(200)
      .json({ message: "Password change successful, please re-login" });
  } else {
    res.status(400);
    throw new Error("Old password is incorrect");
  }
});

// Login With Google
const loginWithGoogle = asyncHandler(async (req, res) => {
  const { userToken } = req.body;
  //   console.log(userToken);

  const ticket = await client.verifyIdToken({
    idToken: userToken,
    audience: process.env.GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload();
  const { name, email, picture, sub } = payload;
  const password = Date.now() + sub;

  // Get UserAgent
  const ua = parser(req.headers["user-agent"]);
  const userAgent = [ua.ua];

  // Check if user exists
  const user = await User.findOne({ email });

  if (!user) {
    //   Create new user
    const newUser = await User.create({
      name,
      email,
      password,
      photo: picture,
      isVerified: true,
      userAgent,
    });

    if (newUser) {
      // Generate Token
      const token = generateToken(newUser._id);

      // Send HTTP-only cookie
      res.cookie("token", token, {
        path: "/",
        httpOnly: true,
        expires: new Date(Date.now() + 1000 * 86400), // 1 day
        sameSite: "none",
        secure: true,
      });

      const { _id, name, email, phone, bio, photo, role, isVerified } = newUser;

      res.status(201).json({
        _id,
        name,
        email,
        phone,
        bio,
        photo,
        role,
        isVerified,
        token,
      });
    }
  }

  // User exists, login
  if (user) {
    const token = generateToken(user._id);

    // Send HTTP-only cookie
    res.cookie("token", token, {
      path: "/",
      httpOnly: true,
      expires: new Date(Date.now() + 1000 * 86400), // 1 day
      sameSite: "none",
      secure: true,
    });

    const { _id, name, email, phone, bio, photo, role, isVerified } = user;

    res.status(201).json({
      _id,
      name,
      email,
      phone,
      bio,
      photo,
      role,
      isVerified,
      token,
    });
  }
});


// Facebook Login
const loginWithFacebook = asyncHandler(async (req, res) => {
  const { accessToken } = req.body;

  try {
    // Verify Facebook token and get user data
    const response = await axios.get(
      `https://graph.facebook.com/me?access_token=${accessToken}&fields=id,name,email,picture`
    );

    const { name, email, picture, id } = response.data;
    const password = Date.now() + id; // Generate a unique password for new users

    // Get UserAgent
    const ua = parser(req.headers["user-agent"]);
    const userAgent = [ua.ua];

    // Check if user exists
    let user = await User.findOne({ email });

    if (!user) {
      // Create new user
      user = await User.create({
        name,
        email,
        password,
        photo: picture.data.url,
        isVerified: true,
        userAgent,
      });

      if (user) {
        // Generate Token
        const token = generateToken(user._id);

        // Send HTTP-only cookie
        res.cookie("token", token, {
          path: "/",
          httpOnly: true,
          expires: new Date(Date.now() + 1000 * 86400), // 1 day
          sameSite: "none",
          secure: true,
        });

        const { _id, name, email, phone, bio, photo, role, isVerified } = user;

        return res.status(201).json({
          _id,
          name,
          email,
          phone,
          bio,
          photo,
          role,
          isVerified,
          token,
        });
      }
    } else {
      // User exists, login
      const token = generateToken(user._id);

      // Send HTTP-only cookie
      res.cookie("token", token, {
        path: "/",
        httpOnly: true,
        expires: new Date(Date.now() + 1000 * 86400), // 1 day
        sameSite: "none",
        secure: true,
      });

      const { _id, name, email, phone, bio, photo, role, isVerified } = user;

      return res.status(200).json({
        _id,
        name,
        email,
        phone,
        bio,
        photo,
        role,
        isVerified,
        token,
      });
    }
  } catch (error) {
    console.error("Facebook login error:", error.message);
    res.status(500).json({ error: "Facebook login failed" });
  }
});

// Login With LinkedIn
const loginWithLinkedIn = asyncHandler(async (req, res) => {
  const { code } = req.body;

  // LinkedIn OAuth 2.0 token endpoint
  const tokenUrl = "https://www.linkedin.com/oauth/v2/accessToken";

  try {
    // Step 1: Exchange authorization code for access token
    const tokenResponse = await axios.post(tokenUrl, null, {
      params: {
        grant_type: "authorization_code",
        code,
        redirect_uri: process.env.LINKEDIN_REDIRECT_URI,
        client_id: process.env.LINKEDIN_CLIENT_ID,
        client_secret: process.env.LINKEDIN_CLIENT_SECRET,
      },
    });

    const accessToken = tokenResponse.data.access_token;

    // Step 2: Fetch user profile data
    const profileResponse = await axios.get("https://api.linkedin.com/v2/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const emailResponse = await axios.get(
      "https://api.linkedin.com/v2/emailAddress?q=members&projection=(elements*(handle~))",
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    const { localizedFirstName, localizedLastName, id } = profileResponse.data;
    const email = emailResponse.data.elements[0]["handle~"].emailAddress;
    const name = `${localizedFirstName} ${localizedLastName}`;
    const password = Date.now() + id;

    // Get UserAgent
    const ua = parser(req.headers["user-agent"]);
    const userAgent = [ua.ua];

    // Step 3: Check if user exists
    const user = await User.findOne({ email });

    if (!user) {
      // Create new user
      const newUser = await User.create({
        name,
        email,
        password,
        isVerified: true,
        userAgent,
      });

      if (newUser) {
        // Generate Token
        const token = generateToken(newUser._id);

        // Send HTTP-only cookie
        res.cookie("token", token, {
          path: "/",
          httpOnly: true,
          expires: new Date(Date.now() + 1000 * 86400), // 1 day
          sameSite: "none",
          secure: true,
        });

        const { _id, name, email, phone, bio, photo, role, isVerified } = newUser;

        res.status(201).json({
          _id,
          name,
          email,
          phone,
          bio,
          photo,
          role,
          isVerified,
          token,
        });
      }
    }

    // User exists, login
    if (user) {
      const token = generateToken(user._id);

      // Send HTTP-only cookie
      res.cookie("token", token, {
        path: "/",
        httpOnly: true,
        expires: new Date(Date.now() + 1000 * 86400), // 1 day
        sameSite: "none",
        secure: true,
      });

      const { _id, name, email, phone, bio, photo, role, isVerified } = user;

      res.status(201).json({
        _id,
        name,
        email,
        phone,
        bio,
        photo,
        role,
        isVerified,
        token,
      });
    }
  } catch (error) {
    console.error("Error during LinkedIn login:", error.response?.data || error.message);
    res.status(500).send("Authentication failed");
  }
});

// Set a cookie
 const setCookie = asyncHandler(async (req, res) => {
  const { cookiesAccepted, username } = req.body;

  if (cookiesAccepted === undefined || username === undefined) {
      return res.status(400).json({ message: "Invalid request. Missing required fields." });
  }

  // Set cookies
  res.cookie("cookiesAccepted", cookiesAccepted, { maxAge: 3600000, httpOnly: true }); // 1 hour
  res.cookie("username", username || "Guest", { maxAge: 3600000, httpOnly: true }); // 1 hour

  res.status(200).json({ message: "Cookies have been set!" });
});

// Get cookies
 const getCookie = (req, res) => {
  const cookiesAccepted = req.cookies.cookiesAccepted;
  const username = req.cookies.username;

  if (cookiesAccepted) {
      res.status(200).json({ message: `Welcome back, ${username || "Guest"}!` });
  } else {
      res.status(404).json({ message: "No cookies found." });
  }
};
// Remove cookies
 const removeCookie = (req, res) => {
  res.clearCookie("cookiesAccepted");
  res.clearCookie("username");

  res.status(200).json({ message: "Cookies have been removed!" });
};

module.exports = {
  registerUser,
  loginUser,
  logoutUser,
  getUser,
  updateUser,
  deleteUser,
  getUsers,
  getPendingUsers,
  loginStatus,
  upgradeUser,
  sendAutomatedEmail,
  sendVerificationEmail,
  sendVerificationGoogleEmail,
  verifyUser,
  forgotPassword,
  resetPassword,
  changePassword,
  sendLoginCode,
  loginWithCode,
  loginWithGoogle,
  loginWithFacebook,
  loginWithLinkedIn,
  setCookie,
  getCookie,
  removeCookie,
};
