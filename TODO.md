# TODO: Implement User Registration and Remote Access for AI Chat App

## Step 1: Set Up Authentication
- [x] Add JWT and bcrypt dependencies to package.json
- [x] Create User model (email, password hash) using Mongoose
- [x] Add /register endpoint for user sign-up
- [x] Add /login endpoint for authentication and JWT issuance
- [x] Create JWT middleware to protect /chat and /generate-title routes

## Step 2: Database Integration
- [ ] Set up MongoDB Atlas connection
- [ ] Create Conversation model for persistent chat history
- [ ] Replace in-memory conversations with DB storage in chat logic

## Step 3: Convert to Vercel-Compatible Structure
- [ ] Move Express routes to api/ folder as serverless functions
- [ ] Update package.json for Vercel deployment
- [ ] Create vercel.json if needed

## Step 4: Frontend Updates
- [ ] Add login/register forms to index.html
- [ ] Update JavaScript to handle auth, store JWT, and send with requests
- [ ] Ensure UI is responsive for mobile

## Step 5: Deploy to Vercel
- [ ] Initialize Vercel project
- [ ] Add environment variables (API keys, DB connection)
- [ ] Deploy and test the app
