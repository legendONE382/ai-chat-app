
const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// MongoDB connection URI - Vercel will inject this from environment variables
const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-chat-app';

const handler = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }
        
        const client = new MongoClient(uri);
        await client.connect();
        
        const database = client.db();
        const users = database.collection('users');
        
        // Find user by email
        const user = await users.findOne({ email });
        if (!user) {
            await client.close();
            return res.status(400).json({ error: 'Invalid email or password' });
        }
        
        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            await client.close();
            return res.status(400).json({ error: 'Invalid email or password' });
        }
        
        // Generate JWT token
        const token = jwt.sign(
            { userId: user._id, email: user.email },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '7d' }
        );
        
        await client.close();
        
        res.json({
            message: 'Login successful',
            token,
            user: { id: user._id, email: user.email }
        });
        
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Server error during login' });
    }
};

module.exports = handler;
