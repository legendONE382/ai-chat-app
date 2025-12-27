const { MongoClient } = require('mongodb');
const jwt = require('jsonwebtoken');
const axios = require('axios');

// MongoDB connection URI - Vercel will inject this from environment variables
const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-chat-app';

// AI Models configuration
const models = [
  {
    name: 'Groq',
    apiKey: process.env.GROQ_API_KEY,
    url: 'https://api.groq.com/openai/v1/chat/completions',
    headers: (key) => ({ 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' }),
    body: (message) => ({
      model: 'llama-3.1-8b-instant',
      messages: [{ role: 'user', content: message }],
      max_tokens: 6000
    }),
    extractResponse: (data) => data.choices[0].message.content
  }
];

const handler = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Authorization token required' });
        }
        
        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        const userId = decoded.userId;
        
        const { messages } = req.body;
        
        if (!messages || messages.length === 0) {
            return res.status(400).json({ error: 'Messages are required' });
        }
        
        const conversationText = messages.slice(0, 5).map(msg => `${msg.sender}: ${msg.text}`).join('\n');
        const prompt = `Based on this conversation, generate a short, descriptive title (max 6 words):\n\n${conversationText}`;
        
        // Use Groq for title generation if available
        const model = models.find(m => m.name === 'Groq');
        if (model && model.apiKey) {
            try {
                const response = await axios.post(model.url, {
                    model: 'llama-3.1-8b-instant',
                    messages: [{ role: 'user', content: prompt }],
                    max_tokens: 50
                }, {
                    headers: model.headers(model.apiKey),
                    timeout: 5000
                });
                const title = model.extractResponse(response.data).trim().replace(/^["']|["']$/g, '');
                return res.json({ title });
            } catch (error) {
                console.error('Error generating title:', error.message);
            }
        }
        
        // Fallback to simple title
        const firstMessage = messages[0].text.slice(0, 30) + (messages[0].text.length > 30 ? '...' : '');
        res.json({ title: firstMessage });
        
    } catch (error) {
        console.error('Generate title error:', error);
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: 'Invalid token' });
        }
        res.status(500).json({ error: 'Server error' });
    }
};

module.exports = handler;