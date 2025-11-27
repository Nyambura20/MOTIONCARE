import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

/**
 * Generate anatomical focus images using Vertex AI Imagen 3.0.
 * Creates two medical illustrations: anatomy diagram and exercise diagram.
 * @param {string} painLocation - Anatomical location of pain
 * @param {string} injuryType - Type of injury
 * @returns {Promise<{image1: string, image2: string}>} Base64 encoded images or placeholders
 */
export async function generateFocusImages(painLocation, injuryType) {
  try {
    console.log('Generating focus images with Imagen 3.0 via Vertex AI...');
    
    const prompt1 = `Medical illustration showing ${painLocation} anatomy with ${injuryType}, clear focus on affected area, professional medical visualization, anatomically accurate, clean white background, educational diagram style`;
    const prompt2 = `Physical therapy exercise diagram for ${injuryType} rehabilitation targeting ${painLocation}, showing proper form and movement arrows, professional medical illustration, side view, clean background`;
    
    console.log('Image 1 prompt:', prompt1);
    console.log('Image 2 prompt:', prompt2);
    
    const PROJECT_ID = process.env.VITE_GOOGLE_CLOUD_PROJECT_ID || 'gen-lang-client-0891331347';
    const LOCATION = 'us-central1';
    const IMAGEN_MODEL = 'imagen-3.0-generate-001';
    
    const { GoogleAuth } = await import('google-auth-library');
    const auth = new GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/cloud-platform']
    });
    const client = await auth.getClient();
    const accessToken = await client.getAccessToken();
    
    if (!accessToken.token) {
      throw new Error('Failed to get Vertex AI access token');
    }
    
    const endpoint = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${IMAGEN_MODEL}:predict`;
    
    const generateImage = async (prompt) => {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          instances: [{ prompt }],
          parameters: {
            sampleCount: 1,
            aspectRatio: '4:3',
            safetyFilterLevel: 'block_some',
            personGeneration: 'allow_adult'
          }
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Imagen API error:', response.status, errorText);
        return null;
      }
      
      const data = await response.json();
      
      if (data.predictions && data.predictions[0] && data.predictions[0].bytesBase64Encoded) {
        return `data:image/png;base64,${data.predictions[0].bytesBase64Encoded}`;
      }
      
      return null;
    };
    
    const [image1, image2] = await Promise.all([
      generateImage(prompt1),
      generateImage(prompt2)
    ]);
    
    console.log('Image 1 generated:', image1 ? 'Yes (base64)' : 'Failed, using placeholder');
    console.log('Image 2 generated:', image2 ? 'Yes (base64)' : 'Failed, using placeholder');
    
    return {
      image1: image1 || `https://via.placeholder.com/400x300/1a1f3a/00FF00?text=${encodeURIComponent(painLocation + ' Focus')}`,
      image2: image2 || `https://via.placeholder.com/400x300/1a1f3a/00FFFF?text=${encodeURIComponent(injuryType + ' Exercise')}`
    };
  } catch (error) {
    console.error('Focus image generation error:', error.message);
    console.error('Full error:', error);
    return {
      image1: `https://via.placeholder.com/400x300/333/fff?text=Focus+Image+1`,
      image2: `https://via.placeholder.com/400x300/333/fff?text=Focus+Image+2`
    };
  }
}
