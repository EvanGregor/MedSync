#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
MedSync ML Service
FastAPI service for medical image analysis using ML models
"""

from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
import pickle
from PIL import Image
import numpy as np
import io

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load models
try:
    with open('bone_fracture_model.pkl', 'rb') as f:
        xray_model = pickle.load(f)
    print("✅ Bone fracture model loaded successfully")
except Exception as e:
    print(f"❌ Error loading bone fracture model: {e}")
    xray_model = None

try:
    with open('brain_tumor_model.pkl', 'rb') as f:
        brain_tumor_wrapped = pickle.load(f)
        # Extract model from wrapped format
        mri_model = brain_tumor_wrapped['model']
        brain_tumor_class_names = brain_tumor_wrapped.get('class_names', ['No Tumor', 'Tumor'])
        brain_tumor_input_shape = brain_tumor_wrapped.get('input_shape', (150, 150))
    print("✅ Brain tumor model loaded successfully")
except Exception as e:
    print(f"❌ Error loading brain tumor model: {e}")
    mri_model = None
    brain_tumor_class_names = ['No Tumor', 'Tumor']
    brain_tumor_input_shape = (150, 150)

def preprocess_image(image_bytes):
    """Preprocess image for model input - FIXED to match direct testing specifications"""
    try:
        # Convert to RGB (3 channels) and resize to 150x150 as per model requirements
        image = Image.open(io.BytesIO(image_bytes)).convert('RGB').resize((150, 150))
        arr = np.array(image) / 255.0  # Normalize to [0, 1]
        # Return shape (1, 150, 150, 3) for RGB
        return arr.reshape(1, 150, 150, 3)
    except Exception as e:
        print(f"Error preprocessing image: {e}")
        return None

def get_prediction_and_confidence(model, arr):
    """Get prediction and confidence for Keras Sequential models"""
    try:
        # Get raw prediction
        pred_raw = model.predict(arr, verbose=0)
        
        # Handle different prediction formats
        if pred_raw.shape[1] == 1:
            # Binary classification - single output
            predicted_class = int(pred_raw[0][0] > 0.5)
            confidence = pred_raw[0][0] if predicted_class == 1 else 1 - pred_raw[0][0]
        else:
            # Multi-class classification
            predicted_class = np.argmax(pred_raw[0])
            confidence = np.max(pred_raw[0])
            
        return predicted_class, float(confidence)
    except Exception as e:
        print(f"Error in prediction: {e}")
        return 0, 0.5

@app.post('/analyze')
async def analyze(scan_type: str = Form(...), file: UploadFile = File(...)):
    """Analyze medical images using appropriate ML models"""
    try:
        image_bytes = await file.read()
        arr = preprocess_image(image_bytes)
        
        if arr is None:
            return {
                'error': 'Failed to preprocess image',
                'findings': 'Image processing failed. Please check image format.',
                'confidence': 0.0,
                'recommendations': 'Please upload a valid medical image.',
                'severity': 'unknown'
            }

        # Route to appropriate model based on scan type
        if scan_type.lower() in ['xray', 'x_ray', 'chest_xray', 'bone_xray']:
            if xray_model is None:
                return {
                    'error': 'X-ray model not available',
                    'findings': 'X-ray analysis model is not loaded.',
                    'confidence': 0.0,
                    'recommendations': 'Please contact system administrator.',
                    'severity': 'unknown'
                }
            
            # Use bone fracture model for X-rays
            pred, confidence = get_prediction_and_confidence(xray_model, arr)
            
            if pred == 1:
                findings = 'High probability of bone fracture or significant abnormality detected in the X-ray image.'
                severity = 'severe' if confidence > 0.8 else 'moderate'
                recommendations = 'Immediate consultation with orthopedic specialist recommended. Consider additional imaging if needed.'
            else:
                findings = 'No significant bone fracture or abnormality detected in the X-ray image.'
                severity = 'mild'
                recommendations = 'Continue with current treatment plan. Follow-up as scheduled.'
                
        elif scan_type.lower() in ['mri', 'mri_brain', 'brain_mri']:
            if mri_model is None:
                return {
                    'error': 'MRI model not available',
                    'findings': 'MRI analysis model is not loaded.',
                    'confidence': 0.0,
                    'recommendations': 'Please contact system administrator.',
                    'severity': 'unknown'
                }
            
            # Use brain tumor model for MRIs
            pred, confidence = get_prediction_and_confidence(mri_model, arr)
            
            if pred == 1:
                findings = 'Possible brain tumor or mass lesion detected in the MRI scan. Immediate attention required.'
                severity = 'critical' if confidence > 0.8 else 'severe'
                recommendations = 'URGENT: Immediate consultation with neurosurgeon recommended. Consider emergency imaging follow-up.'
            else:
                findings = 'No brain tumor or significant abnormality detected in the MRI scan.'
                severity = 'mild'
                recommendations = 'Continue with current treatment plan. Follow-up as scheduled.'
                
        else:
            # Generic analysis for other scan types
            findings = f'Analysis completed for {scan_type} scan. Please review manually for detailed assessment.'
            confidence = 0.5
            severity = 'moderate'
            recommendations = 'Consult a specialist for further evaluation and interpretation.'

        return {
            'findings': findings,
            'confidence': round(confidence, 3),
            'recommendations': recommendations,
            'severity': severity,
            'model_used': scan_type.lower(),
            'prediction': pred
        }
        
    except Exception as e:
        print(f"Error in analysis: {e}")
        return {
            'error': 'Analysis failed',
            'findings': 'AI analysis encountered an error. Please review manually.',
            'confidence': 0.0,
            'recommendations': 'Manual review recommended.',
            'severity': 'unknown'
        }

@app.get('/health')
async def health_check():
    """Health check endpoint"""
    return {
        'status': 'healthy',
        'xray_model_loaded': xray_model is not None,
        'mri_model_loaded': mri_model is not None
    }

if __name__ == "__main__":
    import uvicorn
    print("🚀 Starting MedSync ML Service...")
    print("📍 Service will be available at: http://localhost:8000")
    print("🔍 Health check: http://localhost:8000/health")
    uvicorn.run(app, host="0.0.0.0", port=8000)
