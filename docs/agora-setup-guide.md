# 🎥 Agora.io Video Call Setup Guide

## Overview
This guide will help you set up Agora.io for video calling functionality in MedSync.

## 🚀 Quick Setup

### 1. Create Agora Account
1. Go to [Agora Console](https://console.agora.io/)
2. Sign up for a free account
3. Create a new project
4. Note down your **App ID**

### 2. Generate Token (Development)
For development, you can use a temporary token:

1. In your Agora Console project
2. Go to **Project Management** → **Token**
3. Click **Generate Token**
4. Set expiration to 24 hours
5. Copy the generated token

### 3. Environment Variables
Add these to your `.env.local` file:

```env
# Agora Configuration
NEXT_PUBLIC_AGORA_APP_ID=your-agora-app-id-here
NEXT_PUBLIC_AGORA_TOKEN=your-agora-token-here

# Optional: Custom channel prefix
NEXT_PUBLIC_AGORA_CHANNEL_PREFIX=medsync
```

### 4. Test the Integration
1. Start your development server: `npm run dev`
2. Navigate to doctor consultations or patient video consultations
3. Click "Start Video Call" or "Join Video Call"
4. Allow camera and microphone permissions
5. Test the video call functionality

## 🔒 Production Setup

### 1. Token Server (Required for Production)
For production, you need a token server to generate secure tokens:

```typescript
// pages/api/agora-token.ts
import { RtcTokenBuilder, RtcRole } from 'agora-access-token'

export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { channelName, uid } = req.body
  
  if (!channelName || !uid) {
    return res.status(400).json({ error: 'Missing channelName or uid' })
  }

  const appID = process.env.AGORA_APP_ID
  const appCertificate = process.env.AGORA_APP_CERTIFICATE
  
  if (!appID || !appCertificate) {
    return res.status(500).json({ error: 'Agora configuration missing' })
  }

  const token = RtcTokenBuilder.buildTokenWithUid(
    appID,
    appCertificate,
    channelName,
    uid,
    RtcRole.PUBLISHER,
    Math.floor(Date.now() / 1000) + 3600 // 1 hour expiration
  )

  res.json({ token })
}
```

### 2. Production Environment Variables
```env
# Agora Production Configuration
AGORA_APP_ID=your-agora-app-id
AGORA_APP_CERTIFICATE=your-agora-app-certificate

# Remove the public token for production
# NEXT_PUBLIC_AGORA_TOKEN=remove-this-for-production
```

### 3. Update Video Call Component
For production, update the token generation in the video call component:

```typescript
// In components/video-call.tsx
const getAgoraToken = async (channelName: string, uid: string) => {
  const response = await fetch('/api/agora-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ channelName, uid })
  })
  const data = await response.json()
  return data.token
}

// Use in initializeAgora function
const token = await getAgoraToken(consultationId, client.uid)
await client.join(AGORA_APP_ID, consultationId, token, client.uid)
```

## 🏥 Healthcare Compliance

### HIPAA Considerations
- ✅ **End-to-end encryption** - Agora provides this by default
- ✅ **Secure token authentication** - No hardcoded credentials
- ✅ **Audit logging** - Implement custom logging for medical consultations
- ✅ **Data retention** - Configure appropriate retention policies

### Additional Security Measures
1. **Channel Naming**: Use unique, non-guessable channel names
2. **Token Expiration**: Set short token expiration times (1 hour max)
3. **User Authentication**: Verify user permissions before allowing calls
4. **Call Recording**: Implement with patient consent

## 📊 Monitoring & Analytics

### Agora Analytics
1. Go to **Agora Console** → **Analytics**
2. Monitor:
   - Call quality metrics
   - Connection stability
   - Usage statistics
   - Error rates

### Custom Analytics
Track consultation metrics in your database:

```sql
-- Add to appointments table
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS call_duration INTEGER;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS call_quality_score INTEGER;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS call_started_at TIMESTAMP;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS call_ended_at TIMESTAMP;
```

## 🔧 Troubleshooting

### Common Issues

#### 1. Camera/Microphone Not Working
```javascript
// Check permissions
navigator.mediaDevices.getUserMedia({ video: true, audio: true })
  .then(stream => console.log('Permissions granted'))
  .catch(err => console.error('Permission denied:', err))
```

#### 2. Connection Issues
- Check internet connection
- Verify Agora App ID and token
- Check firewall settings
- Try different browsers

#### 3. Video Quality Issues
```typescript
// Adjust video quality settings
const [audioTrack, videoTrack] = await AgoraRTC.default.createMicrophoneAndCameraTracks({
  encoderConfig: '480p_1', // Lower quality for better performance
  optimizationMode: 'balanced'
})
```

### Debug Mode
Enable debug logging:

```typescript
// In components/video-call.tsx
const client = AgoraRTC.default.createClient({ 
  mode: 'rtc', 
  codec: 'vp8',
  logLevel: 1 // Enable debug logging
})
```

## 💰 Pricing & Limits

### Agora Free Tier
- **10,000 minutes/month** free
- **100 concurrent users** max
- **HD video** support
- **Screen sharing** included

### Paid Plans
- **Pay-as-you-go**: $0.99 per 1,000 minutes
- **Enterprise**: Custom pricing
- **Premium support**: Available

### Cost Estimation
- 100 consultations/month: ~$10
- 500 consultations/month: ~$50
- 1000 consultations/month: ~$100

## 🚀 Deployment Checklist

- [ ] Agora account created
- [ ] App ID and certificate obtained
- [ ] Environment variables configured
- [ ] Token server implemented (production)
- [ ] Video call component tested
- [ ] Database tables created
- [ ] Security policies implemented
- [ ] Monitoring setup
- [ ] Error handling tested
- [ ] Mobile responsiveness verified

## 📞 Support

### Agora Support
- [Agora Documentation](https://docs.agora.io/)
- [Agora Community](https://www.agora.io/en/community)
- [Agora Support](https://www.agora.io/en/support)

### MedSync Support
- Create GitHub issue for technical problems
- Check troubleshooting section above
- Review error logs in browser console

---

**Need help?** Contact the development team or check the troubleshooting section.
