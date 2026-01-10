const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const cors = require('cors'); // 1. Added CORS import
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors()); // 2. Enable CORS so your browser allows the request
app.use(bodyParser.json());
app.use(express.static('.'));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('>>> NEBULA_SYSTEM: Connected to MongoDB [Database: nebula]'))
  .catch(err => {
    console.error('!!! NEBULA_ERROR: Connection failed:', err);
  });

// Schema for Roster Data (Updated to force 'roster' collection name)
const rosterSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  message: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});
const Roster = mongoose.model('Roster', rosterSchema, 'roster');

// API Endpoint
app.post('/api/roster', async (req, res) => {
  const { name, email, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ message: 'All fields are required.' });
  }

  try {
    const newEntry = new Roster({ name, email, message });
    await newEntry.save();
    console.log('Data saved to DB:', newEntry);
    res.status(200).json({ message: 'Successfully joined the roster!' });
  } catch (error) {
    console.error('DB save error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
});
 // GET route to fetch all entries for the Admin Panel
app.get('/api/roster', async (req, res) => {
    try {
        const entries = await Roster.find().sort({ timestamp: -1 }); // Newest first
        res.status(200).json(entries);
    } catch (error) {
        console.error('Fetch error:', error);
        res.status(500).json({ message: 'Failed to fetch data' });
    }
});

// Add this right before app.listen
app.get('/', (req, res) => {
  res.status(200).send('NEBULA System Online');
});

app.listen(PORT, '0.0.0.0', () => { // Added '0.0.0.0' for better binding
  console.log(`Server running on port ${PORT}`);
});