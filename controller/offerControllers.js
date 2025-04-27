const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

exports.addOffer = async (req, res) => {
  const { orderData, paymentMethod, transactionUrl, userId } = req.body;
  const {
    phoneNo,
    price,
    address,
    products: orderProducts,
    orderDate,
  } = orderData;

  try {
    if (
      !userId ||
      !phoneNo ||
      !paymentMethod ||
      !transactionUrl ||
      !price ||
      !address ||
      !orderProducts ||
      !Array.isArray(orderProducts) ||
      orderProducts.length === 0
    ) {
      throw new Error("Missing or invalid details!");
    }

    const validProducts = orderProducts.filter(
      (product) => product.productId && product.quantity
    );
    if (validProducts.length !== orderProducts.length) {
      throw new Error(
        "All product entries must have valid productId and quantity."
      );
    }

    const newOrder = await prisma.orders.create({
      data: {
        ordererId: userId,
        address,
        phoneNo,
        paymentMethod,
        price,
        orderDate: orderDate,
        transactionUrl: transactionUrl,
        orderItems: {
          create: validProducts.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
        },
      },
      include: { orderItems: true },
    });

    for (const item of orderProducts) {
      const product = await prisma.products.findUnique({
        where: { prodId: item.productId },
      });

      if (!product) {
        throw new Error(`Product with ID ${item.productId} not found.`);
      }
      
      console.log("product.stock", product.stock);
      console.log("item.quantity", item.quantity);
      if (product.stock < item.quantity) {
        throw new Error(
          `Not enough stock for product: ${product.name}. Available: ${product.stock}`
        );
      }

      await prisma.products.update({
        where: { prodId: item.productId },
        data: { stock: product.stock - item.quantity },
      });
    }
    return res
      .status(201)
      .json({ message: "Order placed successfully", order: newOrder });
  } catch (e) {
    console.error(e);
    return res.status(400).json({ error: e.message || "Something went wrong" });
  }
};

// exports.getOffer = async (req, res) => {
//   const userId = req.query.userId;
//   try {
//     const userOrders = await prisma.orders.findMany({
//       where: { ordererId: userId },
//       include: { orderItems: true }, // Ensure orderItems are fetched with order details
//     });
//     if (userOrders.length === 0) {
//       throw new Error("No orders found for the user");
//     }
//     return res.status(200).json({ orders: userOrders });
//   } catch (e) {
//     console.error(e);
//     return res.status(400).json({ error: e.message || "Something went wrong" });
//   }
// };

exports.getOffer = async (req, res) => {
  const userId = req.query.userId;
  try {
    const userOrders = await prisma.orders.findMany({
      where: { ordererId: userId },
      include: { orderItems: true },
    });

    // Segment orders by status
    const pending = userOrders.filter(order => order.approved === false);
    const approved = userOrders.filter(order => order.approved === true);

    // Segment by region (assuming address format is 'Region - ...')
    const kigali = userOrders.filter(order => order.address.startsWith('Kigali'));
    const north = userOrders.filter(order => order.address.startsWith('Northern'));
    const south = userOrders.filter(order => order.address.startsWith('Southern'));
    const east = userOrders.filter(order => order.address.startsWith('Eastern'));
    const west = userOrders.filter(order => order.address.startsWith('Western'));

    return res.status(200).json({
      orders: userOrders,
      pending,
      approved,
      kigali,
      north,
      south,
      east,
      west
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
