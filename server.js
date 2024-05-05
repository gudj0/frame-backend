import express from 'express';
import { db } from './firebase.js';
const app = express();
const port = 3000;

// Middleware to check if the user is a power user
function checkPowerUser(req, res, next) {
    // This is a placeholder; implement your actual logic here
    // For example, you could check a token or a user property
    if (req.query.isPowerUser === 'true') {
        next();
    } else {
        res.status(403).send('Access denied. You are not a power user.');
    }
}

// Endpoint for power users
app.get('/power-users', checkPowerUser, async (req, res) => {
    res.send('Welcome, Power User!');
});

// Endpoint for non-power badge users
app.get('/non-power-users', async (req, res) => {
    // Check your OpenRank 
    res.send('Hello, Non-Power badge User!');
});

app.get('/user-relevant-cast/:fid', async (req, res) => {
    const userDoc = db.collection('openrank-farhack').doc(req.params.fid);
    const userDocData = (await userDoc.get())?.data();
    if (userDocData && userDocData.cast) {
        res.json(userDocData);
    } else {
        res.json({loading: true});
    }
});

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
