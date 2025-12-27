const { MongoClient } = require('mongodb');
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
  },
  {
    name: 'Mistral',
    apiKey: process.env.MISTRAL_API_KEY,
    url: 'https://api.mistral.ai/v1/chat/completions',
    headers: (key) => ({ 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' }),
    body: (message) => ({
      model: 'mistral-small',
      messages: [{ role: 'user', content: message }],
      max_tokens: 4000
    }),
    extractResponse: (data) => data.choices[0].message.content
  },
  {
    name: 'OpenAI',
    apiKey: process.env.OPENAI_API_KEY,
    url: 'https://api.openai.com/v1/chat/completions',
    headers: (key) => ({ 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' }),
    body: (message) => ({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: message }],
      max_tokens: 4000
    }),
    extractResponse: (data) => data.choices[0].message.content
  }
];

const handler = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { message, preferredModel, chatId } = req.body;
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Authorization token required' });
        }
        
        const token = authHeader.substring(7);
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        const userId = decoded.userId;
        
        if (!message) return res.status(400).json({ error: 'Message is required' });
        if (!chatId) return res.status(400).json({ error: 'Chat ID is required' });
        
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
            await conversations.insertOne(conversation);
        }
        
        // Add user message to conversation
        conversation.messages.push({ role: 'user', content: message, timestamp: new Date() });
        await conversations.updateOne(
            { userId, chatId },
            { 
                $set: { 
                    messages: conversation.messages,
                    updatedAt: new Date()
                } 
            }
        );
        
        // Prepare messages for AI (include conversation history, limit to last 10 messages)
        const conversationHistory = conversation.messages.slice(-10);
        
        let triedModels = [];
        
        // If preferred model is specified, try it first
        if (preferredModel) {
            const model = models.find(m => m.name === preferredModel);
            if (model && model.apiKey) {
                triedModels.push(model.name);
                try {
                    const response = await axios.post(model.url, {
                        ...model.body(message),
                        messages: conversationHistory
                    }, {
                        headers: model.headers(model.apiKey),
                        timeout: 10000
                    });
                    const reply = model.extractResponse(response.data);
                    
                    // Add AI reply to conversation
                    conversation.messages.push({ role: 'assistant', content: reply, timestamp: new Date() });
                    await conversations.updateOne(
                        { userId, chatId },
                        { 
                            $set: { 
                                messages: conversation.messages,
                                updatedAt: new Date()
                            } 
                        }
                    );
                    
                    await client.close();
                    return res.json({ 
                        reply, 
                        model: model.name, 
                        switched: false,
                        conversationId: chatId
                    });
                } catch (error) {
                    console.error(`Error with preferred ${model.name}:`, error.message);
                }
            }
        }
        
        // Switch to other available models
        for (const model of models) {
            if (!model.apiKey || triedModels.includes(model.name)) continue;
            
            triedModels.push(model.name);
            try {
                const response = await axios.post(model.url, {
                    ...model.body(message),
                    messages: conversationHistory
                }, {
                    headers: model.headers(model.apiKey),
                    timeout: 10000
                });
                const reply = model.extractResponse(response.data);
                
                // Add AI reply to conversation
                conversation.messages.push({ role: 'assistant', content: reply, timestamp: new Date() });
                await conversations.updateOne(
                    { userId, chatId },
                    { 
                        $set: { 
                            messages: conversation.messages,
                            updatedAt: new Date()
                        } 
                    }
                );
                
                await client.close();
                return res.json({ 
                    reply, 
                    model: model.name, 
                    switched: true, 
                    triedModels,
                    conversationId: chatId
                });
            } catch (error) {
                console.error(`Error with ${model.name}:`, error.message);
            }
        }
        
        await client.close();
        res.status(500).json({ error: 'All AI models failed', triedModels });
        
    } catch (error) {
        console.error('Chat error:', error);
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: 'Invalid token' });
        }
        res.status(500).json({ error: 'Server error during chat' });
    }
};

module.exports = handler;