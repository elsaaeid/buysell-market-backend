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

module.exports = router;