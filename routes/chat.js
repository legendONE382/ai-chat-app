const express = require('express');
const axios = require('axios');
const Conversation = require('../models/Conversation');
const auth = require('../middleware/auth');

const router = express.Router();

// AI Models configuration (same as in server.js but moved here for modularity)
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

// Chat endpoint with authentication and persistent storage
router.post('/chat', auth, async (req, res) => {
  try {
    const { message, preferredModel, chatId } = req.body;
    const userId = req.user.userId;
    
    if (!message) return res.status(400).json({ error: 'Message is required' });
    if (!chatId) return res.status(400).json({ error: 'Chat ID is required' });
    
    // Find or create conversation
    let conversation = await Conversation.findOne({ userId, chatId });
    if (!conversation) {
      conversation = new Conversation({
        userId,
        chatId,
        messages: []
      });
    }
    
    // Add user message to conversation
    conversation.messages.push({ role: 'user', content: message });
    await conversation.save();
    
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
          conversation.messages.push({ role: 'assistant', content: reply });
          await conversation.save();
          
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
        conversation.messages.push({ role: 'assistant', content: reply });
        await conversation.save();
        
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
    
    res.status(500).json({ error: 'All AI models failed', triedModels });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Server error during chat' });
  }
});

// Get user's conversations
router.get('/conversations', auth, async (req, res) => {
  try {
    const conversations = await Conversation.find({ userId: req.user.userId })
      .sort({ updatedAt: -1 })
      .select('chatId title createdAt updatedAt messages');
    
    res.json(conversations);
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get specific conversation
router.get('/conversations/:chatId', auth, async (req, res) => {
  try {
    const conversation = await Conversation.findOne({ 
      userId: req.user.userId, 
      chatId: req.params.chatId 
    });
    
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    
    res.json(conversation);
  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Generate chat title endpoint
router.post('/generate-title', auth, async (req, res) => {
  try {
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
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;