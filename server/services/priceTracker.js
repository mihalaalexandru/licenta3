const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const sendEmail = require('../utils/sendEmail');

const prisma = new PrismaClient();

const startPriceTracker = () => {
  cron.schedule('*/1 * * * *', async () => {
    try {
      const assets = await prisma.asset.findMany();
      const livePrices = {};
      assets.forEach(a => {
        livePrices[a.symbol] = a.currentPrice;
      });

      const alerts = await prisma.priceAlert.findMany({ include: { user: true } });
      for (const alert of alerts) {
        const currentPrice = livePrices[alert.symbol];
        if (!currentPrice) continue;

        let isTriggered = false;
        if (alert.condition === 'ABOVE' && currentPrice >= alert.targetPrice) isTriggered = true;
        if (alert.condition === 'BELOW' && currentPrice <= alert.targetPrice) isTriggered = true;

        if (isTriggered) {
          const htmlContent = `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #030712; color: #ffffff; padding: 40px; border-radius: 24px; border: 1px solid #1f2937;">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #3b82f6; margin: 0; font-size: 28px;">InvestPro</h1>
                <p style="color: #94a3b8; font-size: 14px;">Market Intelligence</p>
              </div>
              <h2 style="font-size: 22px; font-weight: 700; margin-bottom: 20px; text-align: center;">Price Alert Triggered! 🎯</h2>
              <p style="font-size: 16px; line-height: 1.6; color: #cbd5e1;">Hello ${alert.user.name},</p>
              <p style="font-size: 16px; line-height: 1.6; color: #cbd5e1;">Your price target for <strong>${alert.symbol}</strong> has been reached.</p>
              <div style="background-color: #0f172a; padding: 20px; border-radius: 16px; margin: 25px 0; border: 1px solid #3b82f6;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                  <span style="color: #94a3b8;">Asset:</span>
                  <span style="font-weight: 700;">${alert.symbol}</span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                  <span style="color: #94a3b8;">Current Price:</span>
                  <span style="font-weight: 700; color: #10b981;">$${currentPrice.toLocaleString()}</span>
                </div>
              </div>
              <div style="text-align: center; margin-top: 30px;">
                <a href="http://localhost:5173/dashboard" style="background-color: #3b82f6; color: #ffffff; padding: 14px 30px; border-radius: 12px; text-decoration: none; font-weight: 700; display: inline-block;">View Market Data</a>
              </div>
              <p style="font-size: 12px; color: #64748b; margin-top: 40px; text-align: center; border-top: 1px solid #1f2937; paddingTop: 20px;">
                InvestPro Team © 2026. All rights reserved.
              </p>
            </div>
          `;

          try {
            await sendEmail({ 
              email: alert.user.email, 
              subject: `Target Reached: ${alert.symbol} hit $${currentPrice.toFixed(2)}`, 
              html: htmlContent 
            });
            await prisma.priceAlert.delete({ where: { id: alert.id } });
          } catch (err) {}
        }
      }

      const pendingOrders = await prisma.autoOrder.findMany({ where: { status: 'PENDING' }, include: { user: true } });
      for (const order of pendingOrders) {
        const currentPrice = livePrices[order.symbol];
        if (!currentPrice) continue;

        let shouldExecute = false;
        if (order.type === 'BUY' && currentPrice <= order.targetPrice) shouldExecute = true;
        if (order.type === 'SELL' && currentPrice >= order.targetPrice) shouldExecute = true;

        if (shouldExecute) {
          try {
            const token = jwt.sign({ userId: order.userId }, process.env.JWT_SECRET, { expiresIn: '15m' });
            const config = { headers: { Authorization: `Bearer ${token}` } };

            if (order.type === 'BUY') {
              await axios.post('http://localhost:3000/api/trade/buy', { 
                userId: order.userId, 
                assetId: order.assetId, 
                quantity: order.quantity 
              }, config);
            } else {
              await axios.post('http://localhost:3000/api/trade/sell', { 
                userId: order.userId, 
                assetId: order.assetId, 
                quantity: order.quantity 
              }, config);
            }
            
            await prisma.autoOrder.update({ where: { id: order.id }, data: { status: 'EXECUTED' } });

            const htmlOrder = `
              <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #030712; color: #ffffff; padding: 40px; border-radius: 24px; border: 1px solid #1f2937;">
                <div style="text-align: center; margin-bottom: 30px;">
                  <h1 style="color: #3b82f6; margin: 0; font-size: 28px;">InvestPro</h1>
                </div>
                <h2 style="font-size: 22px; font-weight: 700; margin-bottom: 20px; text-align: center;">Order Executed Successfully! ✅</h2>
                <p style="font-size: 16px; line-height: 1.6; color: #cbd5e1;">Hello ${order.user.name},</p>
                <p style="font-size: 16px; line-height: 1.6; color: #cbd5e1;">Your automatic <strong>${order.type}</strong> order has been completed.</p>
                <div style="background-color: #0f172a; padding: 20px; border-radius: 16px; margin: 25px 0; border: 1px solid #10b981;">
                  <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                    <span style="color: #94a3b8;">Asset:</span>
                    <span style="font-weight: 700;">${order.quantity} ${order.symbol}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between;">
                    <span style="color: #94a3b8;">Execution Price:</span>
                    <span style="font-weight: 700; color: #3b82f6;">$${currentPrice.toLocaleString()}</span>
                  </div>
                </div>
                <div style="text-align: center; margin-top: 30px;">
                  <a href="http://localhost:5173/dashboard" style="background-color: #10b981; color: #ffffff; padding: 14px 30px; border-radius: 12px; text-decoration: none; font-weight: 700; display: inline-block;">View in Portfolio</a>
                </div>
                <p style="font-size: 12px; color: #64748b; margin-top: 40px; text-align: center; border-top: 1px solid #1f2937; padding-top: 20px;">
                  Thank you for trading with InvestPro.
                </p>
              </div>
            `;

            await sendEmail({ 
              email: order.user.email, 
              subject: `Trade Confirmed: ${order.type} ${order.symbol}`, 
              html: htmlOrder 
            });

          } catch (err) {
            console.error(`Error executing auto order ${order.id}:`, err.response?.data || err.message);
          }
        }
      }
    } catch (error) {
      console.error("Error in price tracker mechanism:", error);
    }
  });
};

module.exports = startPriceTracker;