const express = require("express");
const router = express.Router();
const {
  protect,
  adminOnly,
  authorAdmin,
} = require("./authMiddleware");
const {
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
} = require("../controllers/userController");

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/logout", logoutUser);
router.get("/getUser", protect, getUser);
router.patch("/updateUser", protect, updateUser);

router.delete("/:id", protect, authorAdmin, deleteUser);
router.get("/getUsers", protect, authorAdmin, getUsers);
router.get("/getPendingUsers", protect, authorAdmin, getPendingUsers);
router.get("/loginStatus", loginStatus);
router.post("/upgradeUser", protect, authorAdmin, upgradeUser);
router.post("/sendAutomatedEmail", protect, sendAutomatedEmail);

router.post("/sendVerificationEmail", sendVerificationEmail);
router.post("/sendVerificationGoogleEmail", protect, sendVerificationGoogleEmail);
router.patch("/verifyUser/:verificationToken", verifyUser);
router.post("/forgotPassword", forgotPassword);
router.patch("/resetPassword/:resetToken", resetPassword);
router.patch("/changePassword", protect, changePassword);

router.post("/sendLoginCode/:email", sendLoginCode);
router.post("/loginWithCode/:email", loginWithCode);

router.post("/google/callback", loginWithGoogle);

module.exports = router;
