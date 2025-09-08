import React, { useState, useContext, useMemo, useRef } from 'react';
import { AppContext } from '../context/AppContext';
import { Page, SceneVersion } from '../types';
import { generateImageFromText, generateText, editImage } from '../services/geminiService';
import toast from 'react-hot-toast';
import { loadHtml2Canvas } from '../utils/libsLoader';

type LayoutOption = 'Classic' | 'Modern' | 'Minimalist';

interface ComicPanel extends SceneVersion {
    instanceId: string;
    caption?: string;
}

const ComicExportPage: React.FC = () => {
    const { storyboard, characters, navigate } = useContext(AppContext);
    const [layout, setLayout] = useState<LayoutOption>('Classic');
    const [comicPanels, setComicPanels] = useState<ComicPanel[]>([]);
    const [selectedPanelInstanceId, setSelectedPanelInstanceId] = useState<string | null>(null);
    
    const [captionText, setCaptionText] = useState('');
    const [editPrompt, setEditPrompt] = useState('');

    const [newPanelPrompt, setNewPanelPrompt] = useState('');
    const [selectedCharacters, setSelectedCharacters] = useState<Set<string>>(new Set());
    
    const [isLoading, setIsLoading] = useState(false);
    const [isTextLoading, setIsTextLoading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    
    const previewRef = useRef<HTMLDivElement>(null);

    const dragPanel = useRef<number | null>(null);
    const dragOverPanel = useRef<number | null>(null);

    const allAvailablePanels = useMemo(() => {
        return storyboard.flatMap(scene => scene.versions.filter(v => v.isCurrent).map(v => ({ ...v, sceneId: scene.id })))
    }, [storyboard]);

    if (storyboard.length === 0 && comicPanels.length === 0) {
       return (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-[var(--bg-main)]">
                 <div className="flex flex-col items-center justify-center bg-[var(--bg-content)] p-10 rounded-2xl border border-[var(--border-color)]">
                    <span className="material-symbols-outlined text-6xl text-[var(--primary-color)] mb-4">view_carousel</span>
                    <h2 className="text-3xl font-bold text-white">Assemble Your Comic</h2>
                    <p className="text-[var(--text-dim)] mt-2 max-w-md">
                    First, create some scenes using the Scene Generator. They'll appear here, ready to be arranged into your comic book.
                    </p>
                    <button onClick={() => navigate(Page.GENERATOR)} className="mt-6 flex items-center justify-center gap-2 rounded-full h-12 px-6 bg-[var(--primary-color)] text-[var(--bg-inset)] text-base font-bold hover:bg-opacity-90">
                        <span className="material-symbols-outlined">add</span>
                        <span>Go to Scene Generator</span>
                    </button>
                 </div>
            </div>
        )
    }

    const handleAddPanel = (panel: SceneVersion) => {
        const newPanel: ComicPanel = {
            ...panel,
            instanceId: `panel-${Date.now()}`
        };
        setComicPanels(prev => [...prev, newPanel]);
    };
    
    const handleRemovePanel = (instanceId: string) => {
        setComicPanels(prev => prev.filter(p => p.instanceId !== instanceId));
        if (selectedPanelInstanceId === instanceId) {
            setSelectedPanelInstanceId(null);
        }
    };

    const handleGeneratePanel = async () => {
        if (!newPanelPrompt.trim()) return;

        setIsLoading(true);
        const chars = characters.filter(c => selectedCharacters.has(c.id));
        const fullPrompt = `A single comic book panel with a ${layout} aesthetic. The scene is: ${newPanelPrompt}`;
        
        try {
            const result = await generateImageFromText(fullPrompt, chars, null);
            const newVersion: SceneVersion = {
                id: `gen-${Date.now()}`,
                name: "Generated Panel",
                timestamp: new Date().toLocaleTimeString(),
                imageUrl: `data:${result.mimeType};base64,${result.base64Image}`,
                base64Image: result.base64Image,
                mimeType: result.mimeType,
                isCurrent: true,
            };
            handleAddPanel(newVersion);
            setNewPanelPrompt('');
        } catch(error: any) {
            toast.error(error.message || "Failed to generate panel.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddCaption = () => {
        if (!selectedPanelInstanceId || !captionText.trim()) return;
        setComicPanels(prev => prev.map(p => p.instanceId === selectedPanelInstanceId ? { ...p, caption: captionText } : p));
        setCaptionText('');
    };

    const handleGenerateCaption = async () => {
        if (!selectedPanelInstanceId) return;
        setIsTextLoading(true);
        try {
            const prompt = `Write a short, compelling comic book caption for an image. The caption should be one or two sentences.`;
            const result = await generateText(prompt);
            setCaptionText(result.replace(/["*]/g, ''));
        } catch(error: any) {
             toast.error(error.message || "Failed to generate caption.");
        } finally {
            setIsTextLoading(false);
        }
    };

    const handleApplyEdit = async () => {
        if (!selectedPanelInstanceId || !editPrompt.trim()) return;

        const panelToEdit = comicPanels.find(p => p.instanceId === selectedPanelInstanceId);
        if (!panelToEdit) return;

        setIsEditing(true);
        try {
            const result = await editImage(panelToEdit.base64Image, panelToEdit.mimeType, editPrompt, [], panelToEdit.imageUrl?.startsWith('/generated/') ? panelToEdit.imageUrl : undefined);
            const newImageUrl = result.fileUrl ? result.fileUrl : `data:${result.mimeType};base64,${result.base64Image}`;
            const updatedPanel: ComicPanel = { ...panelToEdit, imageUrl: newImageUrl, base64Image: result.base64Image, mimeType: result.mimeType };
            setComicPanels(prev => prev.map(p => p.instanceId === selectedPanelInstanceId ? updatedPanel : p));
            setEditPrompt('');
        } catch (error: any) {
            toast.error(error.message || "Failed to edit panel.");
        } finally {
            setIsEditing(false);
        }
    };

    const handleExport = async () => {
        if (!previewRef.current || isExporting) return;
        setIsExporting(true);
        const exportToastId = toast.loading('Preparing comic for export...');

        try {
            const html2canvas = await loadHtml2Canvas();
            setSelectedPanelInstanceId(null); // Deselect panel before export
            await new Promise(resolve => setTimeout(resolve, 100)); // wait for re-render
            
            const canvas = await html2canvas(previewRef.current!, { useCORS: true, backgroundColor: '#0f172a' });
            const link = document.createElement('a');
            link.download = `SparkFrame-Comic-${Date.now()}.png`;
            link.href = canvas.toDataURL();
            link.click();
            toast.success('Download started!', { id: exportToastId });
        } catch (err: any) {
            console.error("Error exporting image:", err);
            toast.error(err.message || "An error occurred during export.", { id: exportToastId });
        } finally {
            setIsExporting(false);
        }
    };

    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, position: number) => { dragPanel.current = position; };
    const handleDragEnter = (e: React.DragEvent<HTMLDivElement>, position: number) => { dragOverPanel.current = position; };
    const handleReorder = () => {
        if (dragPanel.current === null || dragOverPanel.current === null || dragPanel.current === dragOverPanel.current) return;
        const comicPanelsCopy = [...comicPanels];
        const draggedPanelContent = comicPanelsCopy.splice(dragPanel.current, 1)[0];
        comicPanelsCopy.splice(dragOverPanel.current, 0, draggedPanelContent);
        dragPanel.current = null;
        dragOverPanel.current = null;
        setComicPanels(comicPanelsCopy);
    };
    
    const layoutClasses = { Classic: 'grid-cols-2 gap-4 p-4', Modern: 'grid-cols-3 gap-2 p-2', Minimalist: 'grid-cols-1 gap-6 p-6' };

    return (
        <div className="flex-grow px-4 sm:px-6 lg:px-10 py-6 lg:py-8">
            <div className="mx-auto max-w-7xl">
                 <div className="mb-8">
                    <h2 className="text-4xl font-bold tracking-tight">Comic Book Exporter</h2>
                    <p className="text-[var(--text-dim)] mt-2 text-lg">Arrange panels, add text, and export your comic page.</p>
                </div>
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 xl:gap-12">
                    <div className="xl:col-span-1 space-y-6 xl:space-y-8">
                        {/* Controls */}
                        <section>
                            <h3 className="text-xl font-bold tracking-tight mb-4">1. Add Panels</h3>
                            <div className="space-y-4">
                                <h4 className="font-semibold text-[var(--text-dim)]">From Storyboard</h4>
                                 <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-2 bg-[var(--bg-inset)] p-2 rounded-lg border border-[var(--border-color)]">
                                    {allAvailablePanels.length > 0 ? allAvailablePanels.map((panel) => (
                                        <div key={`${panel.sceneId}-${panel.id}`} onClick={() => handleAddPanel(panel)} className="group relative cursor-pointer rounded-md overflow-hidden border-2 border-transparent hover:border-[var(--primary-color)]">
                                            <div className="w-full bg-center bg-no-repeat aspect-square bg-cover" style={{ backgroundImage: `url("${panel.imageUrl}")` }}></div>
                                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100">
                                                <span className="material-symbols-outlined text-4xl">add</span>
                                            </div>
                                        </div>
                                    )) : <p className="col-span-3 text-center text-sm text-[var(--text-dim)] py-4">Generate scenes to add them here.</p>}
                                </div>

                                <h4 className="font-semibold pt-4 text-[var(--text-dim)]">Generate New Panel</h4>
                                <textarea value={newPanelPrompt} onChange={e => setNewPanelPrompt(e.target.value)} className="form-textarea block w-full rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[var(--primary-color)] border border-[var(--border-color-light)] bg-[var(--bg-inset)] h-24 p-3 placeholder:text-[var(--text-dim)] resize-y" placeholder="e.g., A hero standing on a cliff..."></textarea>
                                <button onClick={handleGeneratePanel} disabled={isLoading} className="w-full flex items-center justify-center gap-2 rounded-full h-10 bg-[var(--border-color)] text-white font-bold hover:bg-[var(--border-color-light)] disabled:opacity-50">
                                    {isLoading ? 'Generating...' : 'Generate & Add Panel'}
                                </button>
                            </div>
                        </section>

                        <section>
                            <h3 className="text-xl font-bold tracking-tight mb-4">2. Edit Selected Panel</h3>
                            <div className={`space-y-6 rounded-lg bg-[var(--bg-content)] border border-[var(--border-color)] p-4 ${!selectedPanelInstanceId ? 'opacity-50 pointer-events-none' : ''}`}>
                                <p className="text-sm text-[var(--text-dim)] -mb-2">{selectedPanelInstanceId ? 'Editing selected panel.' : 'Select a panel from the preview to edit it.'}</p>

                                <div>
                                    <h4 className="font-semibold mb-2 text-white">Edit Image with AI</h4>
                                    <textarea disabled={isEditing} value={editPrompt} onChange={e => setEditPrompt(e.target.value)} className="form-textarea block w-full rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[var(--primary-color)] border border-[var(--border-color-light)] bg-[var(--bg-inset)] h-20 p-3 placeholder:text-[var(--text-dim)] resize-y" placeholder="e.g., 'Make it nighttime'"></textarea>
                                    <button onClick={handleApplyEdit} disabled={!editPrompt.trim() || isEditing} className="mt-2 w-full flex items-center justify-center gap-2 rounded-full h-10 bg-[var(--border-color)] text-white font-bold hover:bg-[var(--border-color-light)] disabled:opacity-50">
                                        {isEditing ? 'Applying...' : 'Apply Edit'}
                                    </button>
                                </div>

                                <div>
                                    <h4 className="font-semibold mb-2 text-white">Add Text Overlay</h4>
                                    <div className='flex items-center gap-2'>
                                        <textarea disabled={isTextLoading} value={captionText} onChange={e => setCaptionText(e.target.value)} className="form-textarea block w-full rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[var(--primary-color)] border border-[var(--border-color-light)] bg-[var(--bg-inset)] h-20 p-3 placeholder:text-[var(--text-dim)] resize-y" placeholder="Enter text or generate it"></textarea>
                                        <button onClick={handleGenerateCaption} disabled={isTextLoading} title="Generate with AI" className="h-20 px-3 rounded-lg bg-[var(--border-color)] hover:bg-[var(--border-color-light)] flex items-center justify-center disabled:opacity-50">
                                            <span className={`material-symbols-outlined ${isTextLoading ? 'animate-spin' : ''}`}>{isTextLoading ? 'sync' : 'auto_awesome'}</span>
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 mt-2">
                                        <button onClick={handleAddCaption} disabled={!captionText.trim()} className="w-full flex items-center justify-center gap-2 rounded-full h-10 bg-[var(--border-color)] text-white font-bold hover:bg-[var(--border-color-light)] disabled:opacity-50">
                                        Add Caption Strip
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </section>
                    </div>

                    <div className="xl:col-span-2">
                         <div className="flex justify-between items-center mb-4">
                            <div>
                                <h3 className="text-xl font-bold tracking-tight">3. Arrange & Export</h3>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {(['Classic', 'Modern', 'Minimalist'] as LayoutOption[]).map(l => (
                                        <label key={l} className="flex items-center justify-center rounded-full border-2 border-[var(--border-color)] px-4 py-1 text-white cursor-pointer has-[:checked]:border-[var(--primary-color)] has-[:checked]:bg-blue-900/20 text-sm">
                                            <input checked={layout === l} onChange={() => setLayout(l)} className="sr-only" name="layout" type="radio" />
                                            <span>{l}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <button onClick={handleExport} disabled={isExporting} className="flex items-center gap-2 min-w-[84px] cursor-pointer justify-center overflow-hidden rounded-full h-10 px-4 bg-[var(--primary-color)] text-[var(--bg-inset)] text-sm font-bold hover:opacity-80 disabled:opacity-50">
                                {isExporting ? 'Exporting...' : <><span className="material-symbols-outlined">download</span><span className="truncate">Export as Image</span></>}
                            </button>
                        </div>
                        <div ref={previewRef} className={`w-full bg-[var(--bg-content)] rounded-lg border border-[var(--border-color)] min-h-[400px] sm:min-h-[500px] lg:min-h-[600px] grid ${layoutClasses[layout]}`}>
                            {comicPanels.map((panel, index) => (
                                <div 
                                    key={panel.instanceId} draggable onDragStart={(e) => handleDragStart(e, index)} onDragEnter={(e) => handleDragEnter(e, index)} onDragEnd={handleReorder} onDragOver={(e) => e.preventDefault()}
                                    onClick={() => setSelectedPanelInstanceId(panel.instanceId)}
                                    className={`group relative cursor-grab rounded overflow-hidden aspect-square bg-cover bg-center border-4 ${selectedPanelInstanceId === panel.instanceId ? 'border-[var(--primary-color)]' : 'border-transparent'}`}
                                    style={{ backgroundImage: `url("${panel.imageUrl}")` }}>
                                    {/* Bubble overlay removed for time constraints */}

                                    {panel.caption && (
                                        <div className="absolute bottom-0 left-0 right-0 bg-white/90 text-black p-2 text-sm text-center font-bold" style={{fontFamily: 'Comic Sans MS, cursive'}}>
                                            {panel.caption}
                                        </div>
                                    )}
                                    <button onClick={(e) => {e.stopPropagation(); handleRemovePanel(panel.instanceId)}} title="Remove Panel"
                                        className="absolute top-2 right-2 h-7 w-7 bg-red-600/80 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-500 z-10">
                                        <span className="material-symbols-outlined text-base">delete</span>
                                    </button>
                                </div>
                            ))}
                            {comicPanels.length === 0 && <p className="text-[var(--text-dim)] col-span-full place-self-center">Add panels to create your comic.</p>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ComicExportPage;
