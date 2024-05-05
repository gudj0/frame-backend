import express from 'express';
import cors from 'cors';
// import { db } from './firebase.js';
const app = express();
const port = process.env.PORT || 3000;  // Ensure using PORT from environment in production
import axios from 'axios';
import { init, fetchQuery } from "@airstack/node";
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
    console.log("### Starting server....")
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
    let globalRankUrl = `https://graph.cast.k3l.io/scores/global/engagement/fids`;
    // If power badge user, fetch engagement scores 
    // isPowerUser = true 
        try {
            const openRankResponse = await axios.post(globalRankUrl, [userFid]);
            const openRank = openRankResponse?.result[0]?.response
            const engagementScores = await axios.post(openrankURL, [userFid], {
                headers: {
                    'Content-Type': 'application/json'
                }
            });    
            // Filter out power badge users from the engagement scores
            let filteredScores
            if (isPowerUser){
                console.log("Fid", userFid, "is a poweruser");
                filteredScores = engagementScores.data.result.filter(score => 
                    !powerBadgeUsers.includes(score.fid) // Assuming each score object has an 'fid' property
                );
            } else {
                console.log("Fid", userFid, "is not a poweruser... fetching power users that are highly engaging");
                filteredScores = engagementScores.data.result.filter(score => 
                    powerBadgeUsers.includes(score.fid) // Assuming each score object has an 'fid' property
                );
            }
            let randomNumber = Math.floor(Math.random() * filteredScores.length) + 2;
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
            const fidsFromCasts = casts.map(cast => cast.fid);
            randomNumber = Math.floor(Math.random() * fidsFromCasts.length/2) + 2;
            let finalFid= fidsFromCasts[randomNumber]
            const matchingObject = filteredScores.find(score => score.fid == finalFid);
            console.log({...matchingObject, openRank: openRank, powerBadge: true})
            res.json({...matchingObject, openRank: openRank, powerBadge: true})
    
        } catch (error) {
            console.error('Error fetching power badge users:', error);
            res.status(500).send('Failed to fetch power badge users');
        }
});

app.get('/user-relevant-cast/:fid/:targetFid', async (req, res) => {
    const userDoc = db.collection('openrank-farhack').doc(req.params.fid);
    const userDocData = (await userDoc.get())?.data();
    if (userDocData && userDocData.cast) {
        return res.json(userDocData);
    } else {
        return res.json({loading: true});
    }
});

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
