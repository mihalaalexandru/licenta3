const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Retinem pretul de deschidere al zilei pentru fiecare asset (in memorie)
// Resetat automat la miezul noptii pentru un change24h corect
const dailyOpenPrices = {};
let lastResetDay = new Date().getDate();

// Timeframes in seconds
const TIMEFRAMES = {
  '20s': 20,
  '1m':  60,
  '5m':  300,
  '15m': 900,
  '1h':  3600,
  '4h':  14400,
  '1d':  86400,
};
const MAX_CANDLES = 500;

const candleStore = {};

let _broadcastFn = null;
const setBroadcastFn = (fn) => { _broadcastFn = fn; };

const getCandleTime = (unixSec, intervalSec) =>
  Math.floor(unixSec / intervalSec) * intervalSec;

const updateCandle = (symbol, tfKey, price) => {
  const intervalSec = TIMEFRAMES[tfKey];
  const now = Math.floor(Date.now() / 1000);
  const candleTime = getCandleTime(now, intervalSec);

  if (!candleStore[symbol]) candleStore[symbol] = {};
  if (!candleStore[symbol][tfKey]) candleStore[symbol][tfKey] = [];

  const arr = candleStore[symbol][tfKey];
  const volume = Math.round(100 + Math.random() * 900);

  if (arr.length === 0 || arr[arr.length - 1].time !== candleTime) {
    const prevClose = arr.length > 0 ? arr[arr.length - 1].close : price;
    arr.push({ time: candleTime, open: prevClose, high: price, low: price, close: price, volume });
    if (arr.length > MAX_CANDLES) arr.shift();
  } else {
    const c = arr[arr.length - 1];
    c.close = price;
    c.high = Math.max(c.high, price);
    c.low  = Math.min(c.low,  price);
    c.volume += volume;
  }

  if (_broadcastFn) {
    _broadcastFn(symbol, tfKey, arr[arr.length - 1]);
  }
};

const simulateMarket = async () => {
  try {
    // Reset zilnic la miezul noptii
    const today = new Date().getDate();
    if (today !== lastResetDay) {
      Object.keys(dailyOpenPrices).forEach(k => delete dailyOpenPrices[k]);
      lastResetDay = today;
    }

    const assets = await prisma.asset.findMany();

    for (const asset of assets) {
      // Initializam pretul de deschidere al zilei pentru acest asset
      if (!dailyOpenPrices[asset.id]) {
        dailyOpenPrices[asset.id] = asset.currentPrice;
      }

      const volatility = asset.type === 'CRYPTO' ? 0.0015 : 0.0005;
      const randomMove = asset.currentPrice * (Math.random() * (volatility * 2) - volatility);
      let newPrice = asset.currentPrice + randomMove;
      if (newPrice <= 0) newPrice = asset.currentPrice;

      // change24h = variatie procentuala fata de pretul de deschidere al zilei
      const openPrice = dailyOpenPrices[asset.id];
      const newChange24h = ((newPrice - openPrice) / openPrice) * 100;

      await prisma.asset.update({
        where: { id: asset.id },
        data: { 
          currentPrice: newPrice, 
          change24h: newChange24h }
      });

      for (const tfKey of Object.keys(TIMEFRAMES)) {
        updateCandle(asset.symbol, tfKey, newPrice);
      }
    }
  } catch (error) {
    console.error('Eroare in simularea live:', error.message);
  }
};

const getCandles = (symbol, timeframe) => {
  return (candleStore[symbol] && candleStore[symbol][timeframe]) || [];
};

const startSimulator = async () => {
  console.log(' Simulatorul de piata a pornit ');
  setInterval(simulateMarket, 3000);
};

module.exports = { startSimulator, getCandles, setBroadcastFn, TIMEFRAMES };
