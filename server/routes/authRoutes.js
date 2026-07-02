const express = require('express');
const router = express.Router();
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const { 
  register, 
  login, 
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
  
} = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/api/auth/google/callback"
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      let user = await prisma.user.findFirst({
        where: {
          OR: [
            { googleId: profile.id },
            { email: profile.emails[0].value }
          ]
        }
      });

      const photoUrl = profile.photos && profile.photos.length > 0 ? profile.photos[0].value : null;

      if (user) {
        if (!user.googleId || !user.profilePicture) {
          user = await prisma.user.update({
            where: { id: user.id },
            data: { 
              googleId: profile.id,
              profilePicture: user.profilePicture || photoUrl
            }
          });
        }
      } else {
        user = await prisma.user.create({
          data: {
            googleId: profile.id,
            name: profile.displayName,
            email: profile.emails[0].value,
            profilePicture: photoUrl,
            password: null
          }
        });
      }
      return done(null, user);
    } catch (error) {
      return done(error, null);
    }
  }
));

router.post('/register', register);
router.post('/login', login);
router.post('/forgotpassword', forgotPassword);
router.put('/resetpassword/:token', resetPassword);
router.post('/2fa/generate', requireAuth, generate2FA);
router.post('/2fa/enable', requireAuth, enable2FA);
router.post('/2fa/disable', requireAuth, disable2FA);
router.post('/login/2fa', verify2FALogin);
router.post('/login/trusted', loginWithTrustedDevice);

router.put('/update-profile', requireAuth, updateUser);
router.put('/change-password', requireAuth, changePassword);
router.delete('/delete-account/:id', requireAuth, deleteAccount);
router.delete('/cancel-registration/:token', cancelRegistration);

router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })
);

router.get('/profile/:id', requireAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: parseInt(req.params.id) },
      select: {
        id: true,
        name: true,
        email: true,
        balance: true,
        currency: true,
        profilePicture: true,
        googleId: true
      }
    });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching profile' });
  }
});

router.get('/google/callback', 
  passport.authenticate('google', { session: false, failureRedirect: `http://localhost:5173/login` }),
  (req, res) => {
    if (req.user.isTwoFactorEnabled) {
      return res.redirect(`http://localhost:5173/login?requires2FA=true&userId=${req.user.id}`);
    }

    const token = jwt.sign(
      { userId: req.user.id },
      process.env.JWT_SECRET, 
      { expiresIn: '1d' }
    );
    
    const safeUser = {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      currency: req.user.currency || 'USD',
      balance: req.user.balance,
      isTwoFactorEnabled: req.user.isTwoFactorEnabled
    };

    const userData = encodeURIComponent(JSON.stringify(safeUser));
    res.redirect(`http://localhost:5173/auth-success?token=${token}&user=${userData}`);
  }
);

module.exports = router;