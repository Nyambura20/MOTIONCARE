/**init 
 * Analyze injury photo using Genkit + Vertex AI Vision.
 * @param {string} imageDataUrl - Base64 data URL of the injury image
 * @returns {Promise<Object>} Analysis with painLocation, injuryType, severity, and recommendations
 */
export async function analyzeInjuryImage(imageDataUrl) {
  try {
    console.log('Sending image to server for analysis...');

    const response = await fetch(`${API_URL}/api/analyze-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ imageDataUrl })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Server analysis error:', response.status, errorText);
      throw new Error('Failed to analyze image');
    }

    const data = await response.json();
    
    if (data.success && data.analysis) {
      console.log('Image analysis complete:', data.analysis);
      return data.analysis;
    }

    throw new Error('Invalid response from server');
  } catch (error) {
    console.error('Error analyzing injury image:', error);
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);
    
    return {
      body_part: 'specific anatomical structure (pending analysis)',
      painLocation: 'specific anatomical structure (pending analysis)',
      injuryType: 'Injury or pain condition',
      severity: 'moderate',
      recommendations: ['Rest affected area', 'Apply ice if swelling present', 'Gentle range of motion when pain allows']
    };
  }
}

/**
 * Generate anatomical focus images using Vertex AI Imagen 3.0.
 * @param {string} painLocation - Location of pain from analysis
 * @param {string} injuryType - Type of injury from analysis
 * @returns {Promise<{image1: string, image2: string}>} Base64 images or placeholders
 */
export async function generateFocusImages(painLocation, injuryType) {
  try {
    const response = await fetch(`${API_URL}/api/generate-images`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        painLocation,
        injuryType
      })
    })

    if (!response.ok) {
      throw new Error('Failed to generate focus images')
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Error generating focus images:', error)
    return {
      image1: 'placeholder_focus1',
      image2: 'placeholder_focus2'
    }
  }
}
