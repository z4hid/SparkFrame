
import React, { useState, useContext, useRef, useEffect } from 'react';
import { AppContext } from '../context/AppContext';
import { Page, ReferenceImage, Character } from '../types';
import { createCharacterProfile, generateCharacterPortrait, editImage } from '../services/geminiService';
import { fileToBase64 } from '../utils/fileUtils';
import toast from 'react-hot-toast';

const BlueprintPage: React.FC = () => {
  const { navigate, addCharacter, activeCharacter, setActiveCharacter, updateCharacter, deleteCharacter } = useContext(AppContext);
  
  const [name, setName] = useState('');
  const [refImages, setRefImages] = useState<ReferenceImage[]>([]);
  const [description, setDescription] = useState('');
  const [identityLocked, setIdentityLocked] = useState(true);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isEditingImage, setIsEditingImage] = useState(false);
  const [editPrompt, setEditPrompt] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isEditMode = !!activeCharacter;

  useEffect(() => {
    if (activeCharacter) {
      setName(activeCharacter.name);
      setDescription(activeCharacter.description);
      setRefImages(activeCharacter.referenceImages);
      setIdentityLocked(activeCharacter.identityLocked);
    }
  }, [activeCharacter]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const files = Array.from(event.target.files).slice(0, 3 - refImages.length);
      const newImagesPromises = files.map(async (file): Promise<ReferenceImage> => {
        const base64 = await fileToBase64(file);
        return {
          id: `${file.name}-${Date.now()}`,
          name: file.name,
          base64Image: base64,
          mimeType: file.type
        };
      });
      try {
        const newImages = await Promise.all(newImagesPromises);
        setRefImages(prev => [...prev, ...newImages]);
      } catch (error) {
        console.error("Error converting files to base64:", error);
        toast.error("Could not process one or more images.");
      }
    }
  };

  const handleSaveOrUpdateBlueprint = async () => {
    if (!name.trim()) {
      toast.error("Please provide a name for your character.");
      return;
    }
    if (!description && refImages.length === 0) {
      toast.error("Please provide either a description or reference images.");
      return;
    }
    setIsLoading(true);
    try {
      const imagePayload = refImages.map(img => ({ base64Image: img.base64Image, mimeType: img.mimeType }));
      const generatedProfile = await createCharacterProfile(imagePayload, name, description);
      
      let base64 = activeCharacter?.base64Image || '';
      let mimeType = activeCharacter?.mimeType || '';
      let imageUrl = activeCharacter?.imageUrl || '';

      if (!isEditMode) {
        if(refImages.length > 0) {
            const firstImage = refImages[0];
            base64 = firstImage.base64Image;
            mimeType = firstImage.mimeType;
            imageUrl = `data:${mimeType};base64,${base64}`;
        } else {
            // Generate a portrait if creating from scratch
            const result = await generateCharacterPortrait(name, generatedProfile);
            base64 = result.base64Image;
            mimeType = result.mimeType;
            imageUrl = `data:${mimeType};base64,${base64}`;
        }
      }
      
      const characterData = {
        name,
        description: description,
        profile: generatedProfile,
        imageUrl,
        base64Image: base64,
        mimeType: mimeType,
        identityLocked,
        referenceImages: refImages,
      };

      if (isEditMode && activeCharacter) {
        updateCharacter({ ...characterData, id: activeCharacter.id });
        toast.success('Character updated successfully!');
      } else {
        // fix: The addCharacter function is async and should be awaited.
        await addCharacter(characterData);
        toast.success('Character created successfully!');
      }

      navigate(Page.GENERATOR);

    } catch (error: any) {
        console.error("Failed to save blueprint", error);
        toast.error(error.message || "Failed to save blueprint. Please try again.");
    } finally {
        setIsLoading(false);
    }
  };

  const handleApplyImageEdit = async () => {
    if (!editPrompt.trim() || !activeCharacter) return;
    setIsEditingImage(true);
    try {
      const result = await editImage(activeCharacter.base64Image, activeCharacter.mimeType, editPrompt, [activeCharacter]);
      const newImageUrl = `data:${result.mimeType};base64,${result.base64Image}`;
      const updatedChar: Character = {
        ...activeCharacter,
        imageUrl: newImageUrl,
        base64Image: result.base64Image,
        mimeType: result.mimeType
      };
      updateCharacter(updatedChar);
      setActiveCharacter(updatedChar); // Update local state for immediate feedback
      setEditPrompt('');
      toast.success('Portrait updated!');
    } catch (error: any) {
       console.error("Failed to edit image", error);
       toast.error(error.message || "An error occurred while editing the image.");
    } finally {
        setIsEditingImage(false);
    }
  };

  const handleDeleteCharacter = () => {
    if (activeCharacter) {
      deleteCharacter(activeCharacter.id);
      navigate(Page.GENERATOR);
    }
  };


  return (
    <div className="flex flex-1 justify-center px-4 sm:px-10 py-8">
      <div className="w-full max-w-4xl space-y-10">
        <div className="text-center">
          <h1 className="text-white text-4xl lg:text-5xl font-bold tracking-tight">{isEditMode ? 'Edit Character Blueprint' : 'Create Character Blueprint'}</h1>
          <p className="text-[var(--text-dim)] mt-2 text-lg">Define the visual identity of your character for consistent scene generation.</p>
        </div>
        <div className="space-y-8 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-content)] p-6 sm:p-8">
          { isEditMode && activeCharacter && (
            <div>
              <h3 className="flex items-center gap-3 text-white text-xl font-bold tracking-tight">
                <span className="material-symbols-outlined text-[var(--primary-color)]">portrait</span>
                Character Portrait
              </h3>
              <p className="text-[var(--text-dim)] mt-1">Refine your character's portrait using conversational edits.</p>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                  <div className="aspect-square w-full bg-cover bg-center rounded-xl border border-[var(--border-color-light)]" style={{backgroundImage: `url('${activeCharacter.imageUrl}')`}}></div>
                  <div className="space-y-4">
                      <textarea
                        value={editPrompt}
                        onChange={(e) => setEditPrompt(e.target.value)}
                        disabled={isEditingImage}
                        className="form-input w-full resize-none rounded-xl border border-[var(--border-color-light)] bg-[var(--bg-inset)] p-4 text-base text-white placeholder:text-white/50 focus:border-[var(--primary-color)] focus:ring-[var(--primary-color)]"
                        placeholder="e.g., 'Give them a leather jacket', 'make hair blonde'"
                        rows={3}
                      ></textarea>
                      <button
                        onClick={handleApplyImageEdit}
                        disabled={isEditingImage || !editPrompt.trim()}
                        className="w-full flex min-w-[84px] cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-full h-11 px-6 bg-[var(--primary-color)] text-[var(--bg-inset)] text-base font-bold hover:opacity-90 disabled:opacity-50">
                          {isEditingImage ? (
                            <>
                              <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                              <span>Applying...</span>
                            </>
                          ) : (
                             'Apply Edit'
                          )}
                      </button>
                  </div>
              </div>
            </div>
          )}
          <div>
            <h3 className="flex items-center gap-3 text-white text-xl font-bold tracking-tight">
              <span className="material-symbols-outlined text-[var(--primary-color)]">badge</span>
              Character Name
            </h3>
            <p className="text-[var(--text-dim)] mt-1">
              Give your character a memorable name.
            </p>
            <div className="mt-4">
               <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="form-input w-full rounded-xl border border-[var(--border-color-light)] bg-[var(--bg-inset)] p-4 text-base text-white placeholder:text-white/50 focus:border-[var(--primary-color)] focus:ring-[var(--primary-color)]"
                placeholder="e.g., Sir Reginald, Anya the Explorer"
              />
            </div>
          </div>
          <div>
            <h3 className="flex items-center gap-3 text-white text-xl font-bold tracking-tight">
              <span className="material-symbols-outlined text-[var(--primary-color)]"> description </span>
              Character Description
            </h3>
            <p className="text-[var(--text-dim)] mt-1">
              Describe their physical attributes, clothing, and distinguishing features for accurate depiction.
            </p>
            <div className="mt-4">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="form-input w-full resize-none rounded-xl border border-[var(--border-color-light)] bg-[var(--bg-inset)] p-4 text-base text-white placeholder:text-white/50 focus:border-[var(--primary-color)] focus:ring-[var(--primary-color)]"
                placeholder="e.g., A grizzled space pirate in his late 40s, with a cybernetic eye, a long grey beard, and wearing a worn leather jacket over a faded band t-shirt."
                rows={5}
              ></textarea>
            </div>
          </div>
           <div>
            <h3 className="flex items-center gap-3 text-white text-xl font-bold tracking-tight">
              <span className="material-symbols-outlined text-[var(--primary-color)]"> photo_library </span>
              Reference Images
            </h3>
            <p className="text-[var(--text-dim)] mt-1">
              Upload 1-3 images that best represent your character (optional).
            </p>
            {refImages.length > 0 && (
              <div className="mt-4 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                {refImages.map(img => (
                  <div key={img.id} className="relative aspect-square">
                    <img src={`data:${img.mimeType};base64,${img.base64Image}`} alt={img.name} className="w-full h-full object-cover rounded-md" />
                  </div>
                ))}
              </div>
            )}
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="mt-4 flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed border-[var(--border-color-light)] px-6 py-12 text-center cursor-pointer hover:border-[var(--primary-color)]">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept="image/png, image/jpeg"
                multiple
                disabled={refImages.length >= 3}
              />
              <span className="material-symbols-outlined text-4xl text-[var(--primary-color)]">cloud_upload</span>
              <p className="text-white font-semibold">Drag & drop images here, or click to browse</p>
              <p className="text-sm text-[var(--text-dim)]">Maximum 3 images. JPG, PNG accepted.</p>
            </div>
          </div>
          <div>
            <h3 className="flex items-center gap-3 text-white text-xl font-bold tracking-tight">
              <span className="material-symbols-outlined text-[var(--primary-color)]"> lock </span>
              Identity Locking
            </h3>
            <p className="text-[var(--text-dim)] mt-1">Lock the character's visual identity to ensure consistency across all generated scenes.</p>
            <div className="mt-4 flex items-center justify-between rounded-lg bg-[var(--bg-inset)] p-4">
              <p className="font-medium text-white">Enable Identity Locking for this character</p>
              <label className="relative flex h-8 w-14 cursor-pointer items-center rounded-full bg-[var(--border-color)] p-1 has-[:checked]:bg-[var(--primary-color)]">
                <input
                  checked={identityLocked}
                  onChange={(e) => setIdentityLocked(e.target.checked)}
                  className="absolute h-full w-full opacity-0 [&:checked+div]:translate-x-6"
                  type="checkbox"
                />
                <div className="size-6 rounded-full bg-white transition-transform duration-300 ease-in-out" style={{ boxShadow: 'rgba(0, 0, 0, 0.15) 0px 3px 8px, rgba(0, 0, 0, 0.06) 0px 3px 1px' }}></div>
              </label>
            </div>
          </div>
        </div>
        <div className="flex justify-between items-center gap-4">
            <div>
                {isEditMode && (
                    <button
                        onClick={handleDeleteCharacter}
                        className="flex min-w-[84px] cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-full h-12 px-6 bg-transparent text-red-500/80 text-base font-bold hover:bg-red-500/10 hover:text-red-500"
                    >
                        <span className="material-symbols-outlined">delete</span>
                        <span>Delete Character</span>
                    </button>
                )}
            </div>
            <div className="flex justify-end gap-4">
                <button
                    onClick={() => navigate(Page.GENERATOR)}
                    className="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-full h-12 px-6 bg-[var(--border-color)] text-white/80 text-base font-bold hover:bg-[var(--border-color-light)] hover:text-white">
                    <span className="truncate">Cancel</span>
                </button>
                <button
                    onClick={handleSaveOrUpdateBlueprint}
                    disabled={isLoading}
                    className="flex min-w-[84px] w-52 cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-full h-12 px-6 bg-[var(--primary-color)] text-[var(--bg-inset)] text-base font-bold hover:opacity-90 disabled:opacity-50">
                    {isLoading ? (
                    <>
                        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>{isEditMode ? 'Updating...' : 'Saving...'}</span>
                    </>
                    ) : (
                    <>
                        <span className="material-symbols-outlined">save</span>
                        <span className="truncate">{isEditMode ? 'Update Blueprint' : 'Save Blueprint'}</span>
                    </>
                    )}
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default BlueprintPage;
