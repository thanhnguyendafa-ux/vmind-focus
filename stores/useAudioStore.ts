import { create } from 'zustand';
import { generateSpeech } from '../services/geminiService';
import { useUIStore } from './useUIStore';

// Helper functions for audio decoding, moved from the old AudioProvider
function decode(base64: string) {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

async function decodeAudioData(
    data: Uint8Array,
    ctx: AudioContext,
    sampleRate: number,
    numChannels: number,
): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

    for (let channel = 0; channel < numChannels; channel++) {
        const channelData = buffer.getChannelData(channel);
        for (let i = 0; i < frameCount; i++) {
            channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
        }
    }
    return buffer;
}

type AudioState = {
    playingId: string | null;
    status: 'loading' | 'playing' | 'error' | 'idle';
};

interface AudioStoreState {
    audioState: AudioState;
    audioContext: AudioContext | null;
    currentAudioSource: AudioBufferSourceNode | null;
    initAudioContext: () => void;
    handlePlayTextAsSpeech: (text: string, id: string) => void;
}

export const useAudioStore = create<AudioStoreState>((set, get) => ({
    audioState: { playingId: null, status: 'idle' },
    audioContext: null,
    currentAudioSource: null,

    initAudioContext: () => {
        if (!get().audioContext) {
            const context = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            set({ audioContext: context });
        }
    },

    handlePlayTextAsSpeech: async (text: string, id: string) => {
        get().initAudioContext(); // Ensure context is initialized
        const { audioContext, audioState, currentAudioSource } = get();
        const { showToast } = useUIStore.getState();

        if (audioState.status === 'loading' || audioState.status === 'playing') {
            if (currentAudioSource) {
                currentAudioSource.stop();
                set({ currentAudioSource: null });
            }
            if (audioState.playingId === id) {
                set({ audioState: { playingId: null, status: 'idle' } });
                return;
            }
        }
        
        if (!text) { showToast("No text to speak.", "error"); return; }
        set({ audioState: { playingId: id, status: 'loading' } });
        try {
            const audioB64 = await generateSpeech(text);
            if (!audioB64 || !audioContext) throw new Error("Audio generation failed");
            const audioBytes = decode(audioB64);
            const audioBuffer = await decodeAudioData(audioBytes, audioContext, 24000, 1);
            const source = audioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioContext.destination);
            source.onended = () => { 
                set({ 
                    audioState: { playingId: null, status: 'idle' },
                    currentAudioSource: null 
                }); 
            };
            source.start();
            set({ currentAudioSource: source, audioState: { playingId: id, status: 'playing' } });
        } catch (error: any) {
            console.error("Error playing Gemini audio:", error);
            if (error.message === "API_KEY_MISSING") { showToast("Please set your Gemini API key.", "error"); } else { showToast("Audio generation failed.", "error"); }
            set({ audioState: { playingId: null, status: 'error' } });
            setTimeout(() => set({ audioState: { playingId: null, status: 'idle' } }), 2000);
        }
    },
}));