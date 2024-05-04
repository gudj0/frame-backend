async function pickBestCast(req, res, next){
    const googleApiKey = process.env.GOOGLE_API_KEY; // Ensure your API key is stored in environment variables
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${googleApiKey}`;

    try {
        const response = await axios.post(url, {
            "contents": [{
                "parts": [{
                    "text": "Pick the most engaging cast out of these <INSERT CAST STRING HERE.>"
                }]
            }]
        }, {
            headers: {
                'Content-Type': 'application/json'
            }
        });

        res.json(response.data); // Send back the response from the API to the client
    } catch (error) {
        console.error('Error making API request:', error);
        res.status(500).send('Failed to make API request');
    }
}