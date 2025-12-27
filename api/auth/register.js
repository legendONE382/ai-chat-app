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
        
        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters long' });
        }
        
        const client = new MongoClient(uri);
        await client.connect();
        
        const database = client.db();
        const users = database.collection('users');
        
        // Check if user already exists
        const existingUser = await users.findOne({ email });
        if (existingUser) {
            await client.close();
            return res.status(400).json({ error: 'User already exists with this email' });
        }
        
        // Hash password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        
        // Create new user
        const newUser = {
            email,
            password: hashedPassword,
            createdAt: new Date()
        };
        
        const result = await users.insertOne(newUser);
        
        // Generate JWT token
        const token = jwt.sign(
            { userId: result.insertedId, email: email },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '7d' }
        );
        
        await client.close();
        
        res.status(201).json({
            message: 'User registered successfully',
            token,
            user: { id: result.insertedId, email: email }
        });
        
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Server error during registration' });
    }
};

module.exports = handler;