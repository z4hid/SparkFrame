
import React, { useState, useContext, useEffect, useRef } from 'react';
import { AppContext } from '../context/AppContext';
import { Page, Character, Scene } from '../types';
import { generateImageFromText, generateInspirationalPrompt } from '../services/geminiService';
import { downloadFile, fileToBase64 } from '../utils/fileUtils';
import toast from 'react-hot-toast';

const loadingMessages = [
    "Summoning pixels from the ether...",
    "Teaching the AI about art history...",
    "Reticulating splines and polygons...",
    "Painting your digital masterpiece...",
    "Wrangling rogue algorithms...",
    "Consulting with the digital muses...",
];

const GeneratorPage: React.FC = () => {
  const { navigate, characters, activeScene, updateActiveScene, addSceneToStoryboard, deleteCharacter } = useContext(AppContext);
  const [sceneDescription, setSceneDescription] = useState('A brave knight discovers a glowing sword in a misty forest at dusk.');
  const [selectedCharacters, setSelectedCharacters] = useState<Set<string>>(new Set());
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [status, setStatus] = useState('Ready to generate or refine your scene.');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState(loadingMessages[0]);
  const [styleRefImage, setStyleRefImage] = useState<{ file: File; url: string } | null>(null);
  const styleFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (activeScene) {
      setSceneDescription(activeScene.description);
      setSelectedCharacters(new Set(activeScene.characters.map(c => c.id)));
      setGeneratedImage(activeScene.imageUrl);
    }
  }, [activeScene]);
  
   useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isLoading) {
      setLoadingMessage(loadingMessages[0]);
      interval = setInterval(() => {
        setLoadingMessage(prev => {
          const currentIndex = loadingMessages.indexOf(prev);
          const nextIndex = (currentIndex + 1) % loadingMessages.length;
          return loadingMessages[nextIndex];
        });
      }, 2500);
    } else if (interval) {
      clearInterval(interval);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isLoading]);

  const handleCharacterToggle = (charId: string) => {
    setSelectedCharacters(prev => {
      const newSet = new Set(prev);
      if (newSet.has(charId)) {
        newSet.delete(charId);
      } else {
        newSet.add(charId);
      }
      return newSet;
    });
  };
  
  const handleGetInspired = async () => {
    setStatus('Getting an idea...');
    try {
        const prompt = await generateInspirationalPrompt();
        setSceneDescription(prompt);
        setStatus('New idea ready!');
    } catch (error: any) {
        toast.error(error.message || "Failed to get an idea.");
        setStatus('Ready to generate or refine your scene.');
    }
  };

  const handleNewScene = () => {
    setSceneDescription('');
    setSelectedCharacters(new Set());
    setGeneratedImage(null);
    updateActiveScene(null);
    if(styleFileInputRef.current) styleFileInputRef.current.value = "";
    handleClearStyleRef();
    setStatus('Ready for a new scene.');
    toast('Canvas cleared for a new scene!');
};

  const handleStyleRefChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setStyleRefImage({
        file,
        url: URL.createObjectURL(file),
      });
    }
  };

  const handleClearStyleRef = () => {
    if (styleRefImage) {
      URL.revokeObjectURL(styleRefImage.url);
    }
    setStyleRefImage(null);
  };

  const handleGenerate = async () => {
    if (!sceneDescription.trim()) {
      toast.error("Please enter a scene description.");
      return;
    }
    setIsLoading(true);
    setStatus('Generating your scene... this can take a moment.');
    try {
        const chars = characters.filter(c => selectedCharacters.has(c.id));
        
        const styleImagePayload = styleRefImage ? { 
            base64: await fileToBase64(styleRefImage.file), 
            mimeType: styleRefImage.file.type 
        } : null;

        const result = await generateImageFromText(sceneDescription, chars, styleImagePayload);
        const newImageUrl = `data:${result.mimeType};base64,${result.base64Image}`;
        setGeneratedImage(newImageUrl);
        const newScene: Scene = {
            id: `scene-${Date.now()}`,
            description: sceneDescription,
            narrative: sceneDescription,
            imageUrl: newImageUrl,
            base64Image: result.base64Image,
            mimeType: result.mimeType,
            characters: chars,
            characterIds: chars.map(c => c.id),
            editHistory: [{ id: 'edit-0', prompt: 'Original Image', timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }],
            imageHistory: [{
            imageUrl: newImageUrl,
            base64Image: result.base64Image,
            mimeType: result.mimeType,
            }]
        };
        updateActiveScene(newScene);
        addSceneToStoryboard(newScene);
        setStatus('Scene generated successfully.');
        toast.success('Scene generated successfully!');
    } catch(error: any) {
        setStatus('Failed to generate image. Please try again.');
        toast.error(error.message || 'Failed to generate image. Please try again.');
    } finally {
        setIsLoading(false);
    }
  };
  
  const handleIterate = () => {
    if (activeScene) {
        navigate(Page.EDITOR, { sceneToEdit: activeScene });
    } else {
        toast.error("Please generate an image before iterating.");
    }
  };
  
  const handleDownload = () => {
    if(activeScene) {
        downloadFile(activeScene.base64Image, activeScene.mimeType, `sparkframe-scene-${activeScene.id}.png`);
    }
  }

  if (characters.length === 0) {
    return (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-[var(--bg-main)]">
            <div className="flex flex-col items-center justify-center bg-[var(--bg-content)] p-10 rounded-2xl border border-[var(--border-color)]">
              <span className="material-symbols-outlined text-6xl text-[var(--primary-color)] mb-4">group_add</span>
              <h2 className="text-3xl font-bold text-white">Create a Character to Begin</h2>
              <p className="text-[var(--text-dim)] mt-2 max-w-md">
                  Your story needs a hero! Create a Character Blueprint first, and then you can start generating scenes with them here.
              </p>
              <button onClick={() => navigate(Page.BLUEPRINT)} className="mt-6 flex items-center justify-center gap-2 rounded-full h-12 px-6 bg-[var(--primary-color)] text-[var(--bg-inset)] text-base font-bold hover:opacity-90">
                  <span className="material-symbols-outlined">add</span>
                  <span>Create New Character</span>
              </button>
            </div>
        </div>
    )
  }

  return (
    <div className="flex flex-1 bg-[var(--bg-main)]">
      <aside className="w-96 flex-shrink-0 border-r border-[var(--border-color)] p-8 flex flex-col gap-8 bg-[var(--bg-content)]">
        <h1 className="text-3xl font-bold text-white">Creative Console</h1>
        <div className="flex flex-col gap-8 flex-1 overflow-y-auto -mr-4 pr-4">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
                <label htmlFor="scene-description" className="text-lg font-semibold text-[var(--text-dim)]">Scene Description</label>
                <button onClick={handleGetInspired} className="text-sm text-[var(--primary-color)] font-semibold hover:opacity-80 flex items-center gap-1">
                    <span className="material-symbols-outlined text-base">auto_awesome</span>
                    Get Inspired
                </button>
            </div>
            <textarea
              id="scene-description"
              value={sceneDescription}
              onChange={(e) => setSceneDescription(e.target.value)}
              className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-xl text-white focus:outline-0 focus:ring-2 focus:ring-[var(--primary-color)] border border-[var(--border-color-light)] bg-[var(--bg-inset)] min-h-40 placeholder:text-gray-500 p-4 text-base font-normal leading-relaxed"
              placeholder="A knight fighting a dragon in a fiery cave..."
            ></textarea>
          </div>
           <div>
            <h3 className="text-lg font-semibold text-[var(--text-dim)] mb-3">Style Reference (Optional)</h3>
            {styleRefImage ? (
              <div className="relative">
                <img src={styleRefImage.url} alt="Style Reference" className="w-full h-auto rounded-lg border-2 border-[var(--border-color-light)]" />
                <button
                  onClick={handleClearStyleRef}
                  className="absolute top-2 right-2 bg-black/50 text-white rounded-full h-7 w-7 flex items-center justify-center hover:bg-red-500"
                  title="Clear Style Reference"
                >
                  <span className="material-symbols-outlined text-base">close</span>
                </button>
              </div>
            ) : (
              <div
                onClick={() => styleFileInputRef.current?.click()}
                className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[var(--border-color-light)] p-6 text-center cursor-pointer hover:border-[var(--primary-color)]"
              >
                <input
                  type="file"
                  ref={styleFileInputRef}
                  onChange={handleStyleRefChange}
                  className="hidden"
                  accept="image/png, image/jpeg"
                />
                <span className="material-symbols-outlined text-3xl text-[var(--text-dim)]">palette</span>
                <p className="text-sm font-semibold text-white/90">Upload Style Image</p>
                <p className="text-xs text-white/60">Guide the AI's artistic direction.</p>
              </div>
            )}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-[var(--text-dim)] mb-3">Character Blueprints</h3>
            <div className="space-y-2">
              {characters.map(char => (
                <div key={char.id} className={`group flex items-center gap-3 p-3 rounded-lg border cursor-pointer  ${selectedCharacters.has(char.id) ? 'bg-[var(--bg-inset)] border-[var(--primary-color)]' : 'border-transparent hover:bg-[var(--bg-inset)] hover:border-[var(--border-color-light)]'}`} onClick={() => handleCharacterToggle(char.id)}>
                  <div className="w-14 h-14 rounded-full bg-cover bg-center flex-shrink-0 border-2 border-[var(--border-color)]" style={{ backgroundImage: `url("${char.imageUrl}")` }}></div>
                  <div className="flex-grow overflow-hidden">
                    <p className="font-semibold text-white truncate">{char.name}</p>
                    <p className="text-sm text-[var(--text-dim)] truncate">{char.description}</p>
                  </div>
                  <div className="ml-auto flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-md flex items-center justify-center border-2 ${selectedCharacters.has(char.id) ? 'bg-[var(--primary-color)] border-[var(--primary-color)]' : 'bg-[var(--bg-inset)] border-[var(--border-color-light)]'}`}>
                      {selectedCharacters.has(char.id) && <span className="material-symbols-outlined text-black" style={{fontSize: '20px'}}>check</span>}
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); navigate(Page.BLUEPRINT, { characterToEdit: char })}} className="opacity-0 group-hover:opacity-100 text-[var(--text-dim)] hover:text-white" title={`Edit ${char.name}`}>
                      <span className="material-symbols-outlined">edit</span>
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); deleteCharacter(char.id) }} className="opacity-0 group-hover:opacity-100 text-[var(--text-dim)] hover:text-red-500" title={`Delete ${char.name}`}>
                        <span className="material-symbols-outlined">delete</span>
                    </button>
                  </div>
                </div>
              ))}
                <button onClick={() => navigate(Page.BLUEPRINT)} className="w-full mt-2 flex items-center justify-center gap-2 text-center p-3 rounded-lg border-2 border-dashed border-[var(--border-color-light)] text-[var(--text-dim)] hover:bg-[var(--bg-inset)] hover:border-[var(--primary-color)]">
                    <span className="material-symbols-outlined">add</span>
                    <span>Add New Character</span>
                </button>
            </div>
          </div>
        </div>
        <div className="mt-auto">
          <button
            onClick={handleGenerate}
            disabled={isLoading}
            className="flex w-full items-center justify-center gap-3 rounded-full h-14 px-6 bg-[var(--primary-color)] text-[var(--bg-inset)] text-lg font-bold hover:opacity-90 disabled:opacity-50"
          >
            {isLoading ? (
               <>
                <svg className="animate-spin h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Generating...</span>
              </>
            ) : (
                <>
                <span className="material-symbols-outlined text-2xl">auto_awesome</span>
                <span>Generate Image</span>
                </>
            )}
            
          </button>
        </div>
      </aside>
      <main className="flex-1 p-8 flex flex-col gap-8">
        <header className="flex justify-between items-start">
            <div>
              <h2 className="text-4xl font-bold tracking-tight text-white">To Live Is to Create, To Create Is to Be</h2>
              <p className="text-[var(--text-dim)] mt-1 text-lg">Weave your narrative, one scene at a time. Describe the setting, select your characters, and watch your story unfold.</p>
            </div>
            <button onClick={handleNewScene} className="flex-shrink-0 flex items-center justify-center gap-2 rounded-full h-12 px-6 bg-[var(--border-color)] text-white font-bold hover:bg-[var(--border-color-light)] transition-colors">
                <span className="material-symbols-outlined">add</span>
                <span>New Scene</span>
            </button>
        </header>
        <div className="flex-1 flex items-center justify-center min-h-0">
            {generatedImage ? (
                 <div className="w-full h-full rounded-2xl bg-center bg-contain bg-no-repeat border-2 border-[var(--border-color)] shadow-2xl shadow-black/30" style={{ backgroundImage: `url("${generatedImage}")` }}></div>
            ): (
                <div className="w-full h-full rounded-2xl border-2 border-dashed border-[var(--border-color-light)] bg-transparent grid-bg flex flex-col items-center justify-center text-center text-[var(--text-dim)] p-4">
                    <div className="bg-[var(--bg-content)] p-10 rounded-2xl border border-[var(--border-color)]">
                        <span className="material-symbols-outlined text-8xl text-[var(--border-color-light)] mb-4">image</span>
                        <p className="text-2xl font-semibold text-white">Your generated image will appear here.</p>
                        <p className="mt-1">Describe your scene, select your characters, and click "Generate Image".</p>
                    </div>
                </div>
            )}
        </div>
        <footer className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-[var(--text-dim)]">
            <span className="material-symbols-outlined text-base">{isLoading ? 'hourglass_top' : 'info'}</span>
            <span>{isLoading ? loadingMessage : status}</span>
          </div>
          <div className="flex gap-4">
            <button onClick={handleDownload} disabled={!activeScene?.base64Image} className="flex items-center justify-center gap-2 rounded-full h-11 px-5 bg-[var(--border-color)] text-white text-sm font-bold hover:bg-[var(--border-color-light)] disabled:opacity-50">
              <span className="material-symbols-outlined">download</span>
              <span>Download</span>
            </button>
            <button onClick={handleIterate} disabled={!activeScene} className="flex items-center justify-center gap-2 rounded-full h-11 px-5 bg-[var(--primary-color)] text-[var(--bg-inset)] text-sm font-bold hover:opacity-90 disabled:opacity-50">
              <span className="material-symbols-outlined">edit</span>
              <span>Iterate</span>
            </button>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default GeneratorPage;
