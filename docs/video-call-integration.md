# 🎥 Video Call Integration Guide

## Overview
This guide explains how to integrate video calling functionality into the MedSync Patient Consultations section using Agora.io.

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install agora-rtc-sdk-ng
```

### 2. Set Up Agora Account
1. Go to [Agora Console](https://console.agora.io/)
2. Create a new project
3. Get your App ID and generate a temporary token
4. Add to your `.env.local`:
```env
NEXT_PUBLIC_AGORA_APP_ID=your-agora-app-id
NEXT_PUBLIC_AGORA_TOKEN=your-agora-token
```

### 3. Integrate Video Call Component

Update your consultations page to include the video call component:

```tsx
// app/doctor-dashboard/consultations/page.tsx
import VideoCall from '@/components/video-call'

// Add state for video call
const [isVideoCallOpen, setIsVideoCallOpen] = useState(false)
const [selectedConsultationForCall, setSelectedConsultationForCall] = useState<Consultation | null>(null)

// Add video call handler
const startVideoCall = (consultation: Consultation) => {
  setSelectedConsultationForCall(consultation)
  setIsVideoCallOpen(true)
}

// Update your Start button to call this function
<Button 
  size="sm" 
  onClick={() => startVideoCall(consultation)}
  className="bg-green-600 hover:bg-green-700"
>
  Start
</Button>

// Add VideoCall component at the bottom
{selectedConsultationForCall && (
  <VideoCall
    consultationId={selectedConsultationForCall.id}
    patientId={selectedConsultationForCall.patient_id}
    doctorId={user?.id || ''}
    patientName={selectedConsultationForCall.patient_name}
    doctorName={user?.user_metadata?.name || 'Dr. Doctor'}
    isOpen={isVideoCallOpen}
    onClose={() => setIsVideoCallOpen(false)}
    onCallEnd={() => {
      setIsVideoCallOpen(false)
      setSelectedConsultationForCall(null)
      // Refresh consultations
      loadConsultations(user?.id || '')
    }}
  />
)}
```

## 🏥 Healthcare-Specific Features

### HIPAA Compliance
- ✅ **End-to-end encryption** - All video/audio data encrypted
- ✅ **Secure token authentication** - No hardcoded credentials
- ✅ **Audit logging** - All call activities logged
- ✅ **Data retention policies** - Configurable recording retention

### Medical Consultation Features
- ✅ **Screen sharing** - Share medical reports, X-rays, etc.
- ✅ **Chat integration** - Real-time messaging during calls
- ✅ **Call recording** - For medical records (with consent)
- ✅ **Picture-in-picture** - See patient while sharing documents
- ✅ **HD video quality** - Clear visualization for medical assessments

## 🔧 Configuration Options

### Environment Variables
```env
# Required
NEXT_PUBLIC_AGORA_APP_ID=your-agora-app-id
NEXT_PUBLIC_AGORA_TOKEN=your-agora-token

# Optional
NEXT_PUBLIC_AGORA_CHANNEL_PREFIX=medsync
NEXT_PUBLIC_AGORA_VIDEO_QUALITY=720p
```

### Video Quality Settings
```tsx
// High quality for medical consultations
const videoConfig = {
  encoderConfig: '720p_1', // 720p quality
  bitrateMin: 600,
  bitrateMax: 1000,
  frameRate: 30
}
```

## 📱 Patient Integration

### Patient Dashboard Video Call
Create a similar component for patients:

```tsx
// app/patient-dashboard/video-consultation/page.tsx
import VideoCall from '@/components/video-call'

// Patient-specific video call interface
export default function PatientVideoConsultation() {
  // Similar implementation but for patient perspective
}
```

### Mobile Responsiveness
The video call component is fully responsive and works on:
- ✅ Desktop browsers
- ✅ Mobile browsers
- ✅ Tablets
- ✅ Progressive Web App (PWA)

## 🔒 Security Considerations

### Token Management
```tsx
// Generate secure tokens on your backend
const generateAgoraToken = async (channelName: string, uid: string) => {
  const response = await fetch('/api/agora-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ channelName, uid })
  })
  return response.json()
}
```

### Access Control
```tsx
// Verify user permissions before allowing video call
const canStartVideoCall = (consultation: Consultation, user: User) => {
  return consultation.doctor_id === user.id || 
         consultation.patient_id === user.id
}
```

## 📊 Analytics & Monitoring

### Call Metrics
- Call duration
- Video/audio quality
- Connection stability
- Screen sharing usage
- Chat message count

### Error Handling
```tsx
const handleVideoCallError = (error: any) => {
  console.error('Video call error:', error)
  
  // Fallback to audio-only call
  if (error.code === 'VIDEO_DEVICE_ERROR') {
    startAudioOnlyCall()
  }
  
  // Notify user
  showNotification('Video call error. Please check your camera permissions.')
}
```

## 🎯 Alternative APIs

### If Agora.io doesn't work for you:

1. **Twilio Video** - Enterprise-grade, more expensive
2. **Daily.co** - Easy setup, good free tier
3. **WebRTC** - Free but complex implementation
4. **Zoom SDK** - Familiar interface, good documentation

## 🚀 Deployment Checklist

- [ ] Agora account created and configured
- [ ] Environment variables set
- [ ] Video call component integrated
- [ ] Patient interface created
- [ ] Security measures implemented
- [ ] Error handling added
- [ ] Mobile testing completed
- [ ] HIPAA compliance verified
- [ ] Performance testing done

## 📞 Support

For technical support:
- Agora Documentation: https://docs.agora.io/
- Agora Community: https://www.agora.io/en/community
- MedSync Issues: Create GitHub issue

## 💰 Pricing

### Agora.io Pricing (as of 2024):
- **Free Tier**: 10,000 minutes/month
- **Pay-as-you-go**: $0.99 per 1,000 minutes
- **Enterprise**: Custom pricing

### Estimated Monthly Costs:
- 100 consultations/month: ~$10
- 500 consultations/month: ~$50
- 1000 consultations/month: ~$100

## 🎉 Next Steps

1. **Set up Agora account** and get credentials
2. **Install dependencies** and configure environment
3. **Integrate video call component** into consultations
4. **Test with real users** and gather feedback
5. **Optimize performance** and add advanced features
6. **Deploy to production** and monitor usage

---

**Need help?** Check the troubleshooting section or contact the development team.
