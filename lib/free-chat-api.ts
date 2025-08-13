// Free Chat API alternatives
// 1. Hugging Face Inference API (free tier)
// 2. Ollama (local, completely free)

export interface ChatResponse {
  success: boolean
  message: string
  error?: string
}

// Hugging Face Inference API - Free tier
const HF_API_URL = "https://api-inference.huggingface.co/models/microsoft/DialoGPT-medium"
const HF_API_KEY = process.env.NEXT_PUBLIC_HF_API_KEY // Optional, works without key for some models

export async function callHuggingFaceAPI(prompt: string, context: string = ""): Promise<ChatResponse> {
  try {
    const fullPrompt = context ? `${context}\n\nUser: ${prompt}` : `User: ${prompt}`
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    
    if (HF_API_KEY) {
      headers['Authorization'] = `Bearer ${HF_API_KEY}`
    }

    const response = await fetch(HF_API_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        inputs: fullPrompt,
        parameters: {
          max_length: 150,
          temperature: 0.7,
          do_sample: true
        }
      })
    })

    if (!response.ok) {
      throw new Error(`HF API request failed: ${response.status}`)
    }

    const data = await response.json()
    
    if (data && data[0] && data[0].generated_text) {
      return {
        success: true,
        message: data[0].generated_text.trim()
      }
    } else {
      throw new Error('Invalid HF API response format')
    }
  } catch (error) {
    console.error('Hugging Face API Error:', error)
    return {
      success: false,
      message: "I'm having trouble connecting to my knowledge base. Please try again later.",
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// Ollama API - Local, completely free
const OLLAMA_API_URL = process.env.NEXT_PUBLIC_OLLAMA_URL || "http://localhost:11434"

export async function callOllamaAPI(prompt: string, context: string = ""): Promise<ChatResponse> {
  try {
    const fullPrompt = context ? `${context}\n\n${prompt}` : prompt
    
    const response = await fetch(`${OLLAMA_API_URL}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "llama2", // or "mistral", "codellama", etc.
        prompt: fullPrompt,
        stream: false,
        options: {
          temperature: 0.7,
          top_p: 0.9,
          max_tokens: 200
        }
      })
    })

    if (!response.ok) {
      throw new Error(`Ollama API request failed: ${response.status}`)
    }

    const data = await response.json()
    
    if (data && data.response) {
      return {
        success: true,
        message: data.response.trim()
      }
    } else {
      throw new Error('Invalid Ollama API response format')
    }
  } catch (error) {
    console.error('Ollama API Error:', error)
    return {
      success: false,
      message: "Local AI service is not available. Please ensure Ollama is running locally.",
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// Simple rule-based responses for fallback
export function getRuleBasedResponse(prompt: string, context: string = ""): ChatResponse {
  const lowerPrompt = prompt.toLowerCase()
  
  // Medical context responses
  if (lowerPrompt.includes('headache') || lowerPrompt.includes('head pain')) {
    return {
      success: true,
      message: "Headaches can have various causes including stress, dehydration, or eye strain. For persistent or severe headaches, please consult your healthcare provider for proper evaluation."
    }
  }
  
  if (lowerPrompt.includes('fever') || lowerPrompt.includes('temperature')) {
    return {
      success: true,
      message: "Fever is often a sign of infection. Monitor your temperature and stay hydrated. If fever persists above 103°F (39.4°C) or lasts more than 3 days, seek medical attention."
    }
  }
  
  if (lowerPrompt.includes('medication') || lowerPrompt.includes('medicine')) {
    return {
      success: true,
      message: "Always take medications as prescribed by your doctor. Store them properly and never share prescription medications. Contact your healthcare provider for any concerns about your medications."
    }
  }
  
  if (lowerPrompt.includes('appointment') || lowerPrompt.includes('schedule')) {
    return {
      success: true,
      message: "To schedule an appointment, please contact your healthcare provider's office directly. They can help you find the best available time slot."
    }
  }
  
  // General health responses
  if (lowerPrompt.includes('exercise') || lowerPrompt.includes('workout')) {
    return {
      success: true,
      message: "Regular exercise is important for overall health. Aim for at least 150 minutes of moderate activity per week. Consult your doctor before starting any new exercise program."
    }
  }
  
  if (lowerPrompt.includes('diet') || lowerPrompt.includes('nutrition')) {
    return {
      success: true,
      message: "A balanced diet with plenty of fruits, vegetables, and whole grains supports good health. Consider consulting a registered dietitian for personalized nutrition advice."
    }
  }
  
  // Default response
  return {
    success: true,
    message: "Thank you for your question. For specific medical advice, please consult your healthcare provider. I'm here to provide general health information only."
  }
}

// Main function that tries multiple APIs in order
export async function callFreeChatAPI(prompt: string, context: string = ""): Promise<ChatResponse> {
  // Try Hugging Face first (free tier)
  const hfResponse = await callHuggingFaceAPI(prompt, context)
  if (hfResponse.success) {
    return hfResponse
  }
  
  // Try Ollama if available
  const ollamaResponse = await callOllamaAPI(prompt, context)
  if (ollamaResponse.success) {
    return ollamaResponse
  }
  
  // Fallback to rule-based responses
  return getRuleBasedResponse(prompt, context)
}

// Medical-specific contexts for free APIs
export const FREE_PATIENT_CONTEXT = `You are a helpful health assistant. Provide general health information but always recommend consulting healthcare professionals for medical advice.`

export const FREE_DOCTOR_CONTEXT = `You are a medical assistant. Provide helpful information while reminding users that clinical decisions remain their responsibility.` 