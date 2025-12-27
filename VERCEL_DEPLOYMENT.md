# AI Chat App - Vercel Deployment Guide

This guide will help you deploy your AI Chat App to Vercel with user registration and remote access capabilities.

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **MongoDB Atlas Account**: Free database at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
3. **AI API Keys**: 
   - Groq: [console.groq.com/keys](https://console.groq.com/keys)
   - Mistral: [console.mistral.ai/api-keys](https://console.mistral.ai/api-keys)
   - OpenAI: [platform.openai.com/api-keys](https://platform.openai.com/api-keys)

## Step 1: Set Up MongoDB Atlas

1. **Create Cluster**:
   - Go to MongoDB Atlas
   - Create a free shared cluster
   - Choose a cloud provider and region (choose one closest to your users)
   - Create a cluster (it may take 5-10 minutes to initialize)

2. **Create Database User**:
   - Go to "Database Access" in MongoDB Atlas
   - Click "Add New Database User"
   - Create a username and password (save these - you'll need them)
   - Grant "Read and Write" access

3. **Get Connection String**:
   - Go to "Network Access" in MongoDB Atlas
   - Click "Add IP Address" and select "Allow Access From Anywhere"
   - Go to "Database" > "Connect" > "Connect your application"
   - Copy the connection string (replace `<username>` and `<password>` with your credentials)
   - Format: `mongodb+srv://<username>:<password>@cluster.mongodb.net/ai-chat-app?retryWrites=true&w=majority`

## Step 2: Get AI API Keys

1. **Groq API Key**:
   - Sign up at [console.groq.com/keys](https://console.groq.com/keys)
   - Create an API key (free tier available)

2. **Mistral API Key**:
   - Sign up at [console.mistral.ai/api-keys](https://console.mistral.ai/api-keys)
   - Create an API key (free tier available)

3. **OpenAI API Key**:
   - Sign up at [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
   - Create an API key (free credits available)

## Step 3: Deploy to Vercel

### Method 1: Vercel CLI (Recommended)

1. **Install Vercel CLI**:
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy**:
   ```bash
   cd ai-chat-app
   vercel
   ```

4. **Set Environment Variables**:
   - During deployment, Vercel will ask for environment variables
   - Enter the following:
     ```
     MONGODB_URI = your_mongodb_connection_string
     GROQ_API_KEY = your_groq_api_key
     MISTRAL_API_KEY = your_mistral_api_key
     OPENAI_API_KEY = your_openai_api_key
     JWT_SECRET = your_random_secret_key
     ```

   **Generate JWT Secret**:
   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```

5. **Deploy to Production**:
   ```bash
   vercel --prod
   ```

### Method 2: GitHub Integration

1. **Push to GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/yourusername/ai-chat-app.git
   git push -u origin main
   ```

2. **Import to Vercel**:
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Select your GitHub repository
   - Configure environment variables
   - Click "Deploy"

## Step 4: Configure Environment Variables

After deployment, add environment variables:

1. **Vercel Dashboard**:
   - Go to your project dashboard
   - Click "Settings" > "Environment Variables"
   - Add all required variables

2. **Required Variables**:
   ```
   MONGODB_URI = mongodb+srv://username:password@cluster.mongodb.net/ai-chat-app?retryWrites=true&w=majority
   GROQ_API_KEY = your_groq_api_key
   MISTRAL_API_KEY = your_mistral_api_key
   OPENAI_API_KEY = your_openai_api_key
   JWT_SECRET = your_random_secret_key
   ```

## Step 5: Test the Application

1. **Access Your App**:
   - Use the Vercel deployment URL
   - The app should show the authentication modal

2. **Register a User**:
   - Click "Register" tab
   - Enter email and password (min 6 characters)
   - Complete registration

3. **Login**:
   - Use your credentials to login
   - Start chatting with AI models

4. **Test Mobile Access**:
   - Open the app on your mobile phone
   - The responsive design should work well
   - Test chat functionality on mobile

## Step 6: Custom Domain (Optional)

1. **Add Custom Domain**:
   - In Vercel dashboard, go to "Settings" > "Domains"
   - Add your custom domain
   - Update DNS records as instructed

2. **SSL Certificate**:
   - Vercel automatically provides SSL certificates
   - Your app will be accessible via HTTPS

## Troubleshooting

### Common Issues:

1. **Database Connection Errors**:
   - Verify MongoDB Atlas connection string
   - Check that IP access is allowed from anywhere
   - Ensure database user has correct permissions

2. **API Key Issues**:
   - Verify all API keys are correct
   - Check that API keys have sufficient quota
   - Ensure API keys are active

3. **JWT Errors**:
   - Verify JWT secret is set correctly
   - Check that JWT tokens are being stored properly

4. **CORS Issues**:
   - Vercel handles CORS automatically
   - If issues occur, check browser console for errors

### Performance Optimization:

1. **Database Indexes**:
   - MongoDB Atlas automatically creates indexes
   - Monitor query performance in Atlas dashboard

2. **API Response Time**:
   - Monitor AI API response times
   - Consider adding caching for frequent queries

3. **Static Assets**:
   - Frontend files are served from Vercel CDN
   - Optimize images if needed

## Security Considerations

1. **Environment Variables**:
   - Never commit secrets to git
   - Use Vercel environment variables
   - Regularly rotate API keys and JWT secrets

2. **Database Security**:
   - Use MongoDB Atlas IP whitelisting
   - Enable encryption at rest
   - Regular security audits

3. **Application Security**:
   - Password hashing is implemented
   - JWT tokens have expiration
   - Input validation on all endpoints

## Monitoring and Analytics

1. **Vercel Analytics**:
   - Monitor traffic and performance
   - Set up alerts for errors

2. **MongoDB Atlas Monitoring**:
   - Monitor database performance
   - Set up alerts for high usage

3. **Uptime Monitoring**:
   - Use external services to monitor uptime
   - Set up alerts for downtime

## Cost Management

1. **Vercel**:
   - Free tier includes generous serverless functions
   - Monitor usage to avoid overages

2. **MongoDB Atlas**:
   - Free tier includes 512MB storage
   - Monitor storage usage

3. **AI APIs**:
   - Monitor usage quotas
   - Set up usage alerts

Your AI Chat App is now deployed and accessible from anywhere, including mobile devices!