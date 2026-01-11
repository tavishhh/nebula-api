const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
const nodemailer = require('nodemailer');

// --- 1. EMAIL TRANSPORTER SETUP ---
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        type: 'OAuth2',
        user: process.env.EMAIL_USER,
        clientId: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET,
        refreshToken: process.env.REFRESH_TOKEN
    }
});

const app = express();
const PORT = process.env.PORT || 3000;

// --- 2. SECURITY MIDDLEWARE ---
const adminAuth = (req, res, next) => {
    const auth = { 
        login: process.env.ADMIN_USER || 'admin', 
        password: process.env.ADMIN_PASSWORD || 'nebula2026'
    };

    const b64auth = (req.headers.authorization || '').split(' ')[1] || '';
    const [login, password] = Buffer.from(b64auth, 'base64').toString().split(':');

    if (login && password && login === auth.login && password === auth.password) {
        return next();
    }

    res.set('WWW-Authenticate', 'Basic realm="401"');
    res.status(401).send('NEBULA_AUTH: Authentication required to access Orbit Control.');
};

// --- 3. MIDDLEWARE ---
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('.'));

// --- 4. MONGODB CONNECTION ---
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

// --- 5. PUBLIC ROUTES ---

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

// Deployment Endpoint - Now with Automated Email
app.post('/api/roster', async (req, res) => {
  const { name, email, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ message: 'All fields are required.' });
  }

  try {
    // Save to Database
    const newEntry = new Roster({ name, email, message });
    await newEntry.save();
    console.log('>>> DATA_CACHED:', newEntry.name);

    // Prepare Email Content
    const mailOptions = {
        from: `"Nebula Systems" <${process.env.EMAIL_USER}>`,
        to: email, 
        subject: 'NEBULA: Transmission Synchronized',
        html: `
            <div style="background: #0a0a0c; color: #ffffff; padding: 20px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; border: 2px solid #4f46e5; border-radius: 12px; max-width: 500px;">
                <h2 style="color: #4f46e5; margin-top: 0;">SYSTEM_UPDATE: Incoming Transmission</h2>
                <p>Hello Agent <b>${name}</b>,</p>
                <p>Your data packet has been successfully decrypted and uploaded to the <b>Nebula Roster</b> database.</p>
                <div style="background: #16161a; padding: 15px; border-radius: 8px; border-left: 4px solid #4f46e5;">
                    <p style="margin: 0; font-size: 0.9em; color: #888;"><b>Status:</b> <span style="color: #4CAF50;">CONFIRMED</span></p>
                    <p style="margin: 5px 0 0 0; font-size: 0.9em; color: #888;"><b>Identifier:</b> ${email}</p>
                </div>
                <hr style="border: 0; border-top: 1px solid #333; margin: 20px 0;">
                <p style="font-size: 0.75em; color: #666; text-align: center;">This is an automated response from Nebula Core. Do not reply.</p>
            </div>
        `
    };

    // Send Email (Don't use 'await' here so the user doesn't have to wait for the email server)
    transporter.sendMail(mailOptions, (err, info) => {
        if (err) console.error("!!! MAIL_ERROR:", err);
        else console.log(">>> MAIL_SENT:", info.response);
    });

    res.status(200).json({ message: 'Successfully joined the nebula!' });
  } catch (error) {
    console.error('DB save error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// --- 6. PROTECTED ADMIN ROUTES ---

app.get('/admin.html', adminAuth, (req, res) => {
    res.sendFile(__dirname + '/admin.html');
});

app.get('/api/roster', adminAuth, async (req, res) => {
    try {
        const entries = await Roster.find().sort({ timestamp: -1 });
        res.status(200).json(entries);
    } catch (error) {
        console.error('Fetch error:', error);
        res.status(500).json({ message: 'Failed to fetch data' });
    }
});

// --- 7. SYSTEM INITIALIZATION ---
app.listen(PORT, '0.0.0.0', () => {
  console.log(`>>> NEBULA_CORE: Active on port ${PORT}`);
});