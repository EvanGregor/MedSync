# 🚨 Zoom SDK Error - Quick Fix Guide

## Error: "SDK not loaded" or "Invalid SDK Key"

This error occurs when the Zoom SDK is not properly configured or loaded.

## 🔧 **Immediate Fix Steps**

### **Step 1: Check Your .env.local File**

Create or update your `.env.local` file in the root directory:

```env
# Zoom Configuration - REPLACE WITH YOUR ACTUAL VALUES
NEXT_PUBLIC_ZOOM_SDK_KEY=your-actual-zoom-sdk-key-here
NEXT_PUBLIC_ZOOM_SDK_SECRET=your-actual-zoom-sdk-secret-here
```

### **Step 2: Get Your Zoom SDK Key**

1. **Go to [Zoom App Marketplace](https://marketplace.zoom.us/)**
2. **Sign in to your account**
3. **Click "Develop" → "Build App"**
4. **Select "Meeting SDK"**
5. **Choose "JWT" app type**
6. **Copy the SDK Key and SDK Secret**
7. **Replace the placeholder values in your `.env.local`**

### **Step 3: Configure Your Zoom App**

1. **In your Zoom app settings**
2. **Go to "Meeting SDK" tab**
3. **Add your domain to "Web SDK domains"**:
   - For development: `localhost:3000`
   - For production: `yourdomain.com`
4. **Save the configuration**

### **Step 4: Restart Your Development Server**

```bash
# Stop your current server (Ctrl+C)
# Then restart it
npm run dev
```

## 🔍 **Verify Configuration**

After updating your `.env.local`, check the browser console for this debug message:

```
🔍 Zoom Configuration: {
  sdkKey: "your-actual-sdk-key",
  hasSecret: true,
  secretLength: 123,
  isDefaultSdkKey: false
}
```

If you see `isDefaultSdkKey: true`, your environment variables are not being read correctly.

## 🚨 **Common Issues**

### **Issue 1: Environment Variables Not Loading**
- Make sure your `.env.local` file is in the **root directory** (same level as `package.json`)
- Make sure the file is named exactly `.env.local` (not `.env` or `.env.local.txt`)
- Restart your development server after making changes

### **Issue 2: Invalid SDK Key**
- SDK Keys should be **long strings** (usually 20+ characters)
- Make sure you copied the entire SDK Key from Zoom Marketplace
- Verify you're using the correct app's credentials

### **Issue 3: Domain Not Allowed**
- Add `localhost:3000` to your Zoom app's Web SDK domains for development
- Add your production domain for production use
- Make sure the domain matches exactly

### **Issue 4: SDK Scripts Not Loading**
- Check your internet connection
- Verify you can access `https://source.zoom.us/`
- Try refreshing the page

## 🎯 **Test the Fix**

1. **Open your browser console** (F12)
2. **Navigate to the video call page**
3. **Click "Start Video Call"**
4. **Check for the debug message** in the console
5. **The error should be resolved**

## 📞 **Still Having Issues?**

If you're still getting the error after following these steps:

1. **Double-check your SDK Key** - Make sure it's the correct one from your Zoom app
2. **Verify your domain settings** - Make sure `localhost:3000` is added to Web SDK domains
3. **Check file permissions** - Make sure `.env.local` is readable
4. **Try a different browser** - Sometimes browser cache can cause issues
5. **Clear browser cache** - Clear all cache and cookies

## 🆘 **Need Help?**

- **Zoom Documentation**: https://marketplace.zoom.us/docs/sdk
- **Zoom Developer Support**: https://developers.zoom.us/
- **Create a GitHub issue** for technical support

---

**Remember**: Never commit your actual Zoom credentials to version control. The `.env.local` file should be in your `.gitignore`.
