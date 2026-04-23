# 🚨 Agora App ID Error - Quick Fix Guide

## Error: "invalid vendor key, can not find appid"

This error occurs when the Agora App ID is not properly configured or is invalid.

## 🔧 **Immediate Fix Steps**

### **Step 1: Check Your .env.local File**

Create or update your `.env.local` file in the root directory:

```env
# Agora Configuration - REPLACE WITH YOUR ACTUAL VALUES
NEXT_PUBLIC_AGORA_APP_ID=your-actual-agora-app-id-here
NEXT_PUBLIC_AGORA_TOKEN=your-actual-agora-token-here
```

### **Step 2: Get Your Agora App ID**

1. **Go to [Agora Console](https://console.agora.io/)**
2. **Sign in to your account**
3. **Create a new project** (if you don't have one)
4. **Copy the App ID** from your project dashboard
5. **Replace `your-actual-agora-app-id-here` with your real App ID**

### **Step 3: Generate a Token**

1. **In your Agora project dashboard**
2. **Go to "Project Management" → "Token"**
3. **Click "Generate Token"**
4. **Set expiration to 24 hours**
5. **Copy the generated token**
6. **Replace `your-actual-agora-token-here` with your real token**

### **Step 4: Restart Your Development Server**

```bash
# Stop your current server (Ctrl+C)
# Then restart it
npm run dev
```

## 🔍 **Verify Configuration**

After updating your `.env.local`, check the browser console for this debug message:

```
🔍 Agora Configuration: {
  appId: "your-actual-app-id",
  hasToken: true,
  tokenLength: 123,
  isDefaultAppId: false
}
```

If you see `isDefaultAppId: true`, your environment variables are not being read correctly.

## 🚨 **Common Issues**

### **Issue 1: Environment Variables Not Loading**
- Make sure your `.env.local` file is in the **root directory** (same level as `package.json`)
- Make sure the file is named exactly `.env.local` (not `.env` or `.env.local.txt`)
- Restart your development server after making changes

### **Issue 2: Invalid App ID**
- App IDs should be **32 characters long**
- They look like: `1234567890abcdef1234567890abcdef`
- Make sure you copied the entire App ID

### **Issue 3: Invalid Token**
- Tokens should be **long strings** (usually 100+ characters)
- They contain letters, numbers, and special characters
- Make sure you copied the entire token

## 🎯 **Test the Fix**

1. **Open your browser console** (F12)
2. **Navigate to the video call page**
3. **Click "Start Video Call"**
4. **Check for the debug message** in the console
5. **The error should be resolved**

## 📞 **Still Having Issues?**

If you're still getting the error after following these steps:

1. **Double-check your App ID** - Make sure it's exactly 32 characters
2. **Verify your token** - Make sure it's a long string
3. **Check file permissions** - Make sure `.env.local` is readable
4. **Try a different browser** - Sometimes browser cache can cause issues

## 🆘 **Need Help?**

- **Agora Documentation**: https://docs.agora.io/
- **Agora Console**: https://console.agora.io/
- **Create a GitHub issue** for technical support

---

**Remember**: Never commit your actual Agora credentials to version control. The `.env.local` file should be in your `.gitignore`.



