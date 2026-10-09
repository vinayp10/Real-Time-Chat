const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

const setCookie = (res, token) => {
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

const register = async (req, res) => {
  try {
    const { username, email, password, displayName, publicKey } = req.body;

    const userExists = await User.findOne({ $or: [{ email }, { username }] });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      username,
      email,
      password: hashedPassword,
      displayName,
      publicKey: publicKey ? JSON.stringify(publicKey) : undefined,
    });

    const token = generateToken(user._id);
    setCookie(res, token);

    res.status(201).json({
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        avatar: user.avatar,
        about: user.about,
        publicKey: user.publicKey,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    user.isOnline = true;
    await user.save();

    const token = generateToken(user._id);
    setCookie(res, token);

    res.json({
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        avatar: user.avatar,
        about: user.about,
        publicKey: user.publicKey,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const logout = async (req, res) => {
  try {
    if (req.user) {
      const user = await User.findById(req.user._id);
      if (user) {
        user.isOnline = false;
        user.lastSeen = new Date();
        await user.save();
      }
    }

    res.cookie('token', '', {
      httpOnly: true,
      expires: new Date(0),
    });

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json({ user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getSession = async (req, res) => {
  const token = req.cookies.token || (
    req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.split(' ')[1]
      : null
  );

  if (!token) {
    return res.json({ user: null });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return res.json({ user: null });
  }

  try {
    const user = await User.findById(decoded.id).select('-password');
    return res.json({ user });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const admin = require('firebase-admin');
const { getAuth } = require('firebase-admin/auth');

const firebaseAdminOptions = {
  projectId: process.env.FIREBASE_PROJECT_ID || 'chat-app-a1381',
};

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  firebaseAdminOptions.credential = admin.credential.cert(
    JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
  );
} else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  firebaseAdminOptions.credential = admin.credential.applicationDefault();
}

admin.initializeApp(firebaseAdminOptions);

const firebaseLogin = async (req, res) => {
  try {
    const { idToken, publicKey } = req.body;
    if (typeof idToken !== 'string' || !idToken.trim()) {
      return res.status(400).json({ message: 'Firebase ID token is required.' });
    }

    const decodedToken = await getAuth().verifyIdToken(idToken);
    const { email, email_verified: emailVerified, name, picture, uid, phone_number: phoneNumber } = decodedToken;
    const verifiedEmail = emailVerified ? email : null;

    if (!uid || (!verifiedEmail && !phoneNumber)) {
      return res.status(401).json({ message: 'Firebase account must include a verified email or phone number' });
    }

    const identityMatches = [{ firebaseUid: uid }];
    if (phoneNumber) identityMatches.push({ phoneNumber });
    if (verifiedEmail) identityMatches.push({ email: verifiedEmail });

    let user = await User.findOne({ $or: identityMatches });

    if (!user) {
      const randomPassword = Math.random().toString(36).slice(-10);
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(randomPassword, salt);

      const usernameSeed = verifiedEmail
        ? verifiedEmail.split('@')[0]
        : `phone_${phoneNumber.replace(/\D/g, '')}`;
      let username = usernameSeed.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 24);
      const accountEmail = verifiedEmail || `phone-${uid}@phone.chatapp.invalid`;
      const usernameExists = await User.findOne({ username });
      if (usernameExists) {
        username = `${username.slice(0, 23)}_${uid.replace(/[^a-zA-Z0-9]/g, '').slice(0, 5)}`;
      }

      user = await User.create({
        username,
        email: accountEmail,
        password: hashedPassword,
        displayName: name || username,
        avatar: picture || undefined,
        firebaseUid: uid,
        phoneNumber: phoneNumber || undefined,
        publicKey: publicKey ? JSON.stringify(publicKey) : undefined,
      });
    } else {
      user.isOnline = true;
      user.firebaseUid = uid;
      if (phoneNumber) user.phoneNumber = phoneNumber;
      if (publicKey && !user.publicKey) {
        user.publicKey = JSON.stringify(publicKey);
      }
      await user.save();
    }

    const token = generateToken(user._id);
    setCookie(res, token);

    res.json({
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        phoneNumber: user.phoneNumber,
        displayName: user.displayName,
        avatar: user.avatar,
        about: user.about,
        publicKey: user.publicKey,
      },
    });
  } catch (error) {
    const tokenErrorMessages = {
      'auth/argument-error': 'Firebase rejected the token format. Sign in again with Google or phone.',
      'auth/invalid-id-token': 'Firebase rejected this ID token. Confirm the client and server use the same Firebase project.',
      'auth/id-token-expired': 'Firebase ID token expired. Sign in again.',
      'auth/project-not-found': 'Firebase project was not found. Check FIREBASE_PROJECT_ID.',
    };
    const isFirebaseAuthError = typeof error.code === 'string' && error.code.startsWith('auth/');
    const message = tokenErrorMessages[error.code]
      || (isFirebaseAuthError
        ? 'Firebase could not verify this ID token. Sign in again and confirm the Firebase project ID.'
        : 'Could not complete Firebase sign-in. Please try again.');

    console.error(`Firebase sign-in failed (${error.code || error.name})`);
    res.status(isFirebaseAuthError ? 401 : 500).json({ message });
  }
};

module.exports = {
  register,
  login,
  logout,
  getMe,
  getSession,
  firebaseLogin,
  googleLogin: firebaseLogin,
};
