const { MongoClient } = require('mongodb');
const jwt = require('jsonwebtoken');

// MongoDB connection URI - Vercel will inject this from environment variables
const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-chat-app';

const handler = async (req, res) => {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Get token from Authorization header
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Authorization token required' });
        }
        
        const token = authHeader.substring(7); // Remove 'Bearer ' prefix
        
        // Verify JWT token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        
        const client = new MongoClient(uri);
        await client.connect();
        
        const database = client.db();
        const users = database.collection('users');
        
        // Find user by ID (excluding password)
        const user = await users.findOne(
            { _id: new require('mongodb').ObjectId(decoded.userId) },
            { projection: { password: 0 } }
        );
        
        await client.close();
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json(user);
        
    } catch (error) {
        console.error('Profile error:', error);
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: 'Invalid token' });
        }
        res.status(500).json({ error: 'Server error' });
    }
};

module.exports = handler;