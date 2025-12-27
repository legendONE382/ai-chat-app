const { MongoClient } = require('mongodb');
const jwt = require('jsonwebtoken');

// MongoDB connection URI - Vercel will inject this from environment variables
const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-chat-app';

const handler = async (req, res) => {
    if (req.method !== 'GET') {
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
        
        const { chatId } = req.query;
        
        if (!chatId) {
            return res.status(400).json({ error: 'Chat ID is required' });
        }
        
        const client = new MongoClient(uri);
        await client.connect();
        
        const database = client.db();
        const conversations = database.collection('conversations');
        
        const conversation = await conversations.findOne({ 
            userId, 
            chatId: chatId 
        });
        
        await client.close();
        
        if (!conversation) {
            return res.status(404).json({ error: 'Conversation not found' });
        }
        
        res.json(conversation);
        
    } catch (error) {
        console.error('Get conversation error:', error);
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: 'Invalid token' });
        }
        res.status(500).json({ error: 'Server error' });
    }
};

module.exports = handler;