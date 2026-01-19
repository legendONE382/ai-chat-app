# MongoDB Atlas Setup Guide for Vercel Deployment

This guide will help you format your MongoDB Atlas connection string correctly for Vercel deployment.

## 🔑 MongoDB Connection String Format

Your MongoDB Atlas connection string should follow this exact format:

```
mongodb+srv://<username>:<password>@cluster0.example.mongodb.net/ai-chat-app?retryWrites=true&w=majority
```

## 📋 Step-by-Step Setup

### 1. Get Your MongoDB Atlas Connection String

1. **Go to MongoDB Atlas**: https://www.mongodb.com/atlas/database
2. **Click "Connect"** on your cluster
3. **Choose "Connect your application"**
4. **Select Node.js** as the driver
5. **Copy the connection string**

### 2. Format the Connection String

Your connection string should look like this:

```
mongodb+srv://username:password@cluster0.xyz123.mongodb.net/ai-chat-app?retryWrites=true&w=majority
```

**Replace these placeholders:**
- `username` - Your MongoDB database username
- `password` - Your MongoDB database password (URL-encoded)
- `cluster0.xyz123.mongodb.net` - Your actual cluster address
- `ai-chat-app` - Database name (keep this as is)

### 3. URL-Encode Your Password

If your password contains special characters, you need to URL-encode it:

**Common characters to encode:**
- `@` → `%40`
- `:` → `%3A`
- `/` → `%2F`
- `#` → `%23`
- `?` → `%3F`
- `&` → `%26`
- `=` → `%3D`

**Example:**
- Original password: `MyPass@123#`
- Encoded password: `MyPass%40123%23`

### 4. Add to Vercel Environment Variables

1. **Go to your Vercel project**
2. **Click "Settings" → "Environment Variables"**
3. **Add a new variable:**
   - **Name**: `MONGODB_URI`
   - **Value**: Your formatted connection string
   - **Environment**: Production

### 5. Complete MongoDB URI Example

```
mongodb+srv://admin:MySecurePass%40123%23@cluster0.xyz123.mongodb.net/ai-chat-app?retryWrites=true&w=majority
```

## 🔍 Troubleshooting

### If you get "Secret does not exist" error:

1. **Make sure you're adding the variable in the correct Vercel project**
2. **Check that the variable name is exactly `MONGODB_URI`**
3. **Ensure you're adding it to the Production environment**
4. **Redeploy your project after adding the variable**

### Common Issues:
- **Missing database name**: Make sure `/ai-chat-app` is at the end
- **Incorrect password encoding**: Use a URL encoder tool if unsure
- **Wrong cluster address**: Double-check your cluster name
- **Missing query parameters**: Keep `?retryWrites=true&w=majority`

## 📝 Additional Notes

- **Database name must be `ai-chat-app`** - This is what the application expects
- **Use the SRV protocol** - `mongodb+srv://` not just `mongodb://`
- **Enable network access** - Make sure your IP is whitelisted in MongoDB Atlas
- **Check connection** - Test your connection string in MongoDB Compass first

## 🎯 Next Steps

1. **Add the formatted MONGODB_URI to Vercel**
2. **Redeploy your project**
3. **Test the deployment**
4. **Verify user registration works**

Your MongoDB connection should now work perfectly with Vercel!