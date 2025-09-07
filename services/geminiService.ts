
import { GoogleGenAI, Modality, Part } from "@google/genai";
import { Character, ReferenceImage } from "../types";

const IMAGE_MODEL = 'gemini-2.5-flash-image-preview';
const TEXT_MODEL = 'gemini-2.5-flash';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

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


export const generateText = async (prompt: string): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: TEXT_MODEL,
            contents: prompt,
        });
        return response.text;
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
        const prompt = `A cinematic, full-body character portrait of ${name}. The background is a neutral, light gray studio backdrop to emphasize the character. ${profile}`;
        
        const response = await ai.models.generateContent({
            model: IMAGE_MODEL,
            contents: prompt,
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            },
        });

        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
                return {
                    base64Image: part.inlineData.data,
                    mimeType: part.inlineData.mimeType,
                };
            }
        }
        throw new Error("AI failed to generate a character portrait.");
    } catch (error) {
        console.error("Error generating character portrait:", error);
        throw new Error("Failed to generate character portrait. The AI may be experiencing issues.");
    }
};

export const generateImageFromText = async (prompt: string, characters: Character[], styleImage: { base64: string; mimeType: string } | null): Promise<{ base64Image: string, mimeType: string }> => {
  try {
    const scenePrompt = constructScenePrompt(prompt, characters);
    
    let requestContents: string | { parts: Part[] };

    if (styleImage) {
        const contentParts: Part[] = [];
        const stylePrompt = `
            Use the following image ONLY as an artistic style reference. 
            Emulate its color palette, lighting, texture, and overall mood. 
            DO NOT include the content or subjects from the style reference image in your output.
            The generated image must depict the scene described in the next message.
        `;
        contentParts.push({ text: stylePrompt });
        contentParts.push({
            inlineData: {
                data: styleImage.base64,
                mimeType: styleImage.mimeType,
            },
        });
        contentParts.push({ text: scenePrompt });
        requestContents = { parts: contentParts };
    } else {
        requestContents = scenePrompt;
    }
    
    const response = await ai.models.generateContent({
      model: IMAGE_MODEL,
      contents: requestContents,
      config: {
        responseModalities: [Modality.IMAGE, Modality.TEXT],
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return {
            base64Image: part.inlineData.data,
            mimeType: part.inlineData.mimeType,
        };
      }
    }
    throw new Error("AI failed to generate an image for the scene.");
  } catch (error) {
    console.error("Error generating image from text:", error);
    throw new Error("Image generation failed. Please check the prompt or try again.");
  }
};


export const editImage = async (base64Image: string, mimeType: string, prompt: string, characters: Character[]): Promise<{ base64Image: string, mimeType: string }> => {
    try {
        let characterBlueprints = '';
        if (characters.length > 0 && characters.some(c => c.identityLocked)) {
             characterBlueprints = "Reference the following character blueprints to maintain visual consistency for locked characters:\n" + characters
                .filter(c => c.identityLocked)
                .map(char => `Character: ${char.name}\nBlueprint: ${char.profile}\n---`)
                .join('\n');
        }
        
        const fullPrompt = `${prompt}. \n${characterBlueprints}`;

        const contentParts: Part[] = [
            { text: fullPrompt },
            { inlineData: { data: base64Image, mimeType: mimeType } }
        ];

        const response = await ai.models.generateContent({
            model: IMAGE_MODEL,
            contents: { parts: contentParts },
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            },
        });
        
        const responseParts = response.candidates?.[0]?.content?.parts || [];
        for (const part of responseParts) {
            if (part.inlineData) {
                return {
                    base64Image: part.inlineData.data,
                    mimeType: part.inlineData.mimeType,
                };
            }
        }
        throw new Error("The AI failed to edit the image as requested.");
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
        
        const contents = {
          parts: [...imageParts, { text: prompt }]
        }

        const response = await ai.models.generateContent({
            model: TEXT_MODEL,
            contents,
        });

        return response.text;
    } catch (error) {
        console.error("Error creating character profile:", error);
        throw new Error("Failed to generate character profile from the AI.");
    }
};
