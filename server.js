const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// --- 1. SECURITY MIDDLEWARE ---
const adminAuth = (req, res, next) => {
    // We use environment variables for the login credentials
    const auth = { 
        login: process.env.ADMIN_USER || 'admin', 
        password: process.env.ADMIN_PASSWORD || 'nebula2026' // Fallback for local testing
    };

    const b64auth = (req.headers.authorization || '').split(' ')[1] || '';
    const [login, password] = Buffer.from(b64auth, 'base64').toString().split(':');

    if (login && password && login === auth.login && password === auth.password) {
        return next();
    }

    res.set('WWW-Authenticate', 'Basic realm="401"');
    res.status(401).send('NEBULA_AUTH: Authentication required to access Orbit Control.');
};

// --- 2. MIDDLEWARE ---
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('.'));

// --- 3. MONGODB CONNECTION ---
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('>>> NEBULA_SYSTEM: Connected to MongoDB [Database: nebula]'))
  .catch(err => {
    console.error('!!! NEBULA_ERROR: Connection failed:', err);
  });

const rosterSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  message: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});
const Roster = mongoose.model('Roster', rosterSchema, 'roster');

// --- 4. PUBLIC ROUTES ---

// Main Landing Page (Index)
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

// Deployment Endpoint (For creators to join the orbit)
app.post('/api/roster', async (req, res) => {
  const { name, email, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ message: 'All fields are required.' });
  }

  try {
    const newEntry = new Roster({ name, email, message });
    await newEntry.save();
    console.log('>>> DATA_CACHED:', newEntry.name);
    res.status(200).json({ message: 'Successfully joined the nebula!' });
  } catch (error) {
    console.error('DB save error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// --- 5. PROTECTED ADMIN ROUTES ---

// Admin Panel File Access (Protected)
app.get('/admin.html', adminAuth, (req, res) => {
    res.sendFile(__dirname + '/admin.html');
});

// Admin Data API (Protected)
app.get('/api/roster', adminAuth, async (req, res) => {
    try {
        const entries = await Roster.find().sort({ timestamp: -1 });
        res.status(200).json(entries);
    } catch (error) {
        console.error('Fetch error:', error);
        res.status(500).json({ message: 'Failed to fetch data' });
    }
});

// --- 6. SYSTEM INITIALIZATION ---
app.listen(PORT, '0.0.0.0', () => {
  console.log(`>>> NEBULA_CORE: Active on port ${PORT}`);
});