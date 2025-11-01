import { GoogleGenAI, GenerateContentResponse, Modality } from '@google/genai';

export async function generateAiContent(prompt: string, userApiKey: string | null): Promise<string> {
  if (!userApiKey) {
    throw new Error('Please set your Gemini API key in the Settings screen to use AI features.');
  }

  try {
    const ai = new GoogleGenAI({ apiKey: userApiKey });
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    
    const text = response.text;
    if (text) {
      return text.trim();
    } else {
      // This case might happen if the content is blocked or the response is empty.
      const candidate = response.candidates?.[0];
      if (candidate?.finishReason && candidate.finishReason !== 'STOP') {
          throw new Error(`Content generation stopped: ${candidate.finishReason}`);
      }
      throw new Error('Received an empty response from the AI.');
    }
  } catch (error: any) {
    console.error("Gemini API call failed:", error);
    
    if (error.message.includes('API key not valid')) {
        throw new Error('Your Gemini API key is invalid. Please check it in the Settings screen.');
    }
    if (error.message.includes('quota')) {
        throw new Error("You've exceeded your daily free quota for the Gemini API. Please try again tomorrow or use a different key.");
    }
     if (error.message.includes('permission')) {
        throw new Error('Your Gemini API key is missing necessary permissions.');
    }
    throw new Error(`Failed to generate content: ${error.message}`);
  }
}

export const playSpeech = (text: string, lang: string, rate: number = 1.0): Promise<void> => {
  return new Promise((resolve, reject) => {
    if ('speechSynthesis' in window) {
      // Always cancel previous speech to prevent overlap
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = rate;

      let resolved = false;
      utterance.onend = () => {
        if (!resolved) {
          resolved = true;
          resolve();
        }
      };
      utterance.onerror = (event) => {
        if (!resolved) {
          resolved = true;
          console.error('SpeechSynthesisUtterance.onerror', event);
          reject(`Speech error: ${event.error}`);
        }
      };
      
      // A failsafe timeout in case onend doesn't fire (e.g., on cancel)
      const estimatedDuration = (text.length * 80) / rate + 500;
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          resolve();
        }
      }, estimatedDuration);

      window.speechSynthesis.speak(utterance);
    } else {
      reject('Your browser does not support text-to-speech.');
    }
  });
};

export const stopSpeech = () => {
  if ('speechSynthesis' in window && (window.speechSynthesis.speaking || window.speechSynthesis.pending)) {
    window.speechSynthesis.cancel();
  }
};