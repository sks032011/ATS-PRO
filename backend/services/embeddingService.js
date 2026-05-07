const axios = require("axios");
require('dotenv').config();

exports.getEmbedding = async (text) => {
    try {
        const cleanText = text.replace(/\n/g, " ").substring(0, 8000);
        
        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${process.env.GEMINI_API_KEY}`,
            {
                content: {
                    parts: [
                        {
                            text: cleanText
                        }
                    ]
                },
                outputDimensionality: 768  
            },
            {
                headers: {
                    "Content-Type": "application/json"
                },
                timeout: 30000
            }
        );
        
        if (response.data.embedding && response.data.embedding.values) {
            console.log(`embedding: ${response.data.embedding.values.length} dimensions`);
            return response.data.embedding.values;
        } else {
            throw new Error("No embedding values");
        }
    } catch (error) {
        console.error("error:", error.response?.data?.error?.message || error.message);
        throw error;
    }
};