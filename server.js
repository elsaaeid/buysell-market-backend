const dotenv = require('dotenv').config();
const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const userRoute = require("./routes/userRoute");
const productsRoute = require("./routes/productsRoute");
const paymentRoute = require("./routes/paymentRoute");
const favoriteCompareRoute = require('./routes/favoriteCompareRoute');
const cartRoute = require("./routes/cartRoute");
const couponRoute = require("./routes/couponRoute");
const contactRoute = require("./routes/contactRoute");
const orderRoute = require("./routes/orderRoute");
const errorHandler = require("./middleWare/errorMiddleware");
const cors = require('cors');
const cookieParser = require("cookie-parser");
const path = require("path");
const cloudinary = require("cloudinary").v2;

const app = express();
const PORT = process.env.PORT || 8081;


const allowedOrigins = [process.env.FRONTEND_URL, "http://localhost:3000", "https://buysell-market.vercel.app"];

// Middlewares
app.use(cookieParser());
app.use(express.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ["GET", "POST", "PATCH", "DELETE", "PUT"],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));
app.use(express.json()); // This makes sure Express can parse JSON bodies
// Routes Middleware
app.use("/api/users", userRoute);
app.use("/api/products", productsRoute);
app.use("/api/products", favoriteCompareRoute);
app.use("/api/cart", cartRoute);
app.use("/api/coupon", couponRoute);
app.use("/api/contactus", contactRoute);
app.use("/api/payment", paymentRoute);
app.use("/api/orders", orderRoute);
app.use("/uploads", express.static(path.join(__dirname, "uploads")));


cloudinary.config({
  cloud_name : process.env.CLOUD_NAME,//process.env.CLOUDINARY_NAME
  api_key    : process.env.CLOUD_API_KEY,//process.env.CLOUDINARY_API_KEY
  api_secret : process.env.CLOUD_API_SECRET,//process.env.CLOUDINARY_API_SECRET
});

// Routes
app.get("*", (req, res) => {
  res.send("Home Page");
});
app.get("/favicon.ico", (req, res) => res.status(204));

// Error Middleware
app.use(errorHandler);
mongoose.set('strictQuery', true);
mongoose.connect(process.env.DATABASE)
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server Running on port ${PORT}`);
    });
  })
  .catch((err) => console.log(err));
