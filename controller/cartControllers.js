const isAuth = require("../auth/isAuth");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
exports.addCartItem = async (req, res) => {
  const { userId, prodId } = req.body;
  try {
    if (!userId || !prodId) {
      throw new Error("User ID and Product ID are required.");
    }

    let userCart = await prisma.cart.findFirst({
      where: { ownerId: userId },
      include: { cartProducts: true },
    });

    if (!userCart) {
      userCart = await prisma.cart.create({
        data: {
          ownerId: userId,
          cartProducts: {
            create: [{ productId: prodId }],
          },
        },
      });
    } else {
      const existingProduct = userCart.cartProducts.find(
        (item) => item.productId === prodId
      );

      if (existingProduct) {
        throw new Error("Item already in cart.");
      }

      await prisma.cartProducts.create({
        data: {
          cartId: userCart.cartId,
          productId: prodId,
        },
      });
    }

    return res.status(201).json({ message: "Added to cart." });
  } catch (error) {
    return res
      .status(400)
      .json({ message: error.message || "Something went wrong." });
  }
};

exports.getCartItem = async (req, res) => {
  const { currentUser } = req.query;
  try {
    if (!currentUser) {
      return res.status(401).json({ message: "Not authorized." });
    }

    const cart = await prisma.cart.findFirst({
      where: { ownerId: currentUser },
      include: {
        cartProducts: {
          include: {
            product: {
              include: {
                images: true,
              }
            },
          },
        },
      },
    });

    if (!cart || cart.cartProducts.length === 0) {
      return res.status(404).json({ message: "No items in your cart." });
    }

    const processedCartProducts = cart.cartProducts.map(cartProduct => ({
      ...cartProduct,
      product: {
        ...cartProduct.product,
        mainImage: cartProduct.product.images.find(img => img.isMain)?.imageUrl || 
                  cartProduct.product.images[0]?.imageUrl
      }
    }));

    return res.status(200).json({ products: processedCartProducts });
  } catch (error) {
    return res
      .status(500)
      .json({ message: error.message || "Something went wrong." });
  }
};

exports.deleteCartItem = async (req, res) => {
  const { itemId, userId } = req.query;

  try {
    if (!itemId || !userId) {
      throw new Error("Product ID and User ID are required.");
    }

    // Find the user's cart
    const userCart = await prisma.cart.findUnique({
      where: { ownerId: userId },
    });

    if (!userCart) {
      throw new Error("Cart not found.");
    }

    // Delete the specific product from the cart
    const deleteResult = await prisma.cartProducts.deleteMany({
      where: {
        cartId: userCart.cartId,
        productId: itemId,
      },
    });

    if (deleteResult.count === 0) {
      throw new Error("Item not found in cart.");
    }

    return res.status(200).json({ message: "Item deleted successfully." });
  } catch (error) {
    return res
      .status(400)
      .json({ message: error.message || "Something went wrong." });
  }
};

exports.deleteAllCartItems = async (req, res) => {
  const { userId } = req.query;

  try {
    if (!userId) {
      throw new Error("User ID is required.");
    }

    const userCart = await prisma.cart.findUnique({
      where: { ownerId: userId },
    });

    if (!userCart) {
      throw new Error("Cart not found.");
    }

    await prisma.cartProducts.deleteMany({
      where: { cartId: userCart.cartId },
    });

    return res.status(200).json({ message: "Cart reset successfully." });
  } catch (error) {
    return res
      .status(400)
      .json({ message: error.message || "Something went wrong." });
  }
};
exports.updateCartItemsQuantity = async (req, res) => {
  const { userId, items } = req.body;

  try {
    console.log(userId, items);
    // Validate input
    if (!userId || !Array.isArray(items) || items.length === 0) {
      throw new Error("User   ID and a non-empty items array are required.");
    }

    // Fetch the user's cart and all products
    const [userCart, products] = await Promise.all([
      prisma.cart.findFirst({ where: { ownerId: userId } }),
      prisma.products.findMany(),
    ]);

    if (!userCart) {
      throw new Error("Cart not found.");
    }

    // Validate and update each item
    for (const item of items) {
      const { id, quantity } = item;

      // Validate individual item
      if (!id || quantity === undefined || quantity <= 0) {
        throw new Error(
          "Each item must have a valid ID and quantity greater than 0."
        );
      }

      // Find the cart product
      const cartProduct = await prisma.cartProducts.findFirst({
        where: { cartId: userCart.cartId, id },
      });

      if (!cartProduct) {
        throw new Error(`Cart product with ID ${id} not found.`);
      }

      // Match the product with the products table
      const matchedProduct = products.find(
        (product) => product.prodId === cartProduct.productId
      );

      if (!matchedProduct) {
        throw new Error(
          `Product with ID ${cartProduct.productId} does not exist.`
        );
      }

      // Check stock availability
      if (quantity > matchedProduct.stock) {
        throw new Error(
          `Insufficient stock for product.`
        );
      }
      await prisma.cartProducts.update({
        where: { id: cartProduct.id },
        data: { quantity },
      });
    }

    return res
      .status(200)
      .json({ message: "Cart items updated successfully." });
  } catch (error) {
    return res
      .status(401)
      .json({ message: error.message || "Something went wrong." });
  }
}