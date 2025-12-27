const { MongoClient } = require('mongodb');
const jwt = require('jsonwebtoken');

// MongoDB connection URI - Vercel will inject this from environment variables
const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-chat-app';

const handler = async (req, res) => {
    if (req.method === 'GET') {
        return await getConversations(req, res);
    } else if (req.method === 'POST') {
        return await saveMessage(req, res);
    } else if (req.method === 'DELETE') {
        return await clearAllConversations(req, res);
    } else {
        return res.status(405).json({ error: 'Method not allowed' });
    }
};

async function getConversations(req, res) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Authorization token required' });
        }
        
        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        const userId = decoded.userId;
        
        const client = new MongoClient(uri);
        await client.connect();
        
        const database = client.db();
        const conversations = database.collection('conversations');
        
        const userConversations = await conversations
            .find({ userId })
            .sort({ updatedAt: -1 })
            .toArray();
        
        await client.close();
        
        res.json(userConversations);
        
    } catch (error) {
        console.error('Get conversations error:', error);
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: 'Invalid token' });
        }
        res.status(500).json({ error: 'Server error' });
    }
}

async function saveMessage(req, res) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Authorization token required' });
        }
        
        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        const userId = decoded.userId;
        
        const { chatId, message, model } = req.body;
        
        if (!chatId || !message) {
            return res.status(400).json({ error: 'Chat ID and message are required' });
        }
        
        const client = new MongoClient(uri);
        await client.connect();
        
        const database = client.db();
        const conversations = database.collection('conversations');
        
        // Find or create conversation
        let conversation = await conversations.findOne({ userId, chatId });
        if (!conversation) {
            conversation = {
                userId,
                chatId,
                title: 'New Chat',
                messages: [],
                createdAt: new Date(),
                updatedAt: new Date()
            };
        }
        
        // Add message to conversation
        conversation.messages.push({
            role: message.role,
            content: message.content,
            timestamp: new Date(),
            model: model
        });
        
        // Auto-generate title after first few messages
        if (conversation.messages.length === 3 && message.role === 'assistant') {
            try {
                const title = await generateTitle(conversation.messages.slice(0, 5));
                conversation.title = title;
            } catch (error) {
                console.error('Error generating title:', error);
            }
        }
        
        await conversations.updateOne(
            { userId, chatId },
            { 
                $set: { 
                    messages: conversation.messages,
                    title: conversation.title,
                    updatedAt: new Date()
                },
                $setOnInsert: {
                    userId,
                    chatId,
                    createdAt: new Date()
                }
            },
            { upsert: true }
        );
        
        await client.close();
        res.json({ success: true });
        
    } catch (error) {
        console.error('Save message error:', error);
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: 'Invalid token' });
        }
        res.status(500).json({ error: 'Server error' });
    }
}

async function clearAllConversations(req, res) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Authorization token required' });
        }
        
        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        const userId = decoded.userId;
        
        const client = new MongoClient(uri);
        await client.connect();
        
        const database = client.db();
        const conversations = database.collection('conversations');
        
        const result = await conversations.deleteMany({ userId });
        
        await client.close();
        
        res.json({ 
            success: true, 
            message: `Deleted ${result.deletedCount} conversations` 
        });
        
    } catch (error) {
        console.error('Clear conversations error:', error);
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: 'Invalid token' });
        }
        res.status(500).json({ error: 'Server error' });
    }
}

async function generateTitle(messages) {
    const axios = require('axios');
    
    const conversationText = messages.slice(0, 5).map(msg => `${msg.sender}: ${msg.text}`).join('\n');
    const prompt = `Based on this conversation, generate a short, descriptive title (max 6 words):\n\n${conversationText}`;
    
    // Use Groq for title generation if available
    const model = {
        name: 'Groq',
        apiKey: process.env.GROQ_API_KEY,
        url: 'https://api.groq.com/openai/v1/chat/completions',
        headers: (key) => ({ 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' }),
        body: (message) => ({
            model: 'llama-3.1-8b-instant',
            messages: [{ role: 'user', content: message }],
            max_tokens: 50
        }),
        extractResponse: (data) => data.choices[0].message.content
    };
    
    if (model && model.apiKey) {
        try {
            const response = await axios.post(model.url, {
                ...model.body(prompt),
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 50
            }, {
                headers: model.headers(model.apiKey),
                timeout: 5000
            });
            const title = model.extractResponse(response.data).trim().replace(/^["']|["']$/g, '');
            return title;
        } catch (error) {
            console.error('Error generating title:', error.message);
        }
    }
    
    // Fallback to simple title
    const firstMessage = messages[0].content.slice(0, 30) + (messages[0].content.length > 30 ? '...' : '');
    return firstMessage;
}

module.exports = handler;