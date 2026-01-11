const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
const { google } = require('googleapis'); // Replaced nodemailer with googleapis

const app = express();
const PORT = process.env.PORT || 3000;

// --- 1. GMAIL API SETUP (Bypasses SMTP Blocks) ---
const oAuth2Client = new google.auth.OAuth2(
    process.env.CLIENT_ID,
    process.env.CLIENT_SECRET,
    'https://developers.google.com/oauthplayground'
);

oAuth2Client.setCredentials({ refresh_token: process.env.REFRESH_TOKEN });
const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });

// Helper function to send mail via HTTPS
async function sendMailViaAPI(toEmail, name) {
    const subject = 'NEBULA: Transmission Synchronized';
    const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
    
    // The raw email content
    const emailLines = [
        `From: "Nebula Systems" <${process.env.EMAIL_USER}>`,
        `To: ${toEmail}`,
        `Content-Type: text/html; charset=utf-8`,
        `MIME-Version: 1.0`,
        `Subject: ${utf8Subject}`,
        '',
        `<div style="background: #0a0a0c; color: #ffffff; padding: 20px; font-family: sans-serif; border: 2px solid #4f46e5; border-radius: 12px; max-width: 500px;">
            <h2 style="color: #4f46e5; margin-top: 0;">SYSTEM_UPDATE: Incoming Transmission</h2>
            <p>Hello Agent <b>${name}</b>,</p>
            <p>Your data packet has been successfully decrypted and uploaded to the <b>Nebula Roster</b> database.</p>
            <div style="background: #16161a; padding: 15px; border-radius: 8px; border-left: 4px solid #4f46e5;">
                <p style="margin: 0; font-size: 0.9em; color: #888;"><b>Status:</b> <span style="color: #4CAF50;">CONFIRMED</span></p>
                <p style="margin: 5px 0 0 0; font-size: 0.9em; color: #888;"><b>Identifier:</b> ${toEmail}</p>
            </div>
            <hr style="border: 0; border-top: 1px solid #333; margin: 20px 0;">
            <p style="font-size: 0.75em; color: #666; text-align: center;">This is an automated response from Nebula Core. Do not reply.</p>
        </div>`
    ];

    const message = emailLines.join('\r\n');
    const encodedMessage = Buffer.from(message)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

    try {
        await gmail.users.messages.send({
            userId: 'me',
            requestBody: { raw: encodedMessage }
        });
        console.log(">>> MAIL_SENT via API");
    } catch (err) {
        console.error("!!! MAIL_API_ERROR:", err.message);
    }
}

// --- 2. SECURITY MIDDLEWARE ---
const adminAuth = (req, res, next) => {
    const auth = { 
        login: process.env.ADMIN_USER || 'admin', 
        password: process.env.ADMIN_PASSWORD || 'Teamnebula@0987'
    };
    const b64auth = (req.headers.authorization || '').split(' ')[1] || '';
    const [login, password] = Buffer.from(b64auth, 'base64').toString().split(':');
    if (login && password && login === auth.login && password === auth.password) {
        return next();
    }
    res.set('WWW-Authenticate', 'Basic realm="401"');
    res.status(401).send('NEBULA_AUTH: Authentication required.');
};

// --- 3. MIDDLEWARE ---
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('.'));

// --- 4. MONGODB CONNECTION ---
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('>>> NEBULA_SYSTEM: Connected to MongoDB'))
  .catch(err => console.error('!!! NEBULA_ERROR:', err));

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

app.post('/api/roster', async (req, res) => {
  const { name, email, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ message: 'All fields required.' });
  }

  try {
    const newEntry = new Roster({ name, email, message });
    await newEntry.save();
    console.log('>>> DATA_CACHED:', newEntry.name);

    // Call the new API send function
    sendMailViaAPI(email, name);

    res.status(200).json({ message: 'Successfully joined the nebula!' });
  } catch (error) {
    console.error('DB save error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// --- 6. PROTECTED ADMIN ROUTES ---

// 6.1 Serve the Admin Panel
app.get('/admin.html', adminAuth, (req, res) => {
    res.sendFile(__dirname + '/admin.html');
});

// 6.2 Fetch All Roster Entries
app.get('/api/roster', adminAuth, async (req, res) => {
    try {
        const entries = await Roster.find().sort({ timestamp: -1 });
        res.status(200).json(entries);
    } catch (error) {
        console.error('Fetch error:', error);
        res.status(500).json({ message: 'Failed to fetch data' });
    }
});

// 6.3 NEW: Delete Specific Entry
app.delete('/api/roster/:id', adminAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const deletedEntry = await Roster.findByIdAndDelete(id);
        
        if (!deletedEntry) {
            return res.status(404).json({ message: 'Entry not found' });
        }

        console.log(`>>> DATA_PURGED: ${deletedEntry.name}`);
        res.status(200).json({ message: 'Target neutralized from roster.' });
    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({ message: 'Failed to delete data' });
    }
});

// --- 7. SYSTEM INITIALIZATION ---
app.listen(PORT, '0.0.0.0', () => {
  console.log(`>>> NEBULA_CORE: Active on port ${PORT}`);
});