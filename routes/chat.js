const express = require('express');
const axios = require('axios');
const auth = require('../middleware/auth');
const supabase = require('../config/supabase');

const router = express.Router();

const models = [
  {
    name: 'Groq',
    apiKey: process.env.GROQ_API_KEY,
    url: 'https://api.groq.com/openai/v1/chat/completions',
    headers: (key) => ({ Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }),
    body: () => ({ model: 'llama-3.1-8b-instant', max_tokens: 6000 }),
    extractResponse: (data) => data.choices[0].message.content
  },
  {
    name: 'Mistral',
    apiKey: process.env.MISTRAL_API_KEY,
    url: 'https://api.mistral.ai/v1/chat/completions',
    headers: (key) => ({ Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }),
    body: () => ({ model: 'mistral-small', max_tokens: 4000 }),
    extractResponse: (data) => data.choices[0].message.content
  },
  {
    name: 'OpenAI',
    apiKey: process.env.OPENAI_API_KEY,
    url: 'https://api.openai.com/v1/chat/completions',
    headers: (key) => ({ Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }),
    body: () => ({ model: 'gpt-3.5-turbo', max_tokens: 4000 }),
    extractResponse: (data) => data.choices[0].message.content
  }
];

async function getConversation(userId, chatId) {
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('user_id', userId)
    .eq('chat_id', chatId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function upsertConversation(conversation) {
  const payload = {
    user_id: conversation.user_id,
    chat_id: conversation.chat_id,
    title: conversation.title || 'New Chat',
    messages: conversation.messages || [],
    updated_at: new Date().toISOString()
  };

  if (!conversation.created_at) {
    payload.created_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('conversations')
    .upsert(payload, { onConflict: 'user_id,chat_id' })
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

router.post('/chat', auth, async (req, res) => {
  try {
    const { message, preferredModel, chatId } = req.body;
    const userId = req.user.userId;

    if (!message) return res.status(400).json({ error: 'Message is required' });
    if (!chatId) return res.status(400).json({ error: 'Chat ID is required' });

    let conversation = await getConversation(userId, chatId);
    if (!conversation) {
      conversation = { user_id: userId, chat_id: chatId, messages: [], title: 'New Chat' };
    }

    conversation.messages.push({ role: 'user', content: message, timestamp: new Date().toISOString() });
    conversation = await upsertConversation(conversation);
    const conversationHistory = conversation.messages.slice(-10);
    const triedModels = [];

    const tryModel = async (model) => {
      const response = await axios.post(
        model.url,
        {
          ...model.body(),
          messages: conversationHistory
        },
        { headers: model.headers(model.apiKey), timeout: 10000 }
      );
      return model.extractResponse(response.data);
    };

    if (preferredModel) {
      const preferred = models.find((m) => m.name === preferredModel);
      if (preferred && preferred.apiKey) {
        triedModels.push(preferred.name);
        try {
          const reply = await tryModel(preferred);
          conversation.messages.push({ role: 'assistant', content: reply, timestamp: new Date().toISOString() });
          await upsertConversation(conversation);
          return res.json({ reply, model: preferred.name, switched: false, conversationId: chatId });
        } catch (error) {
          console.error(`Error with preferred ${preferred.name}:`, error.message);
        }
      }
    }

    for (const model of models) {
      if (!model.apiKey || triedModels.includes(model.name)) continue;
      triedModels.push(model.name);
      try {
        const reply = await tryModel(model);
        conversation.messages.push({ role: 'assistant', content: reply, timestamp: new Date().toISOString() });
        await upsertConversation(conversation);
        return res.json({ reply, model: model.name, switched: true, triedModels, conversationId: chatId });
      } catch (error) {
        console.error(`Error with ${model.name}:`, error.message);
      }
    }

    return res.status(500).json({ error: 'All AI models failed', triedModels });
  } catch (error) {
    console.error('Chat error:', error);
    return res.status(500).json({ error: 'Server error during chat' });
  }
});

router.get('/conversations', auth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('conversations')
      .select('chat_id,title,created_at,updated_at,messages')
      .eq('user_id', req.user.userId)
      .order('updated_at', { ascending: false });

    if (error) throw error;

    const normalized = (data || []).map((row) => ({
      chatId: row.chat_id,
      title: row.title,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      messages: row.messages || []
    }));

    return res.json(normalized);
  } catch (error) {
    console.error('Get conversations error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.get('/conversations/:chatId', auth, async (req, res) => {
  try {
    const conversation = await getConversation(req.user.userId, req.params.chatId);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    return res.json({
      chatId: conversation.chat_id,
      title: conversation.title,
      createdAt: conversation.created_at,
      updatedAt: conversation.updated_at,
      messages: conversation.messages || []
    });
  } catch (error) {
    console.error('Get conversation error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/conversations', auth, async (req, res) => {
  try {
    const { error, count } = await supabase
      .from('conversations')
      .delete({ count: 'exact' })
      .eq('user_id', req.user.userId);

    if (error) throw error;

    return res.json({ success: true, message: `Deleted ${count || 0} conversations` });
  } catch (error) {
    console.error('Delete conversations error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
