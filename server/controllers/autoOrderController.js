const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const createAutoOrder = async (req, res) => {
  try {
    const { userId, assetId, symbol, type, targetPrice, quantity } = req.body;
    const order = await prisma.autoOrder.create({
      data: {
        userId: parseInt(userId),
        assetId: parseInt(assetId),
        symbol,
        type,
        targetPrice: parseFloat(targetPrice),
        quantity: parseFloat(quantity)
      }
    });
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: 'Error creating auto order' });
  }
};

const getAutoOrders = async (req, res) => {
  try {
    const { userId } = req.params;
    const orders = await prisma.autoOrder.findMany({
      where: { userId: parseInt(userId), status: 'PENDING' },
      orderBy: { createdAt: 'desc' }
    });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching auto orders' });
  }
};

const cancelAutoOrder = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.autoOrder.delete({ where: { id: parseInt(id) } });
    res.json({ message: 'Order cancelled' });
  } catch (error) {
    res.status(500).json({ message: 'Error cancelling order' });
  }
};

module.exports = { createAutoOrder, getAutoOrders, cancelAutoOrder };