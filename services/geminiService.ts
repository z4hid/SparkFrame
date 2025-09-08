
import { GoogleGenAI, Modality, Part } from "@google/genai";
import { Character, ReferenceImage } from "../types";

const IMAGE_MODEL = 'gemini-2.5-flash-image-preview';
const TEXT_MODEL = 'gemini-2.5-flash';

// Use direct Gemini SDK calls per official guidance
const useProxy = false;
const apiKey = (process.env.API_KEY as string) || '';
const ai = new GoogleGenAI({ apiKey });

// --- Resilience helpers ---
const DEFAULT_TIMEOUT_MS = 45000;
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function withTimeout<T>(promise: Promise<T>, ms = DEFAULT_TIMEOUT_MS): Promise<T> {
  return new Promise((resolve, reject) => {
    let finished = false;
    const timer = setTimeout(() => {
      if (finished) return;
      const err: any = new Error('request_timeout');
      // Provide a synthetic status to help the UI
      err.status = 408;
      reject(err);
    }, ms);
    promise.then((v) => {
      finished = true;
      clearTimeout(timer);
      resolve(v);
    }).catch((e) => {
      finished = true;
      clearTimeout(timer);
      reject(e);
    });
  });
}

async function withRetry<T>(task: () => Promise<T>, opts?: { retries?: number; baseMs?: number; }): Promise<T> {
  const retries = opts?.retries ?? 3;
  const baseMs = opts?.baseMs ?? 750;
  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      return await task();
    } catch (e: any) {
      const status = e?.status || e?.cause?.status;
      const isRate = status === 429 || e?.message === 'rate_limited';
      const is5xx = status >= 500 && status <= 599;
      if (attempt >= retries || (!isRate && !is5xx)) throw e;
      const wait = Math.min(10000, baseMs * Math.pow(2, attempt)) + Math.floor(Math.random() * 250);
      await delay(wait);
      attempt += 1;
    }
  }
}

const ensureApiKey = () => {
  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY. Add it to your .env and restart the dev server.");
  }
};

// Prompt preflight validation to avoid policy blocks and low-quality requests
const BLOCKLIST = [/nudity/i, /violence\s+graphic/i];
export function validateUserPrompt(p: string): { ok: boolean; reason?: string } {
  if (p.trim().length < 8) return { ok: false, reason: 'Prompt too short. Add details for setting, subject, camera, lighting.' };
  if (BLOCKLIST.some(rx => rx.test(p))) return { ok: false, reason: 'Prompt includes content we cannot process.' };
  return { ok: true };
}

// Normalize scene description to a structured, cinematic directive
async function normalizeSceneDescription(raw: string, characters: Character[]): Promise<string> {
  const blueprints = characters.map(c => `Character: ${c.name}\nBlueprint: ${c.profile}`).join('\n---\n');
  const prompt = `Rewrite this scene into a compact, single-paragraph directive with sections:\n- Setting (place, time, weather)\n- Subjects (who/what; adhere to blueprints)\n- Camera (lens, angle, framing)\n- Lighting (key, fill, mood)\n- Color/Mood\n- Semantic negatives: no watermark, no text overlays, no extra limbs, no distortions\nKeep it precise and cinematic. Avoid markdown or quotes.\n${blueprints ? `\nBlueprints:\n${blueprints}` : ''}\nScene: "${raw}"`;
  try {
    const response = await withRetry(() => withTimeout(ai.models.generateContent({ model: TEXT_MODEL, contents: prompt })));
    const text = (response.text || '').replace(/["*]/g, '').trim();
    return text.length > 0 ? text : raw;
  } catch {
    return raw;
  }
}

/**
 * Constructs a detailed prompt for scene generation, ensuring character consistency.
 */
const constructScenePrompt = (sceneDescription: string, characters: Character[]): string => {
    let characterBlueprints = '';
    if (characters.length > 0) {
        characterBlueprints = characters.map(char => 
            `Character Name: ${char.name}\nCharacter Blueprint: ${char.profile}\n---`
        ).join('\n\n');
    }

    return `
        Task: Generate a single, high-quality, cinematic image for a visual narrative.

        Scene Description: "${sceneDescription}"

        ${characters.length > 0 ? `The following characters appear in this scene. Adhere STRICTLY to their blueprints to maintain visual consistency.` : ''}
        ${characterBlueprints}

        Style Guidelines: Create a visually compelling image with good composition, lighting, and mood. The style should be consistent with a cohesive story.
    `;
};

const BEST_PRACTICES_GUIDE = `Best practices: Be hyper-specific; provide purpose and cinematic camera/lighting; maintain character consistency; iterate in small steps; use semantic negatives like no watermark, no extra limbs, no distortions.`;

export const generateText = async (prompt: string): Promise<string> => {
    try {
        if (useProxy) {
            const res = await fetch('/api/text', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt }) });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'text_failed');
            return data.text;
        } else {
            const response = await ai.models.generateContent({ model: TEXT_MODEL, contents: prompt });
            return response.text;
        }
    } catch (error) {
        console.error("Error generating text:", error);
        throw new Error("AI text generation failed. Please try again.");
    }
};

export const generateInspirationalPrompt = async (): Promise<string> => {
    try {
        const prompt = "Generate a single, random, and highly imaginative scene description suitable for an AI image generator. Be creative and cinematic. Phrase it as a direct instruction. Examples: 'A colossal ancient library carved into a glowing crystal mountain.', 'A cybernetic fox spirit guarding a neon-lit torii gate in a rainy city.', 'An astronaut discovering a garden of bioluminescent fungi inside a derelict starship.'";
        const response = await ai.models.generateContent({
            model: TEXT_MODEL,
            contents: prompt,
        });
        // Clean up quotes or markdown that the model might add
        return response.text.replace(/["*]/g, '');
    } catch (error) {
        console.error("Error generating inspirational prompt:", error);
        // Provide a fallback prompt on error
        return "A brave knight discovers a glowing sword in a misty forest at dusk.";
    }
};

export const generateCharacterPortrait = async (name: string, profile: string): Promise<{ base64Image: string, mimeType: string }> => {
    try {
        if (useProxy) {
            const res = await fetch('/api/characterPortrait', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, profile }) });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'portrait_failed');
            return { base64Image: data.base64Image, mimeType: data.mimeType };
        } else {
            const prompt = `A cinematic, full-body character portrait of ${name}. The background is a neutral, light gray studio backdrop to emphasize the character. ${profile}`;
            const response = await ai.models.generateContent({ model: IMAGE_MODEL, contents: prompt, config: { responseModalities: [Modality.IMAGE, Modality.TEXT] } });
            for (const part of response.candidates?.[0]?.content?.parts || []) {
                if (part.inlineData?.data && part.inlineData?.mimeType?.startsWith('image/')) {
                    return { base64Image: part.inlineData.data, mimeType: part.inlineData.mimeType };
                }
            }
            throw new Error("AI failed to generate a character portrait.");
        }
    } catch (error) {
        console.error("Error generating character portrait:", error);
        throw new Error("Failed to generate character portrait. The AI may be experiencing issues.");
    }
};

export const generateImageFromText = async (
  prompt: string,
  characters: Character[],
  styleImages: { base64: string; mimeType: string }[] | null
): Promise<{ base64Image: string, mimeType: string, fileUrl?: string }> => {
  try {
    if (useProxy) {
        const res = await fetch('/api/generateImage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt, characters, styleImages })
        });
        const data = await res.json();
        if (!res.ok) {
          if (res.status === 429) {
            const err: any = new Error('rate_limited');
            err.status = 429;
            err.meta = data?.usage;
            throw err;
          }
          const err: any = new Error(data.error || 'image_failed');
          err.status = res.status;
          throw err;
        }
        return { base64Image: data.base64Image, mimeType: data.mimeType, fileUrl: data.fileUrl };
    } else {
        const normalized = await withRetry(() => withTimeout(normalizeSceneDescription(prompt, characters)));
        const scenePrompt = constructScenePrompt(normalized, characters);
        let requestContents: string | { parts: Part[] } = scenePrompt;
        if (styleImages && styleImages.length > 0) {
          const parts: Part[] = [
            { text: `${BEST_PRACTICES_GUIDE}\nUse the following image(s) ONLY as artistic style references. Emulate palette/lighting/texture. Do NOT copy content. Then render the described scene.` }
          ];
          for (const img of styleImages) {
            parts.push({ inlineData: { data: img.base64, mimeType: img.mimeType } } as any);
          }
          parts.push({ text: scenePrompt });
          requestContents = { parts };
        } else {
          requestContents = `${BEST_PRACTICES_GUIDE}\n${scenePrompt}`;
        }
        const response = await ai.models.generateContent({ model: IMAGE_MODEL, contents: requestContents, config: { responseModalities: [Modality.IMAGE, Modality.TEXT] } });
        const parts = response.candidates?.[0]?.content?.parts || [];
        for (const part of parts) {
          if (part.inlineData?.data && part.inlineData?.mimeType?.startsWith('image/')) {
            return { base64Image: part.inlineData.data, mimeType: part.inlineData.mimeType };
          }
        }
        const diagText = (parts.find((p: any) => p.text) as any)?.text;
        throw new Error(diagText ? `Model responded without image: ${diagText.slice(0,180)}...` : "AI failed to generate an image for the scene.");
    }
  } catch (error) {
    console.error("Error generating image from text:", error);
    throw new Error("Image generation failed. Please check the prompt or try again.");
  }
};


export const editImage = async (base64Image: string, mimeType: string, prompt: string, characters: Character[], sourceUrl?: string): Promise<{ base64Image: string, mimeType: string, fileUrl?: string }> => {
    try {
        if (useProxy) {
            const res = await fetch('/api/editImage', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt, base64Image, mimeType, sourceUrl, characters }) });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'edit_failed');
            return { base64Image: data.base64Image, mimeType: data.mimeType, fileUrl: data.fileUrl };
        } else {
            let characterBlueprints = '';
            if (characters.length > 0 && characters.some(c => c.identityLocked)) {
                 characterBlueprints = "Reference the following character blueprints to maintain visual consistency for locked characters:\n" + characters
                    .filter(c => c.identityLocked)
                    .map(char => `Character: ${char.name}\nBlueprint: ${char.profile}\n---`)
                    .join('\n');
            }
            const fullPrompt = `${prompt}. \n${characterBlueprints}\nSemantic negatives: no watermark, no text overlays, no distortions, clean output.`;
            const contentParts: Part[] = [ { text: fullPrompt }, { inlineData: { data: base64Image, mimeType: mimeType } } ];
            const response = await ai.models.generateContent({ model: IMAGE_MODEL, contents: { parts: contentParts }, config: { responseModalities: [Modality.IMAGE, Modality.TEXT] } });
            const responseParts = response.candidates?.[0]?.content?.parts || [];
            for (const part of responseParts) {
                if (part.inlineData?.data && part.inlineData?.mimeType?.startsWith('image/')) {
                    return { base64Image: part.inlineData.data, mimeType: part.inlineData.mimeType };
                }
            }
            const diagText = (responseParts.find((p: any) => p.text) as any)?.text;
            throw new Error(diagText ? `Model responded without image: ${diagText.slice(0,180)}...` : "The AI failed to edit the image as requested.");
        }
    } catch (error) {
        console.error("Error editing image:", error);
        throw new Error("Image editing failed. The AI may have rejected the prompt.");
    }
};

export const createCharacterProfile = async (images: { base64Image: string, mimeType: string }[], name: string, description: string): Promise<string> => {
    try {
        const imageParts: Part[] = images.map(img => ({
            inlineData: {
                data: img.base64Image,
                mimeType: img.mimeType,
            },
        }));

        const prompt = `
            You are a character design expert. Your task is to create a detailed "Character Blueprint" based on the provided information. 
            This blueprint will be used by an AI image generator to maintain character consistency across multiple scenes.
            Be specific, detailed, and use descriptive keywords.

            Character Name: "${name}"
            User Description: "${description}"

            Analyze the reference images (if any) and the description to extract key visual traits.
            Structure your output as a list of descriptors covering:
            - Face: Shape, eyes (color, shape), nose, mouth, hair (color, style, length), defining features (scars, tattoos, freckles).
            - Physique: Body type, height, build.
            - Attire: Describe their typical outfit in detail (materials, colors, style, key items like a jacket, boots, or armor).
            - Color Palette: Dominant colors associated with the character.
            - Unique Identifiers: Anything else that makes this character unique (e.g., cybernetic eye, glowing amulet, specific weapon).
            
            The final blueprint should be a concise but comprehensive paragraph that can be easily understood by the AI.
        `;
        
        if (useProxy) {
            const res = await fetch('/api/createProfile', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ images, name, description }) });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'profile_failed');
            return data.text;
        } else {
            const contents = { parts: [...imageParts, { text: prompt }] };
            const response = await ai.models.generateContent({ model: TEXT_MODEL, contents });
            return response.text;
        }
    } catch (error) {
        console.error("Error creating character profile:", error);
        throw new Error("Failed to generate character profile from the AI.");
    }
};
