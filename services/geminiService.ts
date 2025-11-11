import { GoogleGenAI, Modality } from "@google/genai";

// This error message will be caught by the UI components.
const API_KEY_ERROR_MESSAGE = "API_KEY_MISSING";

const getAiClient = (): GoogleGenAI => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error(API_KEY_ERROR_MESSAGE);
  }
  return new GoogleGenAI({ apiKey });
};


export const generateExampleSentence = async (word: string): Promise<string> => {
  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Write a single, clear, and concise example sentence for the word: "${word}"`,
        config: {
          temperature: 0.7,
          maxOutputTokens: 50,
          // Per Gemini docs, add thinkingConfig when using maxOutputTokens with gemini-2.5-flash to avoid empty responses.
          thinkingConfig: { thinkingBudget: 25 },
        }
    });
    // FIX: response.text can be undefined, provide a fallback empty string.
    return (response.text ?? '').trim();
  } catch (error: any) {
    if (error.message === API_KEY_ERROR_MESSAGE) {
      throw error; // Re-throw the specific error for the UI to catch
    }
    console.error("Error generating sentence with Gemini:", error);
    return "Could not generate sentence.";
  }
};

export const explainText = async (text: string): Promise<string> => {
  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Explain the following word or phrase in a simple way, suitable for a vocabulary learner. Provide a definition and one example sentence.\n\nText: "${text}"`,
        config: {
          temperature: 0.5,
          maxOutputTokens: 150,
          thinkingConfig: { thinkingBudget: 75 },
        }
    });
    // FIX: response.text can be undefined, provide a fallback empty string.
    return (response.text ?? '').trim();
  } catch (error: any) {
    if (error.message === API_KEY_ERROR_MESSAGE) {
      throw error;
    }
    console.error("Error explaining text with Gemini:", error);
    return "Could not get explanation.";
  }
};

export const generateForPrompt = async (promptTemplate: string, sourceValues: Record<string, string>): Promise<string> => {
  // Updated regex to handle both {{Column Name}} and {Column Name}
  const filledPrompt = promptTemplate.replace(/{{\s*(.*?)\s*}}|{\s*(.*?)\s*}/g, (_, p1, p2) => {
    const columnName = (p1 || p2).trim();
    return sourceValues[columnName] || `[${columnName}]`;
  });

  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: filledPrompt,
        config: {
          temperature: 0.8,
          maxOutputTokens: 100,
          thinkingConfig: { thinkingBudget: 50 },
        }
    });
    // FIX: response.text can be undefined, provide a fallback empty string. Also, remove quotes from the response.
    return (response.text ?? '').trim().replace(/^"|"$/g, '');
  } catch (error: any) {
    if (error.message === API_KEY_ERROR_MESSAGE) {
      throw error;
    }
    console.error("Error generating for prompt with Gemini:", error);
    return "Generation failed.";
  }
};

export const generateSpeech = async (text: string): Promise<string> => {
  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' },
            },
        },
      },
    });
    // FIX: response.candidates can be undefined, use optional chaining and nullish coalescing to prevent runtime errors.
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data ?? '';
  } catch (error: any) {
    if (error.message === API_KEY_ERROR_MESSAGE) {
      throw error;
    }
    console.error("Error generating speech with Gemini:", error);
    return "";
  }
};

export const generateHint = async (word: string, context: string): Promise<string> => {
    try {
        const ai = getAiClient();
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `The user is trying to guess the word "${word}". The definition or context is "${context}". Provide a short, one-sentence hint to help them guess the word. Do not use the word "${word}" in your hint.`,
            config: {
                temperature: 0.8,
                maxOutputTokens: 40,
                thinkingConfig: { thinkingBudget: 20 },
            }
        });
        // FIX: response.text can be undefined, provide a fallback empty string.
        return (response.text ?? '').trim();
    } catch (error: any) {
        if (error.message === API_KEY_ERROR_MESSAGE) {
            throw error;
        }
        console.error("Error generating hint with Gemini:", error);
        return "Could not generate a hint at this time.";
    }
};


export const generateImageFromText = async (prompt: string): Promise<string> => {
    try {
        const ai = getAiClient();
        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: `A clear, high-quality, visually appealing image representing the following concept: ${prompt}`,
            config: {
              numberOfImages: 1,
              outputMimeType: 'image/png',
              aspectRatio: '1:1',
            },
        });
        
        const base64ImageBytes: string | undefined = response.generatedImages?.[0]?.image.imageBytes;
        if (!base64ImageBytes) {
            throw new Error("No image data returned from API.");
        }
        
        return `data:image/png;base64,${base64ImageBytes}`;
    } catch (error: any) {
        if (error.message === API_KEY_ERROR_MESSAGE) {
            throw error;
        }
        console.error("Error generating image with Gemini:", error);
        throw new Error("Could not generate image.");
    }
};