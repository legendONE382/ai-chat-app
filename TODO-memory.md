# AI Chat App Memory Implementation TODO

- [x] Add in-memory conversation storage in server.js (use Map to store chatId -> messages array)
- [x] Modify /chat endpoint to accept chatId, load conversation history, include context in AI prompt, and save new messages
- [x] Update frontend script.js to send chatId with each message in POST request
- [x] Ensure chatId is generated on new chat and included in requests
- [x] Test short-term memory by running the app and checking if context is maintained in conversations
