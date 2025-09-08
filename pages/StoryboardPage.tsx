import React, { useState, useContext, useEffect, useRef } from 'react';
import { AppContext } from '../context/AppContext';
import { StoryboardScene, Scene, Page, Character, TransitionType } from '../types';
import { downloadFile } from '../utils/fileUtils';

const StoryboardPage: React.FC = () => {
    const { storyboard, characters, navigate, updateSceneTransition, deleteSceneFromStoryboard } = useContext(AppContext);
    const [selectedScene, setSelectedScene] = useState<StoryboardScene | null>(storyboard.length > 0 ? storyboard[0] : null);
    const [animationClass, setAnimationClass] = useState('');
    const prevSceneRef = useRef<StoryboardScene | null>(null);
    
    useEffect(() => {
        // If the selected scene is no longer in the storyboard, or if there's no selected scene
        // and the storyboard has items, update the selected scene.
        if (storyboard.length > 0 && (!selectedScene || !storyboard.find(s => s.id === selectedScene.id))) {
            setSelectedScene(storyboard[0]);
        } else if (storyboard.length === 0) {
            setSelectedScene(null);
        }
    }, [storyboard, selectedScene]);

     useEffect(() => {
        // This effect runs AFTER selectedScene has been updated.
        // prevSceneRef.current holds the scene we just transitioned FROM.
        if (prevSceneRef.current && selectedScene && prevSceneRef.current.id !== selectedScene.id) {
            const transition = prevSceneRef.current.transitionToNext || 'Fade'; // Default to Fade
            
            switch (transition) {
                case 'Fade':
                    setAnimationClass('transition-fade');
                    break;
                case 'Slide':
                    setAnimationClass('transition-slide');
                    break;
                case 'Dissolve':
                    setAnimationClass('transition-dissolve');
                    break;
                case 'None':
                default:
                    setAnimationClass('');
                    break;
            }

            // Reset the animation class after it runs so it can be re-triggered
            const timer = setTimeout(() => setAnimationClass(''), 600);
            return () => clearTimeout(timer);
        }

        // At the end of the effect, update the ref to the current scene for the next transition.
        prevSceneRef.current = selectedScene;
    }, [selectedScene]);
    
    if (storyboard.length === 0) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-[var(--bg-main)]">
                <div className="flex flex-col items-center justify-center bg-[var(--bg-content)] p-10 rounded-2xl border border-[var(--border-color)]">
                    <span className="material-symbols-outlined text-6xl text-[var(--primary-color)] mb-4">movie</span>
                    <h2 className="text-3xl font-bold text-white">Your Storyboard Awaits</h2>
                    <p className="text-[var(--text-dim)] mt-2 max-w-md">
                    This is where your generated scenes will be organized. Go to the Scene Generator to create your first visual.
                    </p>
                    <button onClick={() => navigate(Page.GENERATOR)} className="mt-6 flex items-center justify-center gap-2 rounded-full h-12 px-6 bg-[var(--primary-color)] text-[var(--bg-inset)] text-base font-bold hover:bg-opacity-90">
                        <span className="material-symbols-outlined">add</span>
                        <span>Generate First Scene</span>
                    </button>
                </div>
            </div>
        )
    }
    
    const currentVersion = selectedScene?.versions.find(v => v.isCurrent);

    const handleEdit = () => {
        if (selectedScene && currentVersion) {
            const sceneCharacters = selectedScene.characterIds
                .map(id => characters.find(char => char.id === id))
                .filter((char): char is Character => !!char);

            const sceneToEdit: Scene = {
                id: selectedScene.id,
                description: selectedScene.narrative,
                narrative: selectedScene.narrative,
                imageUrl: currentVersion.imageUrl,
                base64Image: currentVersion.base64Image,
                mimeType: currentVersion.mimeType,
                characters: sceneCharacters,
                characterIds: selectedScene.characterIds,
                editHistory: selectedScene.versions.map((v, i) => ({
                    id: `edit-${i}`,
                    prompt: v.prompt || (i === 0 ? 'Original Image' : `Version ${i+1}`),
                    timestamp: v.timestamp
                })),
                imageHistory: selectedScene.versions.map(v => ({
                    imageUrl: v.imageUrl,
                    base64Image: v.base64Image,
                    mimeType: v.mimeType,
                })),
            };
            navigate(Page.EDITOR, { sceneToEdit });
        }
    };

    const handleDownload = () => {
        if (currentVersion) {
            downloadFile(currentVersion.base64Image, currentVersion.mimeType, `sparkframe-storyboard-${selectedScene?.id}.png`);
        }
    }

    return (
        <div className="flex-1 px-4 sm:px-6 lg:px-10 py-6 lg:py-8">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-start mb-12">
                    <div>
                        <h2 className="text-4xl font-bold tracking-tight text-white">Storyboard Timeline</h2>
                        <p className="text-[var(--text-dim)] mt-2 text-lg">Organize and track different versions of each scene.</p>
                    </div>
                    <button
                        onClick={() => navigate(Page.CINEMATIC_PLAYBACK)}
                        className="flex-shrink-0 flex items-center justify-center gap-2 rounded-full h-12 px-6 bg-[var(--border-color)] text-white font-bold hover:bg-[var(--border-color-light)] transition-colors"
                        title="Play Cinematic Slideshow"
                    >
                        <span className="material-symbols-outlined">slideshow</span>
                        <span>Play Cinematic</span>
                    </button>
                </div>
                <div className="flex flex-col lg:flex-row gap-8 lg:gap-16">
                    <div className="w-full lg:w-2/3">
                        <div className="space-y-8">
                            {storyboard.map((scene, index) => (
                                <div key={scene.id} className="flex gap-6 relative timeline-item-storyboard">
                                    <div className="flex-shrink-0 z-10">
                                        <div className={`size-9 rounded-full flex items-center justify-center font-bold text-lg ${selectedScene?.id === scene.id ? 'bg-[var(--primary-color)] text-[var(--bg-inset)]' : 'bg-[var(--border-color)] text-white'}`}>{scene.sceneNumber}</div>
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between mb-3">
                                            <h3 className="text-xl font-semibold text-white">{scene.title}</h3>
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm text-[var(--text-dim)]">Version {scene.versions.length}</span>
                                                <button
                                                    onClick={() => deleteSceneFromStoryboard(scene.id)}
                                                    title="Delete this scene"
                                                    className="rounded-md h-8 px-3 bg-red-600/80 text-white text-xs font-semibold hover:bg-red-600"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                           {scene.versions.slice(-3).reverse().map(version => (
                                                <div key={version.id} className="relative group cursor-pointer" onClick={() => setSelectedScene(scene)}>
                                                    <img 
                                                        loading="lazy"
                                                        alt={scene.title + " thumbnail"}
                                                        className={`rounded-lg aspect-video object-cover w-full border-2 transition-all duration-300 ${selectedScene?.id === scene.id && version.isCurrent ? 'border-[var(--primary-color)] shadow-lg shadow-[var(--primary-color)]/20' : 'border-transparent group-hover:border-[var(--primary-color)]'}`}
                                                        src={version.imageUrl}
                                                    />
                                                </div>
                                           ))}
                                        </div>
                                        {index < storyboard.length - 1 && (
                                            <div className="mt-6 pt-4 border-t border-dashed border-[var(--border-color)]">
                                                <label className="flex items-center gap-3 text-sm">
                                                    <span className="font-medium text-[var(--text-dim)] flex items-center gap-1">
                                                        <span className="material-symbols-outlined text-base">swap_horiz</span>
                                                        Transition to Scene {scene.sceneNumber + 1}:
                                                    </span>
                                                    <select
                                                        value={scene.transitionToNext || 'None'}
                                                        onChange={(e) => updateSceneTransition(scene.id, e.target.value as TransitionType)}
                                                        onClick={(e) => e.stopPropagation()} 
                                                        className="form-select rounded-md bg-[var(--bg-inset)] border-[var(--border-color-light)] focus:ring-[var(--primary-color)] focus:border-[var(--primary-color)] text-white text-sm py-1 pl-2 pr-8"
                                                    >
                                                        <option value="None">None</option>
                                                        <option value="Fade">Fade</option>
                                                        <option value="Slide">Slide</option>
                                                        <option value="Dissolve">Dissolve</option>
                                                    </select>
                                                </label>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    {selectedScene && currentVersion && (
                        <aside className="w-full lg:w-1/3 h-fit lg:sticky lg:top-8">
                            <div key={selectedScene.id} className={`bg-[var(--bg-content)] rounded-xl p-6 border border-[var(--border-color)] ${animationClass}`}>
                                <h3 className="text-2xl font-bold mb-4 text-white">{selectedScene.title}</h3>
                                <div className="relative mb-4 group">
                                    <img loading="lazy" alt="Selected scene" className="rounded-lg w-full aspect-video object-cover" src={currentVersion?.imageUrl} />
                                    <div className="absolute inset-0 bg-black/40 rounded-lg opacity-0 group-hover:opacity-100 flex items-center justify-center gap-4">
                                        <button onClick={handleEdit} className="bg-black/50 backdrop-blur-sm p-3 rounded-full text-white hover:bg-white/20" title="Edit Scene">
                                            <span className="material-symbols-outlined">edit</span>
                                        </button>
                                        <button onClick={handleDownload} className="bg-black/50 backdrop-blur-sm p-3 rounded-full text-white hover:bg-white/20" title="Download Image">
                                            <span className="material-symbols-outlined">download</span>
                                        </button>
                                    </div>
                                </div>
                                <h4 className="font-semibold mb-3 text-white">Versions</h4>
                                <div className="space-y-3 max-h-48 overflow-y-auto pr-2">
                                    {selectedScene.versions.slice().reverse().map(version => (
                                        <div key={version.id} className="flex items-center gap-4 p-2 rounded-lg hover:bg-white/5 cursor-pointer">
                                            <img alt={version.name} className={`w-16 h-10 object-cover rounded-md border-2 ${version.isCurrent ? 'border-[var(--primary-color)]' : 'border-transparent'}`} src={version.imageUrl} />
                                            <div>
                                                <p className="font-medium text-white">{version.name}</p>
                                                <p className="text-sm text-[var(--text-dim)]">{version.timestamp}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </aside>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StoryboardPage;