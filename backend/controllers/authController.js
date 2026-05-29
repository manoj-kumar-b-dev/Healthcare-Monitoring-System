const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Helper to generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '30d',
  });
};

//  Register a new user

const register = async (req, res, next) => {
  try {
    const { username, email, password, age, weight, height, gender } = req.body;

    // Validation
    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Please provide username, email and password' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Please provide a valid email format' });
    }

    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Create user (password hashing is handled by the pre-save hook in User model) 
    const user = await User.create({
      username,
      email,
      password,
      age,
      weight,
      height,
      gender
    });

    if (user) {
      res.status(201).json({
        user: {
          _id: user._id,
          username: user.username,
          email: user.email,
          age: user.age,
          weight: user.weight,
          height: user.height,
          gender: user.gender
        },
        token: generateToken(user._id),
      });
    } else {
      res.status(400).json({ message: 'Invalid user data received' });
    }
  } catch (error) {
    next(error);
  }
};

//  Authenticate user & get token

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;  

    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    // We must manually select password as it is omitted in the schema by default
    const user = await User.findOne({ email }).select('+password');

    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    res.status(200).json({
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        age: user.age,
        weight: user.weight,
        height: user.height,
        gender: user.gender
      },
      token: generateToken(user._id),
    });
  } catch (error) {
    next(error);
  }
};

//  Get current logged in user
const getMe = async (req, res, next) => {
  try {
    // req.user is populated by the protect middleware
    res.status(200).json({ user: req.user });
  } catch (error) {
    next(error);
  }
};

// @ Logout user
const logout = (req, res, next) => {
  try {
    res.status(200).json({ message: 'User successfully logged out. Please clear your token on the client side.' });
  } catch (error) {
    next(error);
  }
};


module.exports = {
  register,
  login,
  getMe,
  logout
};
