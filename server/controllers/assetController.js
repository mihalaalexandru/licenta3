const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const prisma = new PrismaClient();

const { getCandles } = require('../utils/marketSimulator');

const getAssets = async (req, res) => {
  try {
    const assets = await prisma.asset.findMany();
    res.json(assets);
  } catch (error) {
    res.status(500).json({ message: 'Error la preluarea activelor' });
  }
};

const getAssetHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const timeframe = req.query.timeframe || '1m';

    const asset = await prisma.asset.findUnique({
      where: { id: parseInt(id) },
      select: { symbol: true }
    });

    if (!asset) {
      return res.status(404).json({ message: 'Activul nu a fost găsit' });
    }

    const candles = getCandles(asset.symbol, timeframe);
    res.json(candles);
  } catch (error) {
    console.error('Eroare la preluarea istoricului:', error);
    res.status(500).json({ message: 'Error la preluarea istoricului' });
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
