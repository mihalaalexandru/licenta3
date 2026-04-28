const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const createAlert = async (req, res) => {
  try {
    const { userId, symbol, targetPrice, condition } = req.body;
    const alert = await prisma.priceAlert.create({
      data: { 
        userId: parseInt(userId), 
        symbol, 
        targetPrice: parseFloat(targetPrice), 
        condition 
      }
    });
    res.json(alert);
  } catch (error) {
    res.status(500).json({ message: 'Error creating alert' });
  }
};

const getAlerts = async (req, res) => {
  try {
    const { userId } = req.params;
    const alerts = await prisma.priceAlert.findMany({
      where: { userId: parseInt(userId) },
      orderBy: { createdAt: 'desc' }
    });
    res.json(alerts);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching alerts' });
  }
};

const deleteAlert = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.priceAlert.delete({ 
      where: { id: parseInt(id) } 
    });
    res.json({ message: 'Alert deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting alert' });
  }
};

module.exports = { createAlert, getAlerts, deleteAlert };