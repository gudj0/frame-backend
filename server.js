const express = require('express');
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

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
