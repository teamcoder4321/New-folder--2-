const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');
const { sendVerificationEmail, generateVerificationToken } = require('./emailVerification');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

const verifiedUsers = {};  // Store verified users
const tokens = {};  // Store verification tokens
let waitingUser = null;  // Store waiting users for random matching

// Middleware to serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());  // To parse JSON bodies

// Gmail Verification and Registration
app.post('/register', (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).send('Email is required');

    const token = generateVerificationToken();
    tokens[token] = email;

    sendVerificationEmail(email, token)
        .then(() => res.status(200).send('Verification email sent'))
        .catch(err => res.status(500).send('Error sending email'));
});

app.get('/verify-email', (req, res) => {
    const { token } = req.query;
    const email = tokens[token];

    if (!email) return res.status(400).send('Invalid or expired token');

    verifiedUsers[email] = true;
    delete tokens[token];

    res.redirect('/chat.html');
});

// Ensure user is verified
app.use('/chat', (req, res, next) => {
    const email = req.query.email;
    if (verifiedUsers[email]) {
        next();
    } else {
        res.status(403).send('Please verify your email to access the chat.');
    }
});

// WebRTC signaling and peer matching
io.on('connection', (socket) => {
    console.log('A user connected');

    const findNewPeer = () => {
        if (waitingUser) {
            socket.emit('match', { peerId: waitingUser.id });
            waitingUser.emit('match', { peerId: socket.id });
            waitingUser = null;
        } else {
            waitingUser = socket;
        }
    };

    findNewPeer();

    socket.on('findNewPeer', () => findNewPeer());

    socket.on('offer', (data) => {
        socket.to(data.peerId).emit('offer', data);
    });

    socket.on('answer', (data) => {
        socket.to(data.peerId).emit('answer', data);
    });

    socket.on('candidate', (data) => {
        socket.to(data.peerId).emit('candidate', data);
    });

    socket.on('disconnect', () => {
        if (waitingUser === socket) waitingUser = null;
        console.log('User disconnected');
    });
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
