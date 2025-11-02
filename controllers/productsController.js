const asyncHandler = require("express-async-handler");
const {Products, Favorite, Compare} = require("../models/productsModel");
const PendingProduct = require("../models/pendingProductModel");
const { fileSizeFormatter } = require("../utils/fileUpload");
const cloudinary = require("cloudinary").v2;
const crypto = require("crypto");
const { hashToken } = require("../utils/generateToken");
const  { toCloudinaryWebp } = require('../utils/imageUtils');
const sendProductEmail = require("../utils/sendProductEmail");



// Create Product
const createProduct = asyncHandler(async (req, res) => {
  const { 
    productType,
    hasShow,
    isFeatured,
    name, 
    name_ar, 
    sku, 
    category, 
    category_ar, 
    price,
    discount,
    description, 
    description_ar, 
    itemColors,
    model,
    model_ar,
    sizes,
  } = req.body;

  // Handle images upload
  let imagesData = [];
  if (req.files && req.files.images) {
    try {
      const uploadPromises = req.files.images.map(file => 
        cloudinary.uploader.upload(file.path, {
          folder: "Portfolio React",
          resource_type: "image",
        })
      );

      const uploadedFiles = await Promise.all(uploadPromises);
      imagesData = uploadedFiles.map(uploadedFile => ({
        fileName: uploadedFile.originalname,
        filePath: uploadedFile.secure_url,
        fileType: uploadedFile.mimetype,
        fileSize: fileSizeFormatter(uploadedFile.size, 2),
      }));
    } catch (error) {
      res.status(500);
      throw new Error("Product images could not be uploaded");
    }
  }

  // Create Product
  const product = await Products.create({
    user: req.user.id,
    name,
    name_ar,
    productType,
    category,
    category_ar,
    description,
    description_ar,
    model,
    model_ar,
    hasShow,
    isFeatured,
    price,
    discount,
    sizes: JSON.parse(sizes || '[]'),
    itemColors: JSON.parse(itemColors || '[]'),
    images: imagesData, // Store all product images
    sku,
  });

  res.status(201).json(product);
});

// Send Product Verification Email
const sendProductVerificationEmail = asyncHandler(async (req, res) => {
  const {
    productType,
    hasShow,
    isFeatured,
    name,
    name_ar,
    sku,
    category,
    category_ar,
    price,
    discount,
    description,
    description_ar,
    itemColors,
    model,
    model_ar,
    sizes,
    createdAt,
  } = req.body;

  const user = req.user;

  // 🖼️ Upload Images
  let imagesData = [];
  if (req.files && req.files.images) {
    try {
      const uploadPromises = req.files.images.map(file =>
        cloudinary.uploader.upload(file.path, {
          folder: "Buysell Products",
          resource_type: "image",
        })
      );

      const uploadedFiles = await Promise.all(uploadPromises);
      imagesData = uploadedFiles.map(file => ({
        fileName: file.original_filename,
        filePath: file.secure_url,
        fileType: file.resource_type,
        fileSize: fileSizeFormatter(file.bytes, 2),
      }));
    } catch (error) {
      console.error("Cloudinary upload error:", error);
      res.status(500);
      throw new Error("Product images could not be uploaded.");
    }
  }

  // 🔐 Create Verification Token
  const verificationToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = hashToken(verificationToken);

  // 👑 Find Admins
  const User = require("../models/userModel");
  const admins = await User.find({ role: { $in: ["superadmin", "admin", "author"] } });
  if (!admins.length) {
    res.status(500);
    throw new Error("No admin users found to send verification email.");
  }

  const adminEmails = admins.map(a => a.email);
  const verificationUrl = `${process.env.FRONTEND_URL}/verify-product/${verificationToken}`;

  // 🏷️ Labels (match your HTML)
  const labelProps = {
    title: "Verify Product",
    verify_instruction: "Please review the following product for verification:",
    nameLabel: "Product Name",
    productTypeLabel: "Product Type",
    productModelLabel: "Product Model",
    categoryLabel: "Product Category",
    descriptionLabel: "Product Description",
    priceLabel: "Price",
    discountLabel: "Discount",
    colorLabel: "Colors",
    sizesLabel: "Sizes",
    hasShowLabel: "Has Show",
    isFeaturedLabel: "Is Featured",
    imagesLabel: "Product Images",
    listingDateLabel: "Listing Date",
    link_validity: "This link is valid for 1 hour.",
    verify_button: "Verify Product",
    regards: "Regards, Buysell Market Team",
    creatorMessage: `A new product was submitted by ${user.name} (${user.email}).`,
  };


    // Normalize boolean and array fields
    const parsedHasShow = hasShow === "true" || hasShow === true;
    const parsedIsFeatured = isFeatured === "true" || isFeatured === true;
    const parsedItemColors = Array.isArray(itemColors)
      ? itemColors
      : JSON.parse(itemColors || "[]");
    const parsedSizes = Array.isArray(sizes)
      ? sizes
      : JSON.parse(sizes || "[]");


  // 🧾 Product Details
  const productDetails = [
    { label: labelProps.nameLabel, value: name || "" },
    { label: labelProps.productTypeLabel, value: productType || "" },
    { label: labelProps.productModelLabel, value: model || "" },
    { label: labelProps.categoryLabel, value: category || "" },
    { label: labelProps.descriptionLabel, value: description || "" },
    { label: labelProps.priceLabel, value: price || "" },
    { label: labelProps.discountLabel, value: discount || "" },
    { label: labelProps.colorLabel, value: parsedItemColors || "" },
    { label: labelProps.sizesLabel, value: parsedSizes || "" },
    { label: labelProps.hasShowLabel, value: parsedHasShow ? "Yes" : "No" },
    { label: labelProps.isFeaturedLabel, value: parsedIsFeatured ? "Yes" : "No" },
    {
      label: labelProps.imagesLabel,
      value: imagesData.map(img => ({ filePath: img.filePath })),
    },
    { label: labelProps.listingDateLabel, value: createdAt || "" },
  ];

  // 📧 Send Email
  try {
    await sendProductEmail({
      subject: "Verify Product Submission - Buysell Market",
      send_to: adminEmails.join(","),
      sent_from: user.email,
      reply_to: user.email,
      template: "verifyProduct",
      link: verificationUrl,
      labelProps,
      creatorMessage: labelProps.creatorMessage,
      productDetails,
      name,
    });


    // 💾 Save Pending Product
    await PendingProduct.create({
      user: user._id,
      name,
      name_ar,
      productType,
      category,
      category_ar,
      description,
      description_ar,
      model,
      model_ar,
      hasShow: parsedHasShow,
      isFeatured: parsedIsFeatured,
      price,
      discount,
      itemColors: parsedItemColors,
      sizes: parsedSizes,
      images: imagesData,
      sku,
      verificationToken: hashedToken,
      expiresAt: Date.now() + 60 * 60 * 1000,
    });

    res.status(200).json({ message: "Verification email sent to admins." });
  } catch (error) {
    console.error("Verification email error:", error);
    res.status(500);
    throw new Error("Verification email not sent. Please try again.");
  }
});


// Verify Product (complete Posting)
const verifyProduct = asyncHandler(async (req, res) => {
  const { verificationToken } = req.params;
  const hashedToken = hashToken(verificationToken);

  // Find pending Product
  const pendingProduct = await PendingProduct.findOne({
    verificationToken: hashedToken,
    expiresAt: { $gt: Date.now() },
  });

  if (!pendingProduct) {
    // Add more diagnostics for debugging
    const expired = await PendingProduct.findOne({ verificationToken: hashedToken });
    if (expired) {
      console.error('[VerifyProduct] Token found but expired:', hashedToken);
      res.status(404);
      throw new Error('Verification token expired. Please request a new verification email.');
    } else {
      console.error('[VerifyProduct] No pending product found for token:', hashedToken);
      res.status(404);
      throw new Error('Invalid verification token.');
    }
  }

  // Copy all relevant fields from pendingProduct to new product
  const productData = { ...pendingProduct._doc };
  delete productData._id;
  delete productData.verificationToken;
  delete productData.expiresAt;

  const product = await Products.create(productData);

  await PendingProduct.deleteOne({ _id: pendingProduct._id });

  res.status(201).json({ message: 'Product verified and created successfully.', product });
});

// Update Product
const updateProduct = asyncHandler(async (req, res) => {
  const {
    hasShow,
    isFeatured,
    productType,       
    name, 
    name_ar, 
    category, 
    category_ar, 
    price,
    discount,
    description, 
    description_ar,
    itemColors,
    sizes,
    model,
    model_ar,
  } = req.body;
  
  const { id } = req.params;

  const product = await Products.findById(id);

  // If product doesn't exist
  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }

  // Match product to its user
  if (product.user.toString() !== req.user.id) {
    res.status(401);
    throw new Error("User not authorized");
  }

  // Handle images upload
  let imagesData = [];
  if (req.files && req.files.images) {
    try {
      const uploadPromises = req.files.images.map(file => 
        cloudinary.uploader.upload(file.path, {
          folder: "Portfolio React",
          resource_type: "image",
        })
      );

      const uploadedFiles = await Promise.all(uploadPromises);
      imagesData = uploadedFiles.map(uploadedFile => ({
        fileName: uploadedFile.originalname,
        filePath: uploadedFile.secure_url,
        fileType: uploadedFile.mimetype,
        fileSize: fileSizeFormatter(uploadedFile.size, 2),
      }));
    } catch (error) {
      res.status(500);
      throw new Error("Product images could not be uploaded");
    }
  }

  // Update Product
  const updatedProduct = await Products.findByIdAndUpdate(
    id,
    {
        hasShow,
        isFeatured,
        productType,
        name,
        name_ar,
        category,
        category_ar,
        price,
        discount,
        description,
        description_ar,
        itemColors: JSON.parse(itemColors || '[]'),
        sizes: JSON.parse(sizes || '[]'),
        model,
        model_ar,
        images: imagesData.length > 0 ? imagesData : product.images,
    },
    {
      new: true,
      runValidators: true,
    }
  );

  res.status(200).json(updatedProduct);
});


// Get all Products
const getProducts = async (req, res) => {
  try {
    const products = await Products.find().sort({ createdAt: -1 });
    res.json(products);
  } catch (error) {
    console.error('Error retrieving products:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};


// Get all shows products
const getShowProducts = async (req, res) => {
  try {
    const products = await Products.find().sort({ createdAt: -1 });
    const productsWithShows = products.filter(product => product.hasShow);
    res.json(productsWithShows);
  } catch (error) {
    console.error('Error retrieving show products:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};


// Get all related product by category
const getRelatedProducts = asyncHandler(async (req, res) => {
  const { category, productId } = req.params; // Destructure category and productId from params

  // Validate category input
  if (!category) {
      return res.status(400).json({ message: "Category is required" });
  }

  try {
      // Fetch the product that matches the productId to compare names
      const foundProduct = await Products.findById(productId);
      if (!foundProduct) {
          return res.status(404).json({ message: "Product not found" });
      }

      // Fetch related products by category
      const products = await Products.find({ category }).limit(5); // Fetch related products

      // Filter out products with the same name as the found product
      const filteredProducts = products.filter(product => product.name !== foundProduct.name);

      // if (!filteredProducts.length) {
      //     return res.status(404).json({ message: "No related products found" });
      // }

      res.status(200).json(filteredProducts); // Return the filtered products
  } catch (err) {
      res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Get single product
const getProduct = asyncHandler(async (req, res) => {
  const product = await Products.findById(req.params.id);
  // if product doesn't exist
  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }
  // Match product to its user
  // if (product.user.toString() !== req.user.id) {
  //   res.status(401);
  //   throw new Error("User not authorized");
  // }
  res.status(200).json(product);
});


// Get all products for the current seller or agent user
const getUserProduct = asyncHandler(async (req, res) => {
    if (!req.user || (req.user.role !== "seller" && req.user.role !== "agent")) {
        res.status(403);
        throw new Error("Only users with the 'Seller' or 'Agent' role can access their products.");
    }
    const products = await Products.find({ user: req.user.id }).populate('user', 'name email phone photo role bio').sort({ createdAt: -1 });
    const formattedProducts = products.map(prop => {
      const propObj = prop.toObject();
      if (Array.isArray(propObj.images)) {
        propObj.images = propObj.images.map(img => ({
          ...img,
          filePathWebp: img.filePath ? toCloudinaryWebp(img.filePath) : img.filePath
        }));
      }
      return propObj;
    });
    res.status(200).json(formattedProducts);
});


// Get all featured products
const getFeaturedproducts = asyncHandler(async (req, res) => {
  const dbProducts = await Products.find({ isFeatured: true });
  const formatted = dbProducts.map(p => {
    const propObj = p.toObject();
    if (Array.isArray(propObj.images)) {
      propObj.images = propObj.images.map(img => ({
        ...img,
        filePathWebp: img.filePath ? toCloudinaryWebp(img.filePath) : img.filePath
      }));
    }
    return propObj;
  });
  res.json([...formatted]);
});

// Delete Product
const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Products.findById(req.params.id);
  // if product doesnt exist
  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }
  // Match product to its user
  if (product.user.toString() !== req.user.id) {
    res.status(401);
    throw new Error("User not authorized");
  }
  await product.remove();
  res.status(200).json({ message: "Product deleted." });
});

//commentItem
const commentItem = async (req, res) => {
  const itemId = req.params.itemId;
  const { comment, userName, userPhoto } = req.body;

  // Log incoming data
  console.log("Received data:", { itemId, comment, userName, userPhoto });

  // Validate input
  if (!comment || !userName || !userPhoto) {
      return res.status(400).json({ message: "Comment and user name are required." });
  }

  // Check if itemId is a valid ObjectId
  if (!mongoose.Types.ObjectId.isValid(itemId)) {
      return res.status(400).json({ message: "Invalid item ID format." });
  }

  // Find the item post by ID
  const item = await Products.findById(itemId);
  if (!item) {
      return res.status(404).json({ message: "Item post not found." });
  }

  // Create a new comment object
  const newComment = {
      user: userName,
      photo: userPhoto,
      comment: comment,
      createdAt: new Date()
  };

  // Add the new comment to the item's comments array
  item.comments.push(newComment);

  // Save the updated item post
  await item.save();

  // Log the response being sent back
  console.log("Response data:", { message: "Comment added successfully.", comment: newComment });
  res.status(200).json({ message: "Comment added successfully.", comment: newComment });
};

// Reply to a comment
const replyItem = async (req, res) => {
  const { itemId, commentId } = req.params;
  const { reply, userName, userPhoto } = req.body; // Assuming userId is sent with the reply

  // Log incoming data
  console.log("Received data:", { itemId, commentId, reply, userName, userPhoto });
  
  // Validate incoming data
  if (!reply || !userName || !userPhoto) {
      return res.status(400).json({ message: 'Reply and userId are required.' });
  }

  try {
      // Find the item post by ID
      const item = await Products.findById(itemId);
      if (!item) {
          return res.status(404).json({ message: 'Item not found.' });
      }

      // Find the comment by ID
      const comment = item.comments.id(commentId);
      if (!comment) {
          return res.status(404).json({ message: 'Comment not found.' });
      }

      // Create a new reply object
      const newReply = {
          commentId: commentId, // Reference to the comment being replied to
          user: userName,
          photo: userPhoto,
          reply: reply,
          createdAt: new Date()
      };

      // Push the new reply into the comment's replies array
      comment.replies.push(newReply);

      // Save the updated item document
      await item.save();

      // Return the updated comment with replies
      return res.status(200).json(comment);
  } catch (error) {
      console.error('Error replying to comment:', error);
      return res.status(500).json({ message: 'Internal server error.' });
  }
};

// Function to edit a comment
const editComment = async (req, res) => {
  const { commentId } = req.params; // Extract commentId from the request parameters
  const { comment } = req.body; // Extract the new comment text from the request body

  // Log incoming data
  console.log("Editing comment:", { commentId, comment });

  // Validate input
  if (!comment) {
      return res.status(400).json({ message: "Comment text is required." });
  }

  // Check if commentId is a valid ObjectId
  if (!mongoose.Types.ObjectId.isValid(commentId)) {
      return res.status(400).json({ message: "Invalid comment ID format." });
  }

  // Find the item post that contains the comment
  const item = await Products.findOne({ "comments._id": commentId });
  if (!item) {
      return res.status(404).json({ message: "Comment not found." });
  }

  // Find the comment to edit
  const commentToEdit = item.comments.id(commentId);
  if (!commentToEdit) {
      return res.status(404).json({ message: "Comment not found." });
  }

  // Update the comment text
  commentToEdit.comment = comment;

  // Save the updated item post
  await item.save();

  // Log the response being sent back
  console.log("Response data:", { message: "Comment updated successfully.", comment: commentToEdit });
  res.status(200).json({ message: "Comment updated successfully.", comment: commentToEdit });
};

// Function to delete a comment
const deleteComment = async (req, res) => {
  const { commentId } = req.params; // Extract commentId from the request parameters

  // Log incoming data
  console.log("Attempting to delete comment with ID:", commentId);

  // Check if commentId is a valid ObjectId
  if (!mongoose.Types.ObjectId.isValid(commentId)) {
      return res.status(400).json({ message: "Invalid comment ID format." });
  }

  // Attempt to find the item and remove the comment
  const item = await Products.findOneAndUpdate(
      { "comments._id": commentId }, // Find item with the comment
      { $pull: { comments: { _id: commentId } } }, // Remove the comment
      { new: true } // Return the updated item
  );

  // Check if the item was found and updated
  if (!item) {
      return res.status(404).json({ message: "Comment not found." });
  }

  // Successfully deleted the comment
  res.status(200).json({ message: "Comment deleted successfully." });
};

// Function to rate a product
const rateProduct = async (req, res) => {
  const userId = req.user._id;
  const { rating } = req.body; // Extract userId and rating from the request body
  const { itemId } = req.params; // Extract itemId from the request parameters

  try {
      // Validate input
      if (!userId || typeof rating === 'undefined' || rating < 1 || rating > 5) {
          return res.status(400).json({ message: "Invalid input. Rating must be between 1 and 5." });
      }

      // Find the product by ID
      const product = await Products.findById(itemId);
      if (!product) {
          return res.status(404).json({ message: "Product not found." });
      }

      // Check if the user has already rated the product
      const existingRatingIndex = product.ratings.findIndex(r => r.userId.toString() === userId);
      if (existingRatingIndex !== -1) {
          // Update existing rating
          product.ratings[existingRatingIndex].rating = rating;
      } else {
          // Add new rating
          product.ratings.push({ userId, rating });
      }

      // Calculate the new average rating
      const totalRatings = product.ratings.reduce((sum, r) => sum + r.rating, 0);
      product.rating = totalRatings / product.ratings.length;

      // Save the updated product
      await product.save();

      // Return the updated product data
      res.status(200).json({ _id: product._id, rating: product.rating, ratings: product.ratings });
  } catch (error) {
      console.error("Error rating product:", error);
      res.status(500).json({ message: "Server error. Please try again later." });
  }
};

// ✅ Add product (with full details) to user's favorites
const addToFavorite = async (req, res) => {
  try {
    const userId = req.user?._id;
    const itemId = req.params?.itemId || req.body?.itemId;
    const { selectedColor, selectedImage, selectedSize } = req.body;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized: Missing userId." });
    }

    if (!itemId) {
      return res.status(400).json({ message: "Invalid itemId: Cannot add to favorites." });
    }

    // ✅ Find or create the user's favorites document
    let favorite = await Favorite.findOne({ userId });
    if (!favorite) favorite = new Favorite({ userId, favoriteProducts: [] });

    // ✅ Check if product exists
    const product = await Products.findById(itemId).lean();
    if (!product) {
      return res.status(404).json({ message: "Product not found." });
    }

    // ✅ Check for duplicates
    const alreadyExists = favorite.favoriteProducts.some(
      (fav) => fav && fav._id && fav._id.toString() === itemId.toString()
    );

    if (alreadyExists) {
      return res.status(200).json({
        message: "Product already in favorites.",
        favorites: favorite.favoriteProducts,
      });
    }

    // ✅ Add new favorite with variant info
    favorite.favoriteProducts.push({
      _id: product._id,
      name: product.name,
      name_ar: product.name_ar,
      price: product.price,
      discount: product.discount,
      selectedColor: selectedColor || null,
      selectedImage: selectedImage || null,
      selectedSize: selectedSize || null,
    });

    await favorite.save();

    return res.status(200).json({
      message: "Added to favorites successfully.",
      favorites: favorite.favoriteProducts,
    });
  } catch (error) {
    console.error("❌ Error in addToFavorite:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};



// ✅ Remove product from favorites
const removeFromFavorite = async (req, res) => {
  try {
    const userId = req.user._id;
    const { itemId } = req.params;

    if (!userId || !itemId) {
      return res.status(400).json({ message: "Missing userId or itemId." });
    }

    const favorite = await Favorite.findOne({ userId });
    if (!favorite) {
      return res.status(404).json({ message: "Favorites not found for user." });
    }

    // Filter out the removed item
    favorite.favoriteProducts = favorite.favoriteProducts.filter(
      (prod) => String(prod._id) !== String(itemId)
    );

    await favorite.save();

    return res.status(200).json({
      message: "Removed from favorites successfully",
      favorites: favorite.favoriteProducts,
    });
  } catch (error) {
    console.error("❌ Error removing from favorites:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};



// ✅ Clear all favorites for user
const clearProductFavorites = async (req, res) => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      return res.status(400).json({ message: "Missing userId." });
    }

    const favorite = await Favorite.findOne({ userId });
    if (!favorite) {
      return res.status(404).json({ message: "No favorites found for this user." });
    }

    favorite.favoriteProducts = [];
    await favorite.save();

    return res.status(200).json({
      message: "All favorites cleared successfully.",
      favorites: [],
    });
  } catch (error) {
    console.error("❌ Error clearing favorites:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


// Add a product to user's compare list
const addToCompare = async (req, res) => {
  try {
    const userId = req.user?._id;
    const itemId = req.params?.itemId || req.body?.itemId;
    const { selectedColor, selectedImage, selectedSize } = req.body;

    if (!userId || !itemId) {
      return res.status(400).json({ message: "Missing userId or itemId." });
    }

    let compare = await Compare.findOne({ userId });
    if (!compare) compare = new Compare({ userId, compareProducts: [] });

    const product = await Products.findById(itemId).lean();
    if (!product) {
      return res.status(404).json({ message: "Product not found." });
    }

    const alreadyExists = compare.compareProducts.some(
      (comp) => String(comp._id) === String(itemId)
    );
    if (alreadyExists) {
      return res.status(200).json({
        message: "Product already in compare list.",
        compareProducts: compare.compareProducts,
      });
    }

    compare.compareProducts.push({
      _id: product._id,
      name: product.name,
      name_ar: product.name_ar,
      price: product.price,
      discount: product.discount,
      selectedColor,
      selectedImage,
      selectedSize,
    });

    await compare.save();

    return res.status(200).json({
      message: "Added to compare list successfully",
      compareProducts: compare.compareProducts,
    });
  } catch (error) {
    console.error("❌ Error in addToCompare:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


// Get all compare products for a user (by userId param, for admin dashboard)
const getUserCompares = async (req, res) => {
  const { userId } = req.params;
  // Validate userId
  if (!userId || !userId.match(/^[0-9a-fA-F]{24}$/)) {
    return res.status(400).json({ message: "Invalid or missing userId parameter." });
  }
  try {
    const compare = await Compare.findOne({ userId }).populate('compareProducts');
    if (!compare) {
      return res.status(200).json({ compareProducts: [] });
    }
    // Convert images to WebP for each product in compareProducts
    const formattedCompares = compare.compareProducts.map(p => {
      const propObj = p.toObject ? p.toObject() : p;
      if (propObj.image && propObj.image.filePath) {
        propObj.image.filePathWebp = toCloudinaryWebp(propObj.image.filePath);
      }
      return propObj;
    });
    res.status(200).json({ compareProducts: formattedCompares });
  } catch (error) {
    console.error("Error fetching user compares:", error);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
};

// Get all favorite products for a user (by userId param, for admin dashboard)
const getUserFavorites = async (req, res) => {
  const { userId } = req.params;
  // Validate userId
  if (!userId || !userId.match(/^[0-9a-fA-F]{24}$/)) {
    return res.status(400).json({ message: "Invalid or missing userId parameter." });
  }
  try {
    const favorite = await Favorite.findOne({ userId }).populate('favoriteProducts');
    if (!favorite) {
      return res.status(200).json({ favoriteProducts: [] });
    }
    // Convert images to WebP for each product in favoriteProducts
    const formattedFavorites = favorite.favoriteProducts.map(p => {
      const propObj = p.toObject ? p.toObject() : p;
      if (propObj.image && propObj.image.filePath) {
        propObj.image.filePathWebp = toCloudinaryWebp(propObj.image.filePath);
      }
      return propObj;
    });
    res.status(200).json({ favoriteProducts: formattedFavorites });
  } catch (error) {
    console.error("Error fetching user favorites:", error);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
};

// Function to remove product from compare
const removeFromCompare = async (req, res) => {
  try {
    const userId = req.user._id;
    const { itemId } = req.params;

    if (!userId || !itemId) {
      return res.status(400).json({ message: "Missing userId or itemId." });
    }

    const compare = await Compare.findOne({ userId });
    if (!compare) {
      return res.status(404).json({ message: "Compare list not found for user." });
    }

    // Filter out the removed item
    compare.compareProducts = compare.compareProducts.filter(
      (prod) => String(prod._id) !== String(itemId)
    );

    await compare.save();

    return res.status(200).json({
      message: "Removed from compare list successfully",
      compareProducts: compare.compareProducts,
    });
  } catch (error) {
    console.error("❌ Error removing from compare list:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


// clearProductCompares
const clearProductCompares = async (req, res) => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      return res.status(400).json({ message: "Missing userId." });
    }

    const compare = await Compare.findOne({ userId });
    if (!compare) {
      return res.status(404).json({ message: "No compares found for this user." });
    }

    compare.compareProducts = [];
    await compare.save();

    return res.status(200).json({
      message: "All compares cleared successfully.",
      compares: [],
    });
  } catch (error) {
    console.error("❌ Error clearing compares:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


// UPDATE FAVORITE ITEM VARIANT (COLOR, SIZE, IMAGE)
const updateFavoriteVariantAction = async (req, res) => {
  const userId = req.user?._id;
  const { itemId } = req.params;
  try {
    const { selectedColor, selectedImage, selectedSize } = req.body;

    if (!userId || !itemId) {
      return res.status(400).json({ message: "userId and itemId are required" });
    }

    const favorite = await Favorite.findOne({ userId });
    if (!favorite) {
      return res.status(404).json({ message: "Favorite list not found for user" });
    }

    // Find product in favorites
    const productIndex = favorite.favoriteProducts.findIndex(
      (p) => String(p._id) === String(itemId)
    );

    if (productIndex === -1) {
      return res.status(404).json({ message: "Item not found in favorites list" });
    }

    // Update only provided fields
    if (selectedColor !== undefined)
      favorite.favoriteProducts[productIndex].selectedColor = selectedColor;
    if (selectedImage !== undefined)
      favorite.favoriteProducts[productIndex].selectedImage = selectedImage;
    if (selectedSize !== undefined)
      favorite.favoriteProducts[productIndex].selectedSize = selectedSize;

    await favorite.save();

    res.status(200).json({
      message: "Favorite product variant updated successfully",
      favorite: favorite.favoriteProducts[productIndex],
    });
  } catch (error) {
    console.error("Error updating favorite variant:", error);
    res.status(500).json({ message: "Internal server error", error });
  }
};


// UPDATE COMPARE ITEM VARIANT (COLOR, SIZE, IMAGE)
const updateCompareVariantAction = async (req, res) => {

  const userId = req.user?._id;
  const { itemId } = req.params;
  try {
    const { selectedColor, selectedImage, selectedSize } = req.body;

    if (!userId || !itemId) {
      return res.status(400).json({ message: "userId and itemId are required" });
    }

    const compare = await Compare.findOne({ userId });
    if (!compare) {
      return res.status(404).json({ message: "Compare list not found for user" });
    }

    // Find item in compares
    const itemIndex = compare.compareProducts.findIndex(
      (p) => String(p._id) === String(itemId)
    );

    if (itemIndex === -1) {
      return res.status(404).json({ message: "Item not found in compares list" });
    }

    // Update only provided fields
    if (selectedColor !== undefined)
      compare.compareProducts[itemIndex].selectedColor = selectedColor;
    if (selectedImage !== undefined)
      compare.compareProducts[itemIndex].selectedImage = selectedImage;
    if (selectedSize !== undefined)
      compare.compareProducts[itemIndex].selectedSize = selectedSize;

    await compare.save();

    res.status(200).json({
      message: "Compare item variant updated successfully",
      compare: compare.compareProducts[itemIndex],
    });
  } catch (error) {
    console.error("Error updating compare variant:", error);
    res.status(500).json({ message: "Internal server error", error });
  }
};

module.exports = {
  createProduct,
  sendProductVerificationEmail,
  verifyProduct,
  getProducts,
  getUserProduct,
  getFeaturedproducts,
  getShowProducts,
  getRelatedProducts,
  getProduct,
  deleteProduct,
  updateProduct,
  commentItem,
  replyItem,
  editComment,
  deleteComment,
  rateProduct,
  addToFavorite,
  removeFromFavorite,
  clearProductFavorites,
  addToCompare,
  removeFromCompare,
  clearProductCompares,
  updateFavoriteVariantAction,
  updateCompareVariantAction,
  getUserCompares,
  getUserFavorites,
};