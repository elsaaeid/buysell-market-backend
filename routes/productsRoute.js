const express = require("express");
const router = express.Router();
const { protect, agentSeller } = require("./authMiddleware");
const {
  createProduct,
  sendProductVerificationEmail,
  verifyProduct,
  getProducts,
  getUserProduct,
  getRelatedProducts,
  getProduct,
  deleteProduct,
  updateProduct,
  commentItem,
  replyItem,
  editComment,
  deleteComment,
  rateProduct,
} = require("../controllers/productsController");
const { upload } = require("../utils/fileUpload");


// 🧩 Product routes
router.post(
  "/sendProductVerificationEmail",
  protect,
  upload.fields([{ name: "images" }]),
  sendProductVerificationEmail
);
router.patch("/verifyProduct/:verificationToken", verifyProduct);
router.post("/", protect, upload.fields([{ name: "images" }]), createProduct);
router.patch("/:id", protect, upload.fields([{ name: "images" }]), updateProduct);
router.get("/", getProducts);
router.get("/userProduct", protect, agentSeller, getUserProduct);
router.get("/related/:category/:productId", getRelatedProducts);
router.get("/:id", getProduct);
router.delete("/:id", protect, deleteProduct);

// 💬 Comments & Ratings
router.post("/:itemId", protect, commentItem);
router.post("/:itemId/comments/:commentId", protect, replyItem);
router.put("/comments/:commentId", protect, editComment);
router.delete("/comments/:commentId", protect, deleteComment);
router.post("/:itemId/rate", protect, rateProduct);


module.exports = router;
