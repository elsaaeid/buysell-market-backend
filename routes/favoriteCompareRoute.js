const express = require('express');
const router = express.Router();
const {
  protect
} = require("./authMiddleware");
const {
  addToFavorite,
  getUserFavorites,
  removeFromFavorite,
  addToCompare,
  getUserCompares,
  removeFromCompare,
  clearProductFavorites,
  clearProductCompares,
  updateFavoriteVariantAction,
  updateCompareVariantAction
} = require('../controllers/productsController');


// Add product to favorites (expects :itemId as param)
router.post('/:itemId/favorite', protect, addToFavorite);

// Get user favorites
router.get('/favorites/:userId', protect, getUserFavorites);

// Clear all favorites
router.delete('/favorites/:userId', protect, clearProductFavorites);

// Clear all compares
router.delete('/compares/:userId', protect, clearProductCompares);

// removeFromFavorite
router.delete('/:itemId/favorite', protect, removeFromFavorite);

// Add product to compare
router.post('/:itemId/compare', protect, addToCompare);

// Get user compares
router.get('/compares/:userId', protect, getUserCompares);

// removeFromCompare
router.delete('/:itemId/compare', protect, removeFromCompare);

// Update favorite item variant (color, size, image)
router.patch("/updateFavorite/:itemId", protect, updateFavoriteVariantAction);

// Update compare item variant (color, size, image)
router.patch("/updateCompare/:itemId", protect, updateCompareVariantAction);


module.exports = router;