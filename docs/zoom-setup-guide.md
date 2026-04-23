# 🎥 Zoom Video Call Integration Setup Guide

## Overview

This guide will help you set up Zoom video calls in your MedSync application using Zoom's Meeting SDK for Web.

## 🚀 **Quick Setup**

### **Step 1: Get Zoom Credentials**

1. **Go to [Zoom App Marketplace](https://marketplace.zoom.us/)**
2. **Sign in to your Zoom account**
3. **Click "Develop" → "Build App"**
4. **Choose "Meeting SDK"**
5. **Fill in basic app information**
6. **Get your SDK Key and SDK Secret**

### **Step 2: Configure Environment Variables**

Create or update your `.env.local` file in the root directory:

```env
# Zoom Configuration
NEXT_PUBLIC_ZOOM_SDK_KEY=your-zoom-sdk-key-here
NEXT_PUBLIC_ZOOM_SDK_SECRET=your-zoom-sdk-secret-here
```

### **Step 3: Restart Development Server**

```bash
# Stop your current server (Ctrl+C)
# Then restart it
npm run dev
```

## 🔧 **Detailed Setup Instructions**

### **1. Create Zoom App**

1. **Visit [Zoom App Marketplace](https://marketplace.zoom.us/)**
2. **Sign in with your Zoom account**
3. **Click "Develop" in the top navigation**
4. **Click "Build App"**
5. **Select "Meeting SDK"**
6. **Choose "JWT" as the app type**
7. **Fill in the required information:**
   - **App name**: `MedSync Video Calls`
   - **App type**: `Meeting SDK`
   - **User type**: `Account`
   - **App description**: `Video consultation platform for healthcare`

### **2. Configure App Settings**

#### **Basic Information**
- **App name**: `MedSync Video Calls`
- **App type**: `Meeting SDK`
- **User type**: `Account`

#### **Meeting SDK Configuration**
1. **Go to "Meeting SDK" tab**
2. **Enable "Meeting SDK"**
3. **Add your domain to "Web SDK domains"**:
   - For development: `localhost:3000`
   - For production: `yourdomain.com`
4. **Save the configuration**

#### **JWT Configuration**
1. **Go to "JWT" tab**
2. **Copy your "SDK Key" and "SDK Secret"**
3. **Set token expiration to 24 hours**
4. **Save the configuration**

### **3. Environment Variables**

Add these to your `.env.local` file:

```env
# Zoom Meeting SDK Configuration
NEXT_PUBLIC_ZOOM_SDK_KEY=your-actual-sdk-key-here
NEXT_PUBLIC_ZOOM_SDK_SECRET=your-actual-sdk-secret-here
```

**Important**: 
- Replace `your-actual-sdk-key-here` with your real SDK Key
- Replace `your-actual-sdk-secret-here` with your real SDK Secret
- Never commit these values to version control

### **4. Verify Configuration**

After setting up, check your browser console for this debug message:

```
🔍 Zoom Configuration: {
  sdkKey: "your-actual-sdk-key",
  hasSecret: true,
  secretLength: 123,
  isDefaultSdkKey: false
}
```

If you see `isDefaultSdkKey: true`, your environment variables are not being read correctly.

## 🎯 **Features Included**

### **Video Call Features**
- ✅ **HD Video Calls** - High-quality video streaming
- ✅ **Audio Controls** - Mute/unmute functionality
- ✅ **Video Controls** - Turn camera on/off
- ✅ **Screen Sharing** - Share your screen during calls
- ✅ **Chat Messaging** - Real-time text chat during calls
- ✅ **Meeting Management** - Auto-generated meeting IDs and passwords
- ✅ **Role-based Access** - Doctors as hosts, patients as attendees

### **UI Features**
- ✅ **Modern Interface** - Clean, professional design
- ✅ **Responsive Design** - Works on desktop and mobile
- ✅ **Real-time Status** - Connection status indicators
- ✅ **Error Handling** - User-friendly error messages
- ✅ **Loading States** - Smooth loading animations

## 🔒 **Security Considerations**

### **Production Security**
1. **Server-side Token Generation**: In production, generate JWT tokens server-side
2. **Domain Restrictions**: Restrict Zoom SDK to your production domain
3. **HTTPS Required**: Zoom SDK requires HTTPS in production
4. **Token Expiration**: Set appropriate token expiration times

### **HIPAA Compliance**
- **Zoom for Healthcare**: Consider upgrading to Zoom for Healthcare for HIPAA compliance
- **Data Encryption**: All video calls are encrypted end-to-end
- **Audit Logs**: Enable audit logging for compliance requirements

## 🚨 **Troubleshooting**

### **Common Issues**

#### **Issue 1: "SDK not loaded" Error**
**Solution**: 
- Check your internet connection
- Verify Zoom SDK scripts are loading
- Check browser console for script loading errors

#### **Issue 2: "Invalid SDK Key" Error**
**Solution**:
- Verify your SDK Key is correct
- Check that environment variables are loaded
- Restart your development server

#### **Issue 3: "Domain not allowed" Error**
**Solution**:
- Add your domain to Zoom App Marketplace settings
- For development: add `localhost:3000`
- For production: add your actual domain

#### **Issue 4: Video/Audio Not Working**
**Solution**:
- Check browser permissions for camera/microphone
- Ensure you're using HTTPS in production
- Try refreshing the page

### **Debug Steps**

1. **Check Browser Console** for error messages
2. **Verify Environment Variables** are loaded correctly
3. **Test with Different Browser** to rule out browser-specific issues
4. **Check Network Tab** for failed script loads
5. **Verify Zoom App Settings** in marketplace

## 📱 **Mobile Support**

The Zoom SDK works on mobile browsers, but with some limitations:
- **iOS Safari**: Full support
- **Android Chrome**: Full support
- **Mobile-specific features**: Touch-friendly controls

## 🔄 **Migration from Agora**

If you're migrating from Agora to Zoom:

1. **Remove Agora dependencies**:
   ```bash
   npm uninstall agora-rtc-sdk-ng
   ```

2. **Install Zoom SDK**:
   ```bash
   npm install @zoom/meetingsdk
   ```

3. **Update environment variables**:
   - Remove `NEXT_PUBLIC_AGORA_APP_ID`
   - Remove `NEXT_PUBLIC_AGORA_TOKEN`
   - Add `NEXT_PUBLIC_ZOOM_SDK_KEY`
   - Add `NEXT_PUBLIC_ZOOM_SDK_SECRET`

4. **Replace video call components**:
   - Use `ZoomVideoCall` instead of `VideoCall`
   - Update component props as needed

## 📞 **Support**

### **Zoom Support**
- **Zoom Developer Support**: https://developers.zoom.us/
- **Zoom Documentation**: https://marketplace.zoom.us/docs/sdk
- **Zoom Community**: https://devforum.zoom.us/

### **Application Support**
- **GitHub Issues**: Create an issue in your repository
- **Documentation**: Check this guide and other docs
- **Console Logs**: Check browser console for detailed error messages

## 🎉 **Next Steps**

After successful setup:

1. **Test video calls** between doctor and patient accounts
2. **Customize the UI** to match your brand
3. **Add additional features** like recording, breakout rooms
4. **Implement server-side token generation** for production
5. **Set up monitoring** and analytics

---

**Remember**: Keep your Zoom credentials secure and never expose them in client-side code in production. Use server-side token generation for production applications.
