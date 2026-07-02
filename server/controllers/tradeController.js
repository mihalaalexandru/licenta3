const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const depositFunds = async (req, res) => {
  try {
    const { userId, amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid amount' });
    }

    const updatedUser = await prisma.$transaction(async (prisma) => {
      const user = await prisma.user.update({
        where: { id: parseInt(userId) },
        data: { balance: { increment: parseFloat(amount) } }
      });
      
      await prisma.balanceHistory.create({
        data: { userId: user.id, balance: user.balance }
      });
      
      return user;
    });

    res.json({ message: 'Deposit successful', newBalance: updatedUser.balance });
  } catch (error) {
    res.status(500).json({ message: 'Error depositing funds' });
  }
};

const buyAsset = async (req, res) => {
  try {
    const { userId, assetId, quantity } = req.body;
    
    if (!quantity || parseFloat(quantity) <= 0) {
      return res.status(400).json({ message: 'Invalid quantity' });
    }

    const user = await prisma.user.findUnique({ where: { id: parseInt(userId) } });
    const asset = await prisma.asset.findUnique({ where: { id: parseInt(assetId) } });

    if (!user || !asset) {
      return res.status(404).json({ message: 'User or asset not found' });
    }

    const totalCost = asset.currentPrice * parseFloat(quantity);

    if (user.balance < totalCost) {
      return res.status(400).json({ message: 'Insufficient balance' });
    }

    const newBalance = user.balance - totalCost;

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { balance: newBalance }
      }),
      prisma.portfolio.upsert({
        where: { userId_assetId: { userId: user.id, assetId: asset.id } },
        update: { quantity: { increment: parseFloat(quantity) } },
        create: { userId: user.id, assetId: asset.id, quantity: parseFloat(quantity) }
      }),
      prisma.transaction.create({
        data: {
          userId: user.id,
          assetId: asset.id,
          type: 'BUY',
          quantity: parseFloat(quantity),
          priceAtPurchase: asset.currentPrice
        }
      }),
      prisma.balanceHistory.create({
        data: { userId: user.id, balance: newBalance }
      })
    ]);

    res.json({ message: 'Purchase successful', newBalance });
  } catch (error) {
    res.status(500).json({ message: 'Transaction failed' });
  }
};

const sellAsset = async (req, res) => {
  try {
    const { userId, assetId, quantity } = req.body;
    const sellQty = parseFloat(quantity);

    if (!sellQty || sellQty <= 0) {
      return res.status(400).json({ message: 'Invalid quantity' });
    }

    const user = await prisma.user.findUnique({ where: { id: parseInt(userId) } });
    const asset = await prisma.asset.findUnique({ where: { id: parseInt(assetId) } });

    if (!user || !asset) {
      return res.status(404).json({ message: 'User or asset not found' });
    }

    const portfolioItem = await prisma.portfolio.findUnique({
      where: { userId_assetId: { userId: user.id, assetId: asset.id } }
    });

    if (!portfolioItem || portfolioItem.quantity < sellQty) {
      return res.status(400).json({ message: 'Insufficient asset quantity to sell' });
    }

    const totalRevenue = asset.currentPrice * sellQty;
    const newBalance = user.balance + totalRevenue;

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { balance: newBalance }
      }),
      prisma.portfolio.update({
        where: { id: portfolioItem.id },
        data: { quantity: { decrement: sellQty } }
      }),
      prisma.transaction.create({
        data: {
          userId: user.id,
          assetId: asset.id,
          type: 'SELL',
          quantity: sellQty,
          priceAtPurchase: asset.currentPrice
        }
      }),
      prisma.balanceHistory.create({
        data: { userId: user.id, balance: newBalance }
      })
    ]);

    res.json({ message: 'Sale successful', newBalance });
  } catch (error) {
    res.status(500).json({ message: 'Transaction failed' });
  }
};

const getTransactions = async (req, res) => {
  try {
    const { userId } = req.params;
    const transactions = await prisma.transaction.findMany({
      where: { userId: parseInt(userId) },
      include: { asset: true },
      orderBy: { date: 'desc' }
    });
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching transactions' });
  }
};

const withdrawFunds = async (req, res) => {
  try {
    const { userId, amount, method } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Suma trebuie să fie mai mare ca 0.' });
    }

    const user = await prisma.user.findUnique({ where: { id: parseInt(userId) } });

    if (!user) {
      return res.status(404).json({ message: 'Utilizator inexistent.' });
    }

    if (user.balance < amount) {
      return res.status(400).json({ message: 'Fonduri insuficiente pentru această retragere.' });
    }

    // Calculăm taxele conform realității
    let fee = 0;
    if (method === 'bank') {
      fee = 3.00; // Taxă fixă de 3$ pentru transfer bancar
    } else if (method === 'card') {
      fee = amount * 0.015; // 1.5% taxă pentru retragere instantă pe card
    }

    // Verificăm dacă suma acoperă măcar comisionul
    if (amount <= fee) {
      return res.status(400).json({ message: `Suma este prea mică. Taxa pentru această retragere este $${fee.toFixed(2)}.` });
    }

    // Scădem suma totală cerută din contul utilizatorului
    const newBalance = user.balance - amount;
    
    // Suma care îi ajunge efectiv în contul bancar (suma - taxa)
    const receivedAmount = amount - fee;

    await prisma.$transaction([
      prisma.user.update({
        where: { id: parseInt(userId) },
        data: { balance: newBalance }
      }),
      prisma.balanceHistory.create({
        data: { userId: parseInt(userId), balance: newBalance }
      })
    ]);

    res.json({ 
      message: 'Retragere procesată cu succes.',
      newBalance: newBalance,
      fee: fee,
      received: receivedAmount
    });

  } catch (error) {
    console.error("Eroare la retragere:", error);
    res.status(500).json({ message: 'Eroare la procesarea retragerii.' });
  }
};

module.exports = { depositFunds, buyAsset, sellAsset, getTransactions, withdrawFunds };