const express = require('express');
const app = express();
const port = 3000;
const axios = require('axios');


app.use(express.json()); // For parsing application/json

async function fetchHighestNonPB(req, res, next){

}

// Endpoint to start
app.get('/start/:fid', async (req, res) => {
    const pbURL = 'https://api.warpcast.com/v2/power-badge-users';
    const userFid = parseInt(req.params.fid); // Accessing the fid parameter from the URL
    let powerBadgeUsers; 
    try {
        const response = await axios.get(pbURL);
        powerBadgeUsers = response.data.result.fids; // Adjusting path to match actual response structure
    } catch (error) {
        console.error('Error fetching power badge users:', error);
        res.status(500).send('Failed to fetch power badge users');
    }
    console.log(powerBadgeUsers);
    let isPowerUser = powerBadgeUsers.includes(userFid);
    let openrankURL 

    // If power badge user, fetch engagement scores 
    isPowerUser = true
    if (isPowerUser){
        console.log("Fid", userFid, "is a poweruser");
        openrankURL = 'https://graph.cast.k3l.io/scores/personalized/engagement/fids?k=2&limit=4999';
        try {
            const engagementScores = await axios.post(openrankURL, [userFid], {
                headers: {
                    'Content-Type': 'application/json'
                }
            });    
            console.log(engagementScores.data.result)   
            // Filter out power badge users from the engagement scores
            const filteredScores = engagementScores.data.result.filter(score => 
                !powerBadgeUsers.includes(score.fid) // Assuming each score object has an 'fid' property
            );
            res.json(filteredScores[5]);
        } catch (error) {
            console.error('Error fetching power badge users:', error);
            res.status(500).send('Failed to fetch power badge users');
        }
    } else {
        console.log("Fid", userFid, "is not a poweruser");
    }
    res.send('Welcome, Power User!');
});

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
