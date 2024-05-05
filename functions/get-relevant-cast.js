import { init, fetchQuery } from "@airstack/node";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { config } from "dotenv";
config();

init(process.env.AIRSTACK_API_KEY);
const gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = gemini.getGenerativeModel({ model: 'gemini-pro'});

const getRelevantCast = async (userFid, targetFid) => {
    let tries = 0;
    let success = false;
    while (tries < 3 && !success) {
        // need to fetch recent casts and channels from the interacting user
        // recent casts
        const userCastsQuery = `
        query UserCastsQuery {
            FarcasterCasts(
            input: {filter: {castedBy: {_eq: "fc_fid:${userFid}"}}, blockchain: ALL, limit: 25}
            ) {
            Cast {
                castedAtTimestamp
                embeds
                url
                text
                numberOfRecasts
                numberOfLikes
                channel {
                channelId
                }
                mentions {
                fid
                position
                }
                hash
            }
            }
        }
        `;
        const { data: userCastsData, error: userCastsError } = await fetchQuery(userCastsQuery);
        //console.log(`user casts: ${JSON.stringify(userCastsData)}\nerror: ${JSON.stringify(userCastsError)}`)

        // user channels - TODO (if possible)

        // need to fetch recent casts from the targetFid
        const currentDate = new Date();
        currentDate.setHours(currentDate.getHours() - 48);
        const dateLimit = currentDate;
        const targetCastsQuery = `
        query TargetCastsQuery {
            FarcasterCasts(
            input: {filter: {
                castedBy: {_eq: "fc_fid:${targetFid}"},
                castedAtTimestamp: {_gte: "${dateLimit.toISOString().slice(0, -5)}Z"}
            }, blockchain: ALL, limit: 25}
            ) {
            Cast {
                castedAtTimestamp
                embeds
                url
                text
                numberOfRecasts
                numberOfLikes
                channel {
                channelId
                }
                mentions {
                fid
                position
                }
                hash
            }
            }
        }
        `
        const { data: targetCastsData, error: targetCastsError } = await fetchQuery(targetCastsQuery);
        // console.log(`Target Casts: ${JSON.stringify(targetCastsData)}\nerror: ${JSON.stringify(targetCastsError)}`)
        
        // get relevant cast to reply to
        const prompt = `
        Here is some JSON of my most recent casts in this rough JSON format:
        ${JSON.stringify(userCastsData)}

        And here are some recent casts from a user I want to engage with and reply to (the target user):
        ${JSON.stringify(targetCastsData)}

        Based on my recent casts, I want you to help me determine which of the target user casts makes the most sense for me to reply to given the things that I am talking about and interested in. This should be use the "text" field of the cast data for each cast. You should return just the "hash" of the cast. For example, if the most relevant cast is:
        {
            "castedAtTimestamp": "2024-05-02T22:56:25Z",
            "embeds": [],
            "url": "https://warpcast.com/banta/0x8925cc18",
            "text": "I forgot how terrible LA driving is. Been driving for almost 2 hours and my time to arrive has only gone down 25 minutes 🤣😅",
            "numberOfRecasts": 0,
            "numberOfLikes": 4,
            "channel": null,
            "mentions": [],
            "hash": "0x8925cc183e4ce7f28a7a0460f775447eae8f5ec9"
        }

        then it should return the "hash": "0x8925cc183e4ce7f28a7a0460f775447eae8f5ec9". The JSON formatting might not be perfect
        `
        // console.log(`Prompt: ${prompt}`);
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const responseText = response.text();
        const cast = targetCastsData?.FarcasterCasts?.Cast?.find((x) => x?.hash === responseText);
        console.log(`Response Text: ${responseText}\nCAST: ${JSON.stringify(cast)}`);
        if(cast) {
            success = true;
            return cast;
        } else {
            tries += 1;
            console.log(`trying again: ${tries}`);
        }
    }
}

export default getRelevantCast;