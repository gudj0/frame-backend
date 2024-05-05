import express from 'express';
import cors from 'cors';
import redis from 'redis';
// import { db } from './firebase.js';
const app = express();
const port = process.env.PORT || 3000;  // Ensure using PORT from environment in production
const client = redis.createClient(process.env.REDIS_PRIVATE_URL);
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

const processFid = async (fid) => {
    const pbURL = 'https://api.warpcast.com/v2/power-badge-users';
    let powerBadgeUsers;
    try {
        const response = await axios.get(pbURL);
        powerBadgeUsers = response.data.result.fids; // Adjusting path to match actual response structure
    } catch (error) {
        console.error('Error fetching power badge users:', error);
        await client.set(`status:${fid}`, 'error')
    }
    let isPowerUser = powerBadgeUsers.includes(userFid);
    let openrankURL = 'https://graph.cast.k3l.io/scores/personalized/engagement/fids?k=3&limit=4999';
    let globalRankUrl = `https://graph.cast.k3l.io/scores/global/engagement/fids`;
    // If power badge user, fetch engagement scores 
    // isPowerUser = true 
        try {
            const openRankResponse = await axios.post(globalRankUrl, [userFid], {
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            console.log(`openRankResult: ${JSON.stringify(openRankResponse?.data?.result)}`);
            const openRank = openRankResponse?.data?.result?.[0];
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
            await client.set(`data:${fid}`, JSON.stringify({...matchingObject, user: { openRank: openRank, powerBadge: true}}));
            await client.set(`status:${fid}`, 'complete');
            //res.json({...matchingObject, user: { openRank: openRank, powerBadge: true}})
    
        } catch (error) {
            console.error('Error fetching power badge users:', error);
            await client.set(`status:${fid}`, 'error')
            //res.status(500).send('Failed to fetch power badge users');
        }
}

// Endpoint to start
app.get('/start/:fid', async (req, res) => {
    console.log("### Starting server....")
    const userFid = parseInt(req.params.fid); // Accessing the fid parameter from the URL
    const status = await client.get(`status:${userFid}`);
    if(status === 'processing') {
        res.json({status: status});
    } else if(status === 'complete') {
        // get data for user and convert back to json
        const data = await client.get(`data:${userFid}`);
        try {
            const jsonData = JSON.parse(data);
            res.json({...jsonData, status: status});
        } catch (e) {
            res.json({ status: 'error' });
        }
    } else {
        await client.set(`status:${userFid}`, 'processing');
        processFid(userFid);
        res.json({ status: 'processing'});
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
