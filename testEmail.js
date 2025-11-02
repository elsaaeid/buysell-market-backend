require("dotenv").config();
const sendEmail = require("./utils/sendEmail");

(async () => {
  try {
    await sendEmail(
      "Test Email from Buysell Market",
      "saidsadaoy@gmail.com", // 🔹 change this to YOUR real Gmail
      process.env.EMAIL_USER,
      "buysell80market@gmail.com",
      "verifyEmail", // matches your template name
      "Test User",
      "https://example.com/verify/test"
    );
    console.log("✅ Test email sent successfully.");
  } catch (err) {
    console.error("❌ Test failed:", err);
  }
})();
