import axios from 'axios';
import * as fs from 'fs';

const HF_API_KEY = process.env.HUGGINGFACE_API_KEY;
const MODEL_ID = 'google/medgemma-4b-it'; // You can change to another MedGemma variant if needed

/**
 * Analyze an X-ray image using Hugging Face MedGemma.
 * @param imagePath Absolute path to the image file (jpg/png).
 * @returns The model's response (usually JSON or text).
 */
export async function analyzeXrayWithMedGemma(imagePath: string) {
  if (!HF_API_KEY) throw new Error('HUGGINGFACE_API_KEY is not set in environment variables.');
  console.log('HF_API_KEY', HF_API_KEY);
  console.log('MODEL_ID', MODEL_ID);
  const image = fs.readFileSync(imagePath);

  const response = await axios({
    method: 'POST',
    url: `https://api-inference.huggingface.co/models/${MODEL_ID}`,
    headers: {
      Authorization: `Bearer ${HF_API_KEY}`,
      'Content-Type': 'application/octet-stream',
    },
    data: image,
  });

  // The response format depends on the model and task
  // For MedGemma, you may get a JSON or text result
  return response.data;
} 