
import React, { useState, useContext, useEffect } from 'react';
import { AppContext } from '../context/AppContext';
import { Page, Scene, Edit, ImageHistoryEntry } from '../types';
import { editImage } from '../services/geminiService';
import { downloadFile } from '../utils/fileUtils';
import toast from 'react-hot-toast';

const EditorPage: React.FC = () => {
    const { navigate, activeScene, updateActiveScene } = useContext(AppContext);
    const [editPrompt, setEditPrompt] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    
    useEffect(() => {
        if (!activeScene) {
            navigate(Page.GENERATOR);
        }
    }, [activeScene, navigate]);

    if (!activeScene) {
        return (
            <div className="flex items-center justify-center h-full w-full text-white bg-[var(--bg-main)]">
                Loading scene or redirecting...
            </div>
        );
    }
    
    const handleApplyChanges = async () => {
        if (!editPrompt.trim() || !activeScene) return;

        setIsLoading(true);
        try {
            const result = await editImage(activeScene.base64Image, activeScene.mimeType, editPrompt, activeScene.characters);
            
            const newImageUrl = `data:${result.mimeType};base64,${result.base64Image}`;
            const newEdit: Edit = {
                id: `edit-${activeScene.editHistory.length}`,
                prompt: editPrompt,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            };
             const newImageHistoryEntry: ImageHistoryEntry = {
                imageUrl: newImageUrl,
                base64Image: result.base64Image,
                mimeType: result.mimeType,
            };

            const updatedEditHistory = [...activeScene.editHistory, newEdit];
            const updatedImageHistory = [...activeScene.imageHistory, newImageHistoryEntry];

            const updatedScene: Scene = {
                ...activeScene,
                imageUrl: newImageUrl,
                base64Image: result.base64Image,
                mimeType: result.mimeType,
                editHistory: updatedEditHistory,
                imageHistory: updatedImageHistory,
            };
            updateActiveScene(updatedScene);
            setEditPrompt('');
            toast.success('Changes applied!');
        } catch (error: any) {
            toast.error(error.message || "Failed to apply changes. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleRevertTo = (index: number) => {
        if (!activeScene || isLoading || index < 0 || index >= activeScene.imageHistory.length) {
            return;
        }

        const newImageHistory = activeScene.imageHistory.slice(0, index + 1);
        const newEditHistory = activeScene.editHistory.slice(0, index + 1);
        const targetImageState = newImageHistory[index];

        const updatedScene: Scene = {
            ...activeScene,
            imageUrl: targetImageState.imageUrl,
            base64Image: targetImageState.base64Image,
            mimeType: targetImageState.mimeType,
            editHistory: newEditHistory,
            imageHistory: newImageHistory,
        };

        updateActiveScene(updatedScene);
        toast.success(`Reverted to "${newEditHistory[newEditHistory.length - 1].prompt}"`);
    };


    const handleDownload = () => {
        if(activeScene) {
            downloadFile(activeScene.base64Image, activeScene.mimeType, `sparkframe-edited-${activeScene.id}.png`);
        }
    }

    return (
        <div className="flex h-full flex-col text-white bg-[var(--bg-main)]">
            <main className="flex flex-1 overflow-hidden">
                <div className="flex flex-1 flex-col gap-6 p-8">
                    <div className="flex flex-col gap-1.5">
                        <h2 className="text-4xl font-bold tracking-tight">Conversational Edits</h2>
                        <p className="text-lg text-[var(--text-dim)]">Refine your scene with natural language. Describe the changes you want, and SparkFrame will apply them.</p>
                    </div>
                    <div className="flex-1 flex items-center justify-center rounded-xl overflow-hidden border-2 border-[var(--border-color)] min-h-0 shadow-2xl shadow-black/30 bg-[var(--bg-inset)] p-2">
                        <img 
                            src={activeScene.imageUrl} 
                            alt="Current scene for editing" 
                            className="max-w-full max-h-full object-contain rounded-lg"
                        />
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="relative flex-1">
                            <span className="material-symbols-outlined absolute left-5 top-1/2 -translate-y-1/2 text-[var(--text-dim)]"> edit_note </span>
                            <input
                                value={editPrompt}
                                onChange={(e) => setEditPrompt(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleApplyChanges()}
                                className="form-input w-full rounded-full border-2 border-[var(--border-color-light)] bg-[var(--bg-content)] h-14 pl-14 pr-6 text-base placeholder:text-[var(--text-dim)] focus:border-[var(--primary-color)] focus:ring-[var(--primary-color)]"
                                placeholder='e.g., "add a glowing sword" or "make it nighttime"'
                                type="text"
                                disabled={isLoading}
                            />
                        </div>
                        <button onClick={handleApplyChanges} disabled={isLoading || !editPrompt} className="flex items-center justify-center rounded-full h-14 px-8 bg-[var(--primary-color)] text-[var(--bg-inset)] text-base font-bold tracking-wide hover:opacity-80 disabled:opacity-50">
                            {isLoading ? 'Applying...' : 'Apply Changes'}
                        </button>
                    </div>
                </div>
                <div className={`relative transition-all duration-300 ease-in-out ${isSidebarOpen ? 'w-[400px]' : 'w-0'}`}>
                    <button
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className="absolute top-8 -left-4 z-10 bg-[var(--border-color)] hover:bg-[var(--border-color-light)] text-white rounded-full h-8 w-8 flex items-center justify-center border-2 border-[var(--bg-main)]"
                        title={isSidebarOpen ? 'Collapse Sidebar' : 'Expand Sidebar'}
                    >
                        <span
                            className="material-symbols-outlined transition-transform duration-300"
                            style={{ transform: isSidebarOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                        >
                            chevron_right
                        </span>
                    </button>
                    <aside className="w-[400px] h-full flex flex-col border-l border-[var(--border-color)] bg-[var(--bg-content)] overflow-hidden">
                        <div className="border-b border-[var(--border-color)] p-8">
                            <h3 className="text-2xl font-bold">Scene Details</h3>
                            <div className="mt-4 grid grid-cols-[max-content_1fr] gap-x-4 gap-y-3 text-base">
                                <span className="text-[var(--text-dim)]">Scene ID</span>
                                <span className="font-medium text-right truncate">{activeScene.id.slice(-6).toUpperCase()}</span>
                                <span className="text-[var(--text-dim)]">Characters</span>
                                <span className="font-medium text-right truncate">{activeScene.characters.map(c => c.name).join(', ') || 'N/A'}</span>
                                <span className="text-[var(--text-dim)]">Description</span>
                                <span className="font-medium text-right truncate">{activeScene.description}</span>
                            </div>
                        </div>
                        <div className="flex flex-1 flex-col p-8 overflow-y-auto">
                            <h3 className="text-2xl font-bold mb-4">Edit Log</h3>
                            <div className="flex flex-col">
                                {activeScene.editHistory.map((edit, index) => {
                                    const isCurrent = index === activeScene.editHistory.length - 1;
                                    return (
                                    <div key={edit.id} onClick={() => handleRevertTo(index)} className="timeline-item flex gap-4 cursor-pointer group">
                                        <div className="flex flex-col items-center">
                                            <div className={`flex size-10 items-center justify-center rounded-full ${isCurrent ? 'bg-[var(--primary-color)] text-[var(--bg-inset)]' : 'bg-[var(--border-color)] group-hover:bg-[var(--border-color-light)]'}`}>
                                                <span className="material-symbols-outlined">{index === 0 ? 'image' : 'auto_fix'}</span>
                                            </div>
                                            {index < activeScene.editHistory.length - 1 && <div className="timeline-connector w-0.5 flex-grow bg-[var(--border-color)]"></div>}
                                        </div>
                                        <div className="pb-8 pt-2">
                                            <p className={`font-medium text-base truncate max-w-xs ${isCurrent ? 'text-white' : 'text-[var(--text-dim)] group-hover:text-white'}`}>{edit.prompt}</p>
                                            <p className="text-sm text-[var(--text-dim)]">{edit.timestamp}</p>
                                        </div>
                                    </div>
                                    );
                                })}
                            </div>
                        </div>
                        <div className="p-8 mt-auto border-t border-[var(--border-color)]">
                             <button onClick={handleDownload} disabled={!activeScene?.base64Image} className="w-full flex items-center justify-center gap-2 rounded-full h-12 px-5 bg-[var(--border-color)] text-white font-bold hover:bg-[var(--border-color-light)] disabled:opacity-50">
                                <span className="material-symbols-outlined">download</span>
                                <span>Download Current Image</span>
                            </button>
                        </div>
                    </aside>
                </div>
            </main>
        </div>
    );
};

export default EditorPage;