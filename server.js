const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path'); 
require('dotenv').config();
const { google } = require('googleapis');

const app = express();
const PORT = process.env.PORT || 3000;

// --- 1. GMAIL API SETUP (The "Conductor" Communication) ---
const oAuth2Client = new google.auth.OAuth2(
    process.env.CLIENT_ID,
    process.env.CLIENT_SECRET,
    'https://developers.google.com/oauthplayground'
);
oAuth2Client.setCredentials({ refresh_token: process.env.REFRESH_TOKEN });
const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });

async function sendMailViaAPI(toEmail, name) {
    const subject = 'NEBULA: Transmission Synchronized';
    const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
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
            <p>Your data packet has been successfully decrypted and uploaded to the <b>Nebula Roster</b>.</p>
            <div style="background: #16161a; padding: 15px; border-radius: 8px; border-left: 4px solid #4f46e5;">
                <p style="margin: 0; font-size: 0.9em; color: #888;"><b>Status:</b> <span style="color: #4CAF50;">CONFIRMED</span></p>
                <p style="margin: 5px 0 0 0; font-size: 0.9em; color: #888;"><b>Identifier:</b> ${toEmail}</p>
            </div>
            <hr style="border: 0; border-top: 1px solid #333; margin: 20px 0;">
            <p style="font-size: 0.75em; color: #666; text-align: center;">Nebula Core Automated Response.</p>
        </div>`
    ];
    const message = emailLines.join('\r\n');
    const encodedMessage = Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    try {
        await gmail.users.messages.send({ userId: 'me', requestBody: { raw: encodedMessage } });
        console.log(">>> MAIL_SENT via API");
    } catch (err) { console.error("!!! MAIL_API_ERROR:", err.message); }
}

// --- 2. SECURITY MIDDLEWARE (The Gatekeeper) ---
const adminAuth = (req, res, next) => {
    const auth = { login: process.env.ADMIN_USER || 'admin', password: process.env.ADMIN_PASSWORD || 'Teamnebula@0987' };
    const b64auth = (req.headers.authorization || '').split(' ')[1] || '';
    const [login, password] = Buffer.from(b64auth, 'base64').toString().split(':');
    if (login === auth.login && password === auth.password) return next();
    res.set('WWW-Authenticate', 'Basic realm="Nebula Core Control"');
    res.status(401).send('NEBULA_AUTH: Authentication required.');
};

// --- 3. CORE MIDDLEWARE ---
app.use(cors({ origin: true, credentials: true, methods: ['GET', 'POST', 'DELETE', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization'] }));
app.use(bodyParser.json());
app.use(express.static('.')); // Serves index.html, css, etc.

// --- 4. DATABASE & SCALING SCHEMAS (The Architect) ---
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('>>> NEBULA_SYSTEM: Connected to MongoDB'))
  .catch(err => console.error('!!! NEBULA_ERROR:', err));

// Roster: For inbound leads (Agents/Creators)
const rosterSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true },
    message: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
});
const Roster = mongoose.model('Roster', rosterSchema, 'roster');

// NebulaOS: For Scaling Data (Templates, Proposals, Managed Creators)
const managementSchema = new mongoose.Schema({
    category: { type: String, required: true }, // 'proposal', 'creator', 'vault'
    title: String,
    content: mongoose.Schema.Types.Mixed,
    dateAdded: { type: Date, default: Date.now }
});
const NebulaOS = mongoose.model('NebulaOS', managementSchema);

// --- 5. PAGE ROUTES ---
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

// Pointing to the specific /private/ folder as requested
app.get('/admin.html', adminAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'private', 'admin.html'));
});

// --- 6. PUBLIC API (Lead Generation) ---
app.post('/api/roster', async (req, res) => {
    const { name, email, message } = req.body;
    if (!name || !email || !message) return res.status(400).json({ message: 'All fields required.' });
    try {
        const newEntry = new Roster({ name, email, message });
        await newEntry.save();
        console.log('>>> DATA_CACHED:', newEntry.name);
        sendMailViaAPI(email, name);
        res.status(200).json({ message: 'Successfully joined the nebula!' });
    } catch (error) { res.status(500).json({ message: 'Internal error.' }); }
});

// --- 7. PROTECTED API (The Scaling Business Logic) ---

// 7.1 Fetch Scaling Data (Proposals / Creators / Vault)
app.get('/api/manage/:category', adminAuth, async (req, res) => {
    try {
        const data = await NebulaOS.find({ category: req.params.category });
        res.status(200).json(data);
    } catch (err) { res.status(500).json({ message: "Fetch Error" }); }
});

// 7.2 Save New Scaling Asset (Templates or Hidden Gems)
app.post('/api/manage', adminAuth, async (req, res) => {
    try {
        const newItem = new NebulaOS(req.body);
        await newItem.save();
        res.status(201).json({ message: "Asset Secured in NebulaOS" });
    } catch (err) { res.status(500).json({ message: "Storage Error" }); }
});

// 7.3 Roster Log Operations
app.get('/api/roster', adminAuth, async (req, res) => {
    try {
        const entries = await Roster.find().sort({ timestamp: -1 });
        res.status(200).json(entries);
    } catch (err) { res.status(500).json({ message: 'Fetch error' }); }
});

app.delete('/api/roster/:id', adminAuth, async (req, res) => {
    try {
        await Roster.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: 'Target neutralized.' });
    } catch (err) { res.status(500).json({ message: 'Purge failed' }); }
});

// --- 8. SYSTEM INITIALIZATION ---
app.listen(PORT, '0.0.0.0', () => {
    console.log(`>>> NEBULA_CORE: Active on port ${PORT}`);
    console.log(`>>> OPERATIONAL MODE: Scaling Agency Architect`);
});