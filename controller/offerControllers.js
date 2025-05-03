const { PrismaClient } = require("@prisma/client");
const { extractUserId, extractAdminStatus } = require("../auth/tokens");
const prisma = new PrismaClient();
exports.addOffer = async (req, res) => {
  const { orderData, userId } = req.body;
  const {
    phoneNo,
    address,
    street,
    latitude,
    longitude,
    mapAddress,
    products: orderProducts,
    orderDate,
  } = orderData;

  try {
    if (
      !userId ||
      !phoneNo ||
      !address ||
      !latitude ||
      !longitude ||
      !street ||
      !orderProducts ||
      !Array.isArray(orderProducts) ||
      orderProducts.length === 0
    ) {
      throw new Error("Missing or invalid details!");
    }

    // Phone number validation
    if (!/^\+?[0-9]{10,15}$/.test(phoneNo)) {
      throw new Error("Invalid phone number format");
    }

    if (
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      throw new Error("Invalid coordinates");
    }

    // Address and street validation
    if (address.length > 255) {
      throw new Error("Address is too long");
    }

    if (street && street.length > 255) {
      throw new Error("Street information is too long");
    }

    // Validate products
    const validProducts = orderProducts.filter(
      (product) => product.productId && product.quantity
    );

    if (validProducts.length !== orderProducts.length) {
      throw new Error(
        "All product entries must have valid productId and quantity."
      );
    }

    // Validate stock availability — DO NOT REDUCE STOCK YET
    for (const item of validProducts) {
      const product = await prisma.products.findUnique({
        where: { prodId: item.productId },
      });

      if (!product) {
        throw new Error(`Product with ID ${item.productId} not found.`);
      }

      if (product.stock < item.quantity) {
        throw new Error(
          `Not enough stock for product: ${product.prodName}. Available: ${product.stock}`
        );
      }
    }

    // Create order with PENDING payment and status
    const newOrder = await prisma.orders.create({
      data: {
        ordererId: userId,
        address,
        phoneNo,
        orderDate,
        latitude,
        mapAddress,
        longitude,
        street,
        orderStatus: "PENDING",
        paymentStatus: "PENDING",
        orderItems: {
          create: validProducts.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
        },
      },
      include: {
        orderItems: {
          include: {
            product: true,
          },
        },
      },
    });

    return res.status(201).json({
      message: "Order placed successfully. Awaiting payment.",
      order: newOrder,
    });
  } catch (e) {
    console.error(e);
    return res.status(400).json({ error: e.message || "Something went wrong" });
  }
};

exports.getOffer = async (req, res) => {
  const userId = req.query.userId;
  try {
    const userOrders = await prisma.orders.findMany({
      where: { ordererId: userId },
      include: {
        orderItems: {
          select: {
            productId: true,
            quantity: true,
            product: {
              select: {
                prodId: true,
              },
            },
          },
        },
        transaction: true,
      },
    });

    // Segment orders by status
    const pending = userOrders.filter(
      (order) => order.paymentStatus === "PENDING"
    );
    const paid = userOrders.filter((order) => order.paymentStatus === "PAID");

    // Segment by region (assuming address format is 'Region - ...')
    const kigali = userOrders.filter((order) =>
      order.address.startsWith("Kigali")
    );
    const north = userOrders.filter((order) =>
      order.address.startsWith("Northern")
    );
    const south = userOrders.filter((order) =>
      order.address.startsWith("Southern")
    );
    const east = userOrders.filter((order) =>
      order.address.startsWith("Eastern")
    );
    const west = userOrders.filter((order) =>
      order.address.startsWith("Western")
    );

    return res.status(200).json({
      orders: userOrders,
      pending,
      paid,
      // kigali,
      // north,
      // south,
      // east,
      // west,
    });
  } catch (e) {
    console.error(e);
    return res.status(400).json({ error: e.message || "Something went wrong" });
  }
};


exports.approveOffer = async (req, res) => {
  const { offerId } = req.query;

  try {
    if (!offerId) throw new Error("Offer ID is required");

    const updatedOrder = await prisma.orders.update({
      where: { orderId: offerId },
      data: { approved: true },
    });

    return res
      .status(200)
      .json({ message: "Offer approved successfully", order: updatedOrder });
  } catch (e) {
    console.error(e);
    return res.status(400).json({ error: e.message || "Something went wrong" });
  }
};

exports.changeOrderStatus = async (req, res) => {
  const { orderId, status } = req.body;
  const token = req.cookies.adminAuth;
 try {
    if (!token) {
        return res.status(401).json({ error: "Unauthorized" });
      }
    const isAdmin = extractAdminStatus(token);
    if (!isAdmin) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    if (!orderId || !status) throw new Error("Order ID and status are required");

    const updatedOrder = await prisma.orders.update({
      where: { orderId: orderId },
      data: { orderStatus: status },
    });

    return res.status(200).json({ message: "Order status updated successfully", order: updatedOrder });
  } catch (e) {
    console.error(e);
    return res.status(400).json({ error: e.message || "Something went wrong" });
  }
};  

exports.declineOffer = async (req, res) => {
  const { offerId } = req.query;

  try {
    if (!offerId) throw new Error("Offer ID is required");

    const existingOrder = await prisma.orders.findUnique({
      where: { orderId: offerId },
    });

    if (!existingOrder) {
      return res.status(404).json({ error: "Offer not found" });
    }
    const deleteOfferDependencies = await prisma.orderItem.deleteMany({
      where: {
        orderId: offerId,
      },
    });
    await prisma.orders.delete({
      where: { orderId: offerId },
    });

    return res.status(200).json({ message: "Offer removed successfully" });
  } catch (e) {
    console.error(e);
    return res.status(400).json({ error: e.message || "Something went wrong" });
  }
};
