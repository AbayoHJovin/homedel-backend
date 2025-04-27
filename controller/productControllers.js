const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const cloudinary = require("cloudinary").v2;

exports.getProducts = async (req, res) => {
  try {
    const products = await prisma.products.findMany({
      include: { images: true }, // Include related images
    });
    return res.json(products);
  } catch (error) {
    res.status(500).json({ error: "Error fetching products" });
  }
};


exports.addProduct = async (req, res) => {
  try {
    const {
      name,
      description,
      price,
      gender,
      category,
      stock = 0,
      popular = false,
      mainImageIndex = 0, // Default to 0 if not provided
    } = req.body;

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "At least one image is required" });
    }

    const uploadPromises = req.files.map((file) =>
      new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          { resource_type: "image", folder: "products" },
          (error, result) => {
            if (error) reject(error);
            else resolve(result.secure_url);
          }
        );
        uploadStream.end(file.buffer);
      })
    );
    const imageUrls = await Promise.all(uploadPromises);

    const newProduct = await prisma.products.create({
      data: {
        prodName: name,
        prodDescription: description,
        price: parseInt(price, 10),
        gender: gender,
        category: category,
        stock: parseInt(stock, 10),
        popular: popular === "true",
        images: {
          create: imageUrls.map((url, index) => ({
            imageUrl: url,
            isMain: index === parseInt(mainImageIndex), // Respect mainImageIndex
            position: index,
          })),
        },
      },
      include: { images: true },
    });

    res.status(201).json(newProduct);
  } catch (error) {
    console.error("Error adding product:", error);
    res.status(500).json({ error: "Error adding product" });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const { prodId } = req.params;
    const {
      name,
      description,
      price,
      gender,
      category,
      stock,
      popular,
      mainImageIndex, // Optional, only used if new images are uploaded
    } = req.body;

    if (!prodId) {
      throw new Error("No product id provided");
    }

    let imageData = {};
    if (req.files && req.files.length > 0) {
      const uploadPromises = req.files.map((file) =>
        new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            { resource_type: "image", folder: "products" },
            (error, result) => {
              if (error) reject(error);
              else resolve(result.secure_url);
            }
          );
          uploadStream.end(file.buffer);
        })
      );
      const imageUrls = await Promise.all(uploadPromises);

      // Delete old images only if new ones are uploaded
      const oldImages = await prisma.productImages.findMany({
        where: { productId: prodId },
      });
      const deletePromises = oldImages.map((img) =>
        cloudinary.uploader.destroy(img.imageUrl.split("/").slice(-1)[0].split(".")[0])
      );
      await Promise.all(deletePromises);
      await prisma.productImages.deleteMany({ where: { productId: prodId } });

      imageData = {
        images: {
          create: imageUrls.map((url, index) => ({
            imageUrl: url,
            isMain: index === parseInt(mainImageIndex || 0), // Use mainImageIndex if provided
            position: index,
          })),
        },
      };
    }

    const updatedProduct = await prisma.products.update({
      where: { prodId: prodId },
      data: {
        prodName: name,
        prodDescription: description,
        price: parseInt(price, 10),
        gender,
        category,
        stock: parseInt(stock, 10),
        popular: popular === "true",
        ...imageData,
      },
      include: { images: true },
    });

    res.status(200).json(updatedProduct);
  } catch (error) {
    console.error("Error updating product:", error);
    res.status(500).json({ error: "Failed to update product" });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const product = await prisma.products.findUnique({
      where: { prodId: req.params.id },
      include: { images: true },
    });

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    // Delete images from Cloudinary
    const deletePromises = product.images.map((img) =>
      cloudinary.uploader.destroy(img.imageUrl.split("/").slice(-1)[0].split(".")[0])
    );
    await Promise.all(deletePromises);

    // Delete product (cascades to delete related images due to ON DELETE CASCADE)
    await prisma.products.delete({
      where: { prodId: req.params.id },
    });

    res.status(200).json({ message: "Product and images deleted" });
  } catch (error) {
    console.error("Error deleting product:", error);
    res.status(500).json({ error: error.message || "Error deleting product" });
  }
};

exports.makeAPopularProduct = async (req, res) => {
  const prodId = req.query.prodId;
  const popularity = req.headers.popularity === "true";

  try {
    if (!prodId || popularity === undefined) {
      throw new Error("Please send all required fields");
    }

    await prisma.products.update({
      where: { prodId: prodId },
      data: { popular: popularity },
    });

    return res.status(200).json({ message: "Product updated successfully" });
  } catch (e) {
    console.error(e.message);
    return res.status(500).json({ message: e.message || "Something went wrong" });
  }
};

exports.getpopularProducts = async (req, res) => {
  try {
    const popularProds = await prisma.products.findMany({
      where: { popular: true },
      include: { images: true }, // Include images
    });
    if (!popularProds.length) {
      throw new Error("No popular products");
    }
    return res.status(200).json({ data: popularProds });
  } catch (e) {
    return res.status(500).json({ data: e.message || "Something went wrong" });
  }
};