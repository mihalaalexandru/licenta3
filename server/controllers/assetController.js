const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const prisma = new PrismaClient();

const getAssets = async (req, res) => {
  try {
    const assets = await prisma.asset.findMany();
    res.json(assets);
  } catch (error) {
    res.status(500).json({ message: 'Error' });
  }
};

const getAssetHistory = async (req, res) => {
  try {
    const { id } = req.params;
    
    const history = await prisma.priceHistory.findMany({
      where: { assetId: parseInt(id) },
      orderBy: { id: 'desc' },
      take: 60 // MODIFICAT AICI: 60 de puncte (3 minute la interval de 3s)
    });

    const formattedHistory = history.reverse().map(record => ({
      time: new Date(record.createdAt).toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit' 
      }),
      price: Number(record.price)
    }));

    res.json(formattedHistory);
  } catch (error) {
    res.status(500).json({ message: 'Error' });
  }
};

const getMarketNews = async (req, res) => {
  try {
    const response = await axios.get('https://api.rss2json.com/v1/api.json?rss_url=https://finance.yahoo.com/news/rssindex');
    res.json(response.data.items);
  } catch (error) {
    res.status(500).json({ message: 'Error' });
  }
};

module.exports = { getAssets, getAssetHistory, getMarketNews };