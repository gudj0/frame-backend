import express from 'express';
import cors from 'cors';
import { db } from './firebase.js';
const app = express();
const port = 3000;
const axios = require('axios');
const { init, fetchQuery } = require("@airstack/node");
console.log("### API KEY:", process.env.AIRSTACK_API_KEY)
init(process.env.AIRSTACK_API_KEY)

app.use(express.json()); // For parsing application/json
app.use(cors());

// GraphQL query as a string
const graphqlQuery = `
  query MyQuery($fids: [Identity!], $startTime: Time) {
    FarcasterCasts(
      input: {filter: {castedBy: {_in: $fids}, castedAtTimestamp: {_gte: $startTime}}, blockchain: ALL}
    ) {
      Cast {
        embeds
        text
        channel {
          name
        }
        fid
      }
    }
  }
`;


// Endpoint to start
app.get('/start/:fid', async (req, res) => {
    console.log("## Starting server....")
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
    let isPowerUser = powerBadgeUsers.includes(userFid);
    let openrankURL = 'https://graph.cast.k3l.io/scores/personalized/engagement/fids?k=3&limit=4999';

    // If power badge user, fetch engagement scores 
    // isPowerUser = true 
    if (isPowerUser){
        console.log("Fid", userFid, "is a poweruser");
        try {
            const engagementScores = await axios.post(openrankURL, [userFid], {
                headers: {
                    'Content-Type': 'application/json'
                }
            });    
            // Filter out power badge users from the engagement scores
            const filteredScores = engagementScores.data.result.filter(score => 
                !powerBadgeUsers.includes(score.fid) // Assuming each score object has an 'fid' property
            );
            console.log("Length of filtered scored:", filteredScores.length);
            const randomNumber = Math.floor(Math.random() * filteredScores.length) + 2;
            const fids = filteredScores.map(item => `fc_fid:${item.fid}`);
            
            const now = new Date(); // Current date and time
            const fortyEightHoursAgo = new Date(now.getTime() - (48 * 60 * 60 * 1000)); // Subtract 48 hours in milliseconds
            // Convert to ISO string for use in APIs
            const startTime = fortyEightHoursAgo.toISOString();
            const variables = {
                fids: fids,
                startTime: startTime
            };
            const data = await fetchQuery(graphqlQuery, variables);
            const casts = data.data.FarcasterCasts.Cast;
            console.log(casts);
            console.log("length of casts:", casts.length)
            res.json(filteredScores[randomNumber]); // we select 3 as to make some randomness
        } catch (error) {
            console.error('Error fetching power badge users:', error);
            res.status(500).send('Failed to fetch power badge users');
        }
    } else {
        console.log("Fid", userFid, "is not a poweruser... fetching normal users that are highly engaging");
        try {
            console.log("Fetch engagementscores")
            const engagementScores = await axios.post(openrankURL, [userFid], {
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            console.log("Make random")
            result = engagementScores.data.result
            const randomNumber = Math.floor(Math.random() * result.length/20) + 2;
            console.log("length of result:", result.length)
            console.log("randomnum:", randomNumber)
            console.log("engagementscores[0]:", result[randomNumber])
            res.json(Object.assign({}, result[randomNumber]));
        } catch (error) {
            console.error('Error fetching power badge users:', error);
            res.status(500).send('Failed to fetch power badge users');
        }
    }
});

app.get('/user-relevant-cast/:fid', async (req, res) => {
    const userDoc = db.collection('openrank-farhack').doc(req.params.fid);
    const userDocData = (await userDoc.get())?.data();
    if (userDocData && userDocData.cast) {
        return res.json(userDocData);
    } else {
        return res.json({loading: true});
    }
});

app.listen(port, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${port}`);
});
