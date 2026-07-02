const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const sendEmail = require('../utils/sendEmail');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');

const prisma = new PrismaClient();

const register = async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({ message: 'This email is already registered' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
      },
    });

    // (Aici este partea de sus a funcției, unde se creează user-ul...)
    
    // Generăm un token de anulare valabil 24 de ore
    const cancelToken = jwt.sign(
      { userId: newUser.id, action: 'cancel_registration' },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    const cancelUrl = `http://localhost:5173/cancel-account/${cancelToken}`;

    const htmlEmail = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #030712; color: #ffffff; padding: 40px; border-radius: 24px; border: 1px solid #1f2937;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #3b82f6; margin: 0; font-size: 28px;">InvestPro</h1>
        </div>
        <h2 style="font-size: 22px; font-weight: 700; margin-bottom: 20px; text-align: center; color: #10b981;">Welcome to InvestPro!</h2>
        <p style="font-size: 16px; line-height: 1.6; color: #cbd5e1;">Hello ${newUser.name || 'Investor'},</p>
        <p style="font-size: 16px; line-height: 1.6; color: #cbd5e1;">Your account has been successfully created. We are thrilled to have you on board!</p>
        
        <div style="text-align: center; margin: 35px 0;">
          <a href="http://localhost:5173/login" style="background-color: #3b82f6; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px; display: inline-block;">Access Your Account</a>
        </div>

        <div style="background-color: #0f172a; padding: 20px; border-radius: 16px; margin: 25px 0; border: 1px solid #1f2937;">
          <p style="color: #94a3b8; margin: 0 0 15px 0; font-size: 14px; text-align: center;">If you did not create this account, someone might have used your email address by mistake. You can remove it securely below.</p>
          <div style="text-align: center;">
            <a href="${cancelUrl}" style="color: #ef4444; text-decoration: underline; font-size: 14px; font-weight: 600;">Click here to securely delete this account</a>
          </div>
        </div>
      </div>
    `;

    // ... restul codului de creare user ...

    try {
      await sendEmail({
        email: newUser.email,
        subject: 'Welcome to InvestPro - Account Created',
        html: htmlEmail
      });
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
    }


    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        balance: newUser.balance
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const cancelRegistration = async (req, res) => {
  try {
    const { token } = req.params;
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (decoded.action !== 'cancel_registration') {
      return res.status(400).json({ message: 'Invalid token action' });
    }

    try {
      await prisma.user.delete({ where: { id: decoded.userId } });
      return res.status(200).json({ message: 'Account successfully deleted. You will no longer receive emails from us.' });
    } catch (dbError) {
      if (dbError.code === 'P2025') {
        
        return res.status(200).json({ message: 'Account was already deleted.' });
      }
      throw dbError;
    }

  } catch (error) {
    console.error(error);
    res.status(400).json({ message: 'Invalid or expired cancellation link.' });
  }
};

const login = async (req, res) => {
  try {
    const { email, password, trustedDeviceToken } = req.body;
    
    const user = await prisma.user.findUnique({ 
      where: { email } 
    });

    if (!user || !user.password || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    let require2FA = user.isTwoFactorEnabled;

    if (require2FA && trustedDeviceToken) {
      try {
        const decoded = jwt.verify(trustedDeviceToken, process.env.JWT_SECRET);
        if (decoded.trustedDevice && decoded.userId === user.id) {
          require2FA = false;
        }
      } catch (err) {}
    }

    if (require2FA) {
      return res.json({ 
        requires2FA: true, 
        userId: user.id
      });
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '30d' });
    
    res.json({ 
      token, 
      user: { 
        id: user.id, 
        name: user.name, 
        email: user.email, 
        currency: user.currency,
        profilePicture: user.profilePicture,
        balance: user.balance,
        isTwoFactorEnabled: user.isTwoFactorEnabled
      } 
    });
  } catch (error) {
    res.status(500).json({ message: 'Login failed' });
  }
};

const googleLogin = async (req, res) => {
  try {
    const { email, name, picture } = req.body;

    let user = await prisma.user.findUnique({ where: { email } });
    let isNewUser = false;

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          name,
          profilePicture: picture,
          password: 'GoogleLogin!123'
        }
      });
      isNewUser = true;
    } else if (!user.profilePicture && picture) {
      user = await prisma.user.update({
        where: { email },
        data: { profilePicture: picture }
      });
    }

    if (isNewUser) {
      const htmlEmail = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #030712; color: #ffffff; padding: 40px; border-radius: 24px; border: 1px solid #1f2937;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #3b82f6; margin: 0; font-size: 28px;">InvestPro</h1>
          </div>
          <h2 style="font-size: 22px; font-weight: 700; margin-bottom: 20px; text-align: center; color: #10b981;">Welcome to InvestPro!</h2>
          <p style="font-size: 16px; line-height: 1.6; color: #cbd5e1;">Hello ${user.name || 'Investor'},</p>
          <p style="font-size: 16px; line-height: 1.6; color: #cbd5e1;">Your account has been successfully created using Google Sign-In. We are thrilled to have you on board to start your trading journey!</p>
          
          <div style="text-align: center; margin: 35px 0;">
            <a href="http://localhost:5173/dashboard" style="background-color: #3b82f6; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px; display: inline-block;">Go to Dashboard</a>
          </div>

          <div style="background-color: #0f172a; padding: 20px; border-radius: 16px; margin: 25px 0; border: 1px solid #1f2937;">
            <p style="color: #94a3b8; margin: 0; font-size: 14px; text-align: center;">Since you authenticated securely via Google, your email is verified and your account is linked directly to your Google identity.</p>
          </div>
          
          <p style="font-size: 12px; color: #64748b; margin-top: 40px; text-align: center; border-top: 1px solid #1f2937; padding-top: 20px;">
            InvestPro Team © 2026. All rights reserved.
          </p>
        </div>
      `;

      try {
        await sendEmail({
          email: user.email,
          subject: 'Welcome to InvestPro - Registered via Google',
          html: htmlEmail
        });
      } catch (emailError) {
        console.error(emailError);
      }
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '30d' });

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        currency: user.currency,
        profilePicture: user.profilePicture,
        balance: user.balance,
        isTwoFactorEnabled: user.isTwoFactorEnabled
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Google login failed' });
  }
};

const verify2FALogin = async (req, res) => {
  try {
    const { userId, token: twoFactorCode, rememberMe } = req.body;
    
    const user = await prisma.user.findUnique({ where: { id: parseInt(userId) } });

    if (!user || !user.isTwoFactorEnabled) {
      return res.status(400).json({ message: 'Invalid request' });
    }

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: twoFactorCode
    });

    if (!verified) {
      return res.status(401).json({ message: 'Invalid 2FA code' });
    }

    const jwtToken = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '30d' });
    
    let trustedDeviceToken = null;
    if (rememberMe) {
      trustedDeviceToken = jwt.sign({ trustedDevice: true, userId: user.id }, process.env.JWT_SECRET, { expiresIn: '30d' });
    }
    
    res.json({ 
      token: jwtToken, 
      trustedDeviceToken,
      user: { 
        id: user.id, 
        name: user.name, 
        email: user.email, 
        currency: user.currency,
        profilePicture: user.profilePicture,
        balance: user.balance,
        isTwoFactorEnabled: user.isTwoFactorEnabled
      } 
    });
  } catch (error) {
    res.status(500).json({ message: '2FA verification failed' });
  }
};

const loginWithTrustedDevice = async (req, res) => {
  try {
    const { userId, trustedDeviceToken } = req.body;

    const decoded = jwt.verify(trustedDeviceToken, process.env.JWT_SECRET);
    if (!decoded.trustedDevice || decoded.userId !== parseInt(userId)) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    const user = await prisma.user.findUnique({ where: { id: parseInt(userId) } });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '30d' });

    res.json({ 
      token, 
      user: { 
        id: user.id, 
        name: user.name, 
        email: user.email, 
        currency: user.currency,
        profilePicture: user.profilePicture,
        balance: user.balance,
        isTwoFactorEnabled: user.isTwoFactorEnabled
      } 
    });
  } catch (error) {
    res.status(401).json({ message: 'Session expired' });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      // Returnam mereu 200 pentru a preveni user enumeration
      return res.status(200).json({ message: 'Email sent successfully' });
    }

    const resetToken = crypto.randomBytes(20).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000);

    await prisma.user.update({
      where: { email },
      data: {
        resetToken,
        resetTokenExpiry,
      },
    });

    const resetUrl = `http://localhost:5173/reset-password/${resetToken}`;

    const htmlEmail = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #030712; color: #ffffff; padding: 40px; border-radius: 24px; border: 1px solid #1f2937;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #3b82f6; margin: 0; font-size: 28px;">InvestPro</h1>
        </div>
        <h2 style="font-size: 22px; font-weight: 700; margin-bottom: 20px; text-align: center; color: #ffffff;">Password Reset Request</h2>
        <p style="font-size: 16px; line-height: 1.6; color: #cbd5e1;">Hello ${user.name},</p>
        <p style="font-size: 16px; line-height: 1.6; color: #cbd5e1;">We received a request to reset your password for your InvestPro account. Click the button below to choose a new password:</p>
        <div style="text-align: center; margin: 35px 0;">
          <a href="${resetUrl}" style="background-color: #3b82f6; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px; display: inline-block;">Reset Password</a>
        </div>
        <div style="background-color: #0f172a; padding: 20px; border-radius: 16px; margin: 25px 0; border: 1px solid #1f2937;">
          <p style="color: #94a3b8; margin: 0; font-size: 14px; text-align: center;">If you did not request a password reset, please ignore this email. Your account is safe and your password will not be changed.</p>
        </div>
        <p style="font-size: 12px; color: #64748b; margin-top: 40px; text-align: center; border-top: 1px solid #1f2937; padding-top: 20px;">
          InvestPro Team © 2026. All rights reserved.
        </p>
      </div>
    `;

    try {
      await sendEmail({
        email: user.email,
        subject: 'Password Reset - InvestPro',
        html: htmlEmail
      });

      res.status(200).json({ message: 'Email sent successfully' });
    } catch (error) {
      await prisma.user.update({
        where: { email },
        data: {
          resetToken: null,
          resetTokenExpiry: null,
        },
      });
      console.error(error);
      return res.status(500).json({ message: 'Error sending email' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error processing request' });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    res.status(200).json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error resetting password' });
  }
};

const updateUser = async (req, res) => {
  try {
    const { userId, name, currency, profilePicture } = req.body;

    const updatedUser = await prisma.user.update({
      where: { id: parseInt(userId) },
      data: { name, currency, profilePicture },
    });

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        currency: updatedUser.currency,
        profilePicture: updatedUser.profilePicture,
        balance: updatedUser.balance,
        isTwoFactorEnabled: updatedUser.isTwoFactorEnabled
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error updating profile' });
  }
};

const changePassword = async (req, res) => {
  try {
    const { userId, currentPassword, newPassword } = req.body;
    
    const user = await prisma.user.findUnique({ where: { id: parseInt(userId) } });
    
    if (!user || !user.password || !(await bcrypt.compare(currentPassword, user.password))) {
      return res.status(401).json({ message: 'Invalid current password' });
    }
    
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    await prisma.user.update({
      where: { id: parseInt(userId) },
      data: { password: hashedPassword },
    });
    
    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error updating password' });
  }
};

const deleteAccount = async (req, res) => {
  try {
    const rawId = req.params.id || req.params.userId;
    const id = parseInt(rawId);

    if (isNaN(id)) {
      return res.status(400).json({ message: 'Invalid ID format' });
    }

    const { password, twoFactorCode } = req.body;

    const user = await prisma.user.findUnique({ where: { id } });
    
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Utilizatorii Google au password null (sau cu "Google!" pentru cei vechi)
    const isGoogleUser = !user.password || user.password.includes('Google!');
    if (!isGoogleUser) {
      if (!password) return res.status(400).json({ message: 'Password is required to delete account' });
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) return res.status(401).json({ message: 'Invalid password' });
    }

    if (user.isTwoFactorEnabled) {
      if (!twoFactorCode) return res.status(400).json({ message: '2FA code is required' });
      const verified = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: 'base32',
        token: twoFactorCode
      });
      if (!verified) return res.status(401).json({ message: 'Invalid 2FA code' });
    }

    const htmlEmail = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #030712; color: #ffffff; padding: 40px; border-radius: 24px; border: 1px solid #1f2937;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #3b82f6; margin: 0; font-size: 28px;">InvestPro</h1>
        </div>
        <h2 style="font-size: 22px; font-weight: 700; margin-bottom: 20px; text-align: center; color: #ef4444;">Account Deleted Successfully</h2>
        <p style="font-size: 16px; line-height: 1.6; color: #cbd5e1;">Hello ${user.name},</p>
        <p style="font-size: 16px; line-height: 1.6; color: #cbd5e1;">This is a confirmation that your InvestPro account has been permanently deleted as requested.</p>
        <div style="background-color: #0f172a; padding: 20px; border-radius: 16px; margin: 25px 0; border: 1px solid #ef4444;">
          <p style="color: #94a3b8; margin: 0; font-size: 14px; text-align: center;">All your personal data, transaction history, and portfolio details have been securely erased from our servers.</p>
        </div>
        <p style="font-size: 16px; line-height: 1.6; color: #cbd5e1; text-align: center;">We are sorry to see you go. If you ever decide to return, you will need to create a new account.</p>
        <p style="font-size: 12px; color: #64748b; margin-top: 40px; text-align: center; border-top: 1px solid #1f2937; padding-top: 20px;">
          InvestPro Team © 2026. All rights reserved.
        </p>
      </div>
    `;

    try {
      await sendEmail({
        email: user.email,
        subject: 'InvestPro - Account Deletion Confirmation',
        html: htmlEmail
      });
    } catch (mailErr) {}

    try { await prisma.portfolioHistory.deleteMany({ where: { userId: id } }); } catch (e) {}
    try { await prisma.portfolio.deleteMany({ where: { userId: id } }); } catch (e) {}
    try { await prisma.transaction.deleteMany({ where: { userId: id } }); } catch (e) {}
    try { await prisma.watchlist.deleteMany({ where: { userId: id } }); } catch (e) {}
    try { await prisma.priceAlert.deleteMany({ where: { userId: id } }); } catch (e) {}
    try { await prisma.autoOrder.deleteMany({ where: { userId: id } }); } catch (e) {}

    try {
      await prisma.user.delete({ where: { id } });
      res.json({ message: 'Account deleted successfully' });
    } catch (dbError) {
      if (dbError.code === 'P2025') {
        return res.json({ message: 'Account deleted successfully' });
      }
      throw dbError;
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error deleting account' });
  }
};

const generate2FA = async (req, res) => {
  try {
    const { userId } = req.body;
    const user = await prisma.user.findUnique({ where: { id: parseInt(userId) } });
    const secret = speakeasy.generateSecret({ name: `InvestPro (${user.email})` });

    await prisma.user.update({
      where: { id: parseInt(userId) },
      data: { twoFactorSecret: secret.base32 }
    });

    const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);
    res.json({ qrCodeUrl, secret: secret.base32 });
  } catch (error) {
    res.status(500).json({ message: 'Error generating 2FA' });
  }
};

const enable2FA = async (req, res) => {
  try {
    const { userId, token } = req.body;
    const user = await prisma.user.findUnique({ where: { id: parseInt(userId) } });

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: token
    });

    if (verified) {
      const updatedUser = await prisma.user.update({
        where: { id: parseInt(userId) },
        data: { isTwoFactorEnabled: true }
      });
      res.json({
        message: '2FA enabled successfully',
        user: {
          id: updatedUser.id,
          name: updatedUser.name,
          email: updatedUser.email,
          currency: updatedUser.currency,
          profilePicture: updatedUser.profilePicture,
          balance: updatedUser.balance,
          isTwoFactorEnabled: updatedUser.isTwoFactorEnabled
        }
      });
    } else {
      res.status(400).json({ message: 'Invalid 2FA code' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error enabling 2FA' });
  }
};

const disable2FA = async (req, res) => {
  try {
    const { userId } = req.body;
    const updatedUser = await prisma.user.update({
      where: { id: parseInt(userId) },
      data: { isTwoFactorEnabled: false, twoFactorSecret: null }
    });
    res.json({
      message: '2FA disabled successfully',
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        currency: updatedUser.currency,
        profilePicture: updatedUser.profilePicture,
        balance: updatedUser.balance,
        isTwoFactorEnabled: updatedUser.isTwoFactorEnabled
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error disabling 2FA' });
  }
};

module.exports = {
  register,
  login,
  googleLogin,
  forgotPassword,
  resetPassword,
  updateUser,
  changePassword,
  deleteAccount,
  generate2FA,
  enable2FA,
  disable2FA,
  verify2FALogin,
  loginWithTrustedDevice,
  cancelRegistration
};