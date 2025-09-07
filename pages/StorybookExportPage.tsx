import React, { useState, useContext, useEffect } from 'react';
import { AppContext } from '../context/AppContext';
import { Page } from '../types';
import toast from 'react-hot-toast';
import { loadHtml2Canvas, loadJsPDF } from '../utils/libsLoader';


const StorybookExportPage: React.FC = () => {
  const { navigate, storyboard, updateSceneNarrative } = useContext(AppContext);

  const [title, setTitle] = useState("Anya's Magical Seed");
  const [summary, setSummary] = useState("A young hero named Anya embarks on a quest for treasure, but finds a magical seed that promises a different kind of reward.");
  const [sceneNarratives, setSceneNarratives] = useState<Record<string, string>>({});
  // fix: Corrected the syntax for useState.
  const [isLoading, setIsLoading] = useState<'loading' | 'idle' | 'error'>('idle');

  useEffect(() => {
    const initialNarratives: Record<string, string> = {};
    storyboard.forEach(scene => {
      initialNarratives[scene.id] = scene.narrative;
    });
    setSceneNarratives(initialNarratives);
  }, [storyboard]);

  const handleNarrativeChange = (sceneId: string, text: string) => {
    setSceneNarratives(prev => ({ ...prev, [sceneId]: text }));
  };
  
  const handleNarrativeBlur = (sceneId: string) => {
    updateSceneNarrative(sceneId, sceneNarratives[sceneId]);
  };

  if (storyboard.length === 0) {
       return (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-[var(--bg-main)]">
                 <div className="flex flex-col items-center justify-center bg-[var(--bg-content)] p-10 rounded-2xl border border-[var(--border-color)]">
                    <span className="material-symbols-outlined text-6xl text-[var(--primary-color)] mb-4">auto_stories</span>
                    <h2 className="text-3xl font-bold text-white">Craft Your Storybook</h2>
                    <p className="text-[var(--text-dim)] mt-2 max-w-md">
                    Once you've generated scenes and organized them in your storyboard, you can edit narratives and export your complete storybook here.
                    </p>
                    <button onClick={() => navigate(Page.GENERATOR)} className="mt-6 flex items-center justify-center gap-2 rounded-full h-12 px-6 bg-[var(--primary-color)] text-[var(--bg-inset)] text-base font-bold hover:bg-opacity-90">
                        <span className="material-symbols-outlined">add</span>
                        <span>Go to Scene Generator</span>
                    </button>
                 </div>
            </div>
        )
  }
  
 const handleExport = async () => {
    setIsLoading('loading');
    let tempContainer: HTMLDivElement | null = null;
    const exportToastId = toast.loading('Initializing PDF export...');

    try {
        const [{ jsPDF }, html2canvas] = await Promise.all([loadJsPDF(), loadHtml2Canvas()]);
        // Ensure webfonts are ready to avoid layout shifts in captures
        if ((document as any).fonts?.ready) {
            try { await (document as any).fonts.ready; } catch {}
        }
        
        const pdf = new jsPDF({ orientation: 'p', unit: 'px', format: 'a4' });
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const margin = 20;

        tempContainer = document.createElement('div');
        tempContainer.style.position = 'absolute';
        tempContainer.style.left = '-9999px';
        tempContainer.style.width = `${pdfWidth}px`;
        tempContainer.style.background = '#111714';
        tempContainer.style.color = 'white';
        tempContainer.style.fontFamily = '"Spline Sans", "Noto Sans", sans-serif';
        document.body.appendChild(tempContainer);
        
        toast.loading('Generating title page...', { id: exportToastId });
        
        // Title Page
        tempContainer.innerHTML = `
            <div style="width: ${pdfWidth}px; height: ${pdfHeight}px; display: flex; flex-direction: column; justify-content: center; text-align: center; padding: ${margin}px; box-sizing: border-box;">
                <h1 style="font-size: 32px; font-weight: bold; margin-bottom: 20px;">${title}</h1>
                <p style="font-size: 16px; color: #9eb7a8;">${summary}</p>
            </div>
        `;
        // Yield to layout engine to ensure content is measurable
        await new Promise(r => requestAnimationFrame(r));
        await new Promise(r => requestAnimationFrame(r));
        const titleRoot = tempContainer.firstElementChild as HTMLElement | null;
        if (!titleRoot) throw new Error('Failed to build title page');
        const titleCanvas = await html2canvas(titleRoot, { useCORS: true, scale: 2, backgroundColor: '#111714' });
        const titleImgData = titleCanvas.toDataURL('image/png');
        pdf.addImage(titleImgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

        // Scene Pages
        for (let i = 0; i < storyboard.length; i++) {
            const scene = storyboard[i];
            toast.loading(`Processing Scene ${i + 1} of ${storyboard.length}...`, { id: exportToastId });
            
            const currentVersion = scene.versions.find(v => v.isCurrent);
            if (!currentVersion) continue;

            pdf.addPage();
            
            tempContainer.innerHTML = `
                <div style="padding: ${margin}px; width: ${pdfWidth}px; box-sizing: border-box;">
                    <h2 style="font-size: 18px; font-weight: bold; margin-bottom: 15px;">Scene ${scene.sceneNumber}: ${scene.title}</h2>
                    <img id="scene-img-${i}" src="${currentVersion.imageUrl}" style="width: 100%; height: auto; border-radius: 8px; margin-bottom: 15px;" />
                    <p style="font-size: 14px; color: #e2e8f0; line-height: 1.6; white-space: pre-wrap;">${sceneNarratives[scene.id] || scene.narrative}</p>
                </div>
            `;
            // Ensure image is loaded before canvas capture
            await new Promise<void>(resolve => {
                const img = tempContainer.querySelector(`#scene-img-${i}`) as HTMLImageElement;
                if (img.complete) {
                    resolve();
                } else {
                    img.onload = () => resolve();
                    img.onerror = () => resolve(); // continue even if image fails
                }
            });

            // Yield to ensure layout is stable
            await new Promise(r => requestAnimationFrame(r));
            const sceneRoot = tempContainer.firstElementChild as HTMLElement | null;
            if (!sceneRoot) continue;
            const sceneCanvas = await html2canvas(sceneRoot, { useCORS: true, scale: 2, backgroundColor: '#111714' });
            const sceneImgData = sceneCanvas.toDataURL('image/png');
            const imgProps = pdf.getImageProperties(sceneImgData);
            const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;

            if (imgHeight > pdfHeight) {
                console.warn("Scene content is larger than a single page, may be cut off.");
            }
            pdf.addImage(sceneImgData, 'PNG', 0, 0, pdfWidth, Math.min(imgHeight, pdfHeight));
        }

        toast.success('Saving PDF...', { id: exportToastId });
        pdf.save(`SparkFrame-Storybook-${Date.now()}.pdf`);
        setIsLoading('idle');

    } catch (e: any) {
        console.error("PDF Export failed", e);
        toast.error(e.message || "An error occurred during PDF export.", { id: exportToastId });
        setIsLoading('error');
    } finally {
        if (tempContainer) {
            document.body.removeChild(tempContainer);
        }
    }
  };


  return (
    <main className="flex-1 px-10 py-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <h2 className="text-white text-4xl font-bold tracking-tight">Export Storybook</h2>
          <p className="text-[var(--text-dim)] mt-2 text-lg">Finalize your narratives and export your project as a beautiful PDF storybook.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-1 space-y-8">
            <div className={`space-y-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-content)] p-6`}>
              <h3 className="text-white text-lg font-bold">Title Page Details</h3>
              <label className="flex flex-col gap-2">
                <p className="text-sm font-medium text-[var(--text-dim)]">Title</p>
                <input value={title} onChange={(e) => setTitle(e.target.value)} className="form-input w-full rounded-md text-white focus:outline-0 focus:ring-1 focus:ring-[var(--primary-color)] border border-[var(--border-color-light)] bg-[var(--bg-inset)] h-11 px-3 placeholder:text-[var(--text-dim)]" placeholder="Enter story title" />
              </label>
              <label className="flex flex-col gap-2">
                <p className="text-sm font-medium text-[var(--text-dim)]">Summary</p>
                <textarea value={summary} onChange={(e) => setSummary(e.target.value)} className="form-input w-full resize-none rounded-md text-white focus:outline-0 focus:ring-1 focus:ring-[var(--primary-color)] border border-[var(--border-color-light)] bg-[var(--bg-inset)] h-32 p-3 placeholder:text-[var(--text-dim)]" placeholder="Enter story summary"></textarea>
              </label>
            </div>
            <button onClick={handleExport} disabled={isLoading === 'loading'} className="w-full flex items-center gap-2 cursor-pointer justify-center overflow-hidden rounded-full h-12 px-4 bg-[var(--primary-color)] text-[var(--bg-inset)] text-base font-bold hover:opacity-80 disabled:opacity-50">
                <span className="material-symbols-outlined">download</span>
                <span className="truncate">{isLoading === 'loading' ? 'Exporting...' : 'Export Storybook (PDF)'}</span>
              </button>
          </div>
          <div className="md:col-span-2">
            <h3 className="text-white text-lg font-bold mb-4">Scene Narratives</h3>
            <div className="space-y-4">
              {storyboard.map(scene => (
                <div key={scene.id} tabIndex={0} className="group relative rounded-lg border border-[var(--border-color)] bg-[var(--bg-content)] p-4 focus-within:border-[var(--primary-color)] focus-within:ring-1 focus-within:ring-[var(--primary-color)]">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="text-white font-bold">Scene {scene.sceneNumber}</p>
                      <p className="text-[var(--text-dim)] text-sm">{scene.title}</p>
                    </div>
                    <div className="aspect-video h-24 rounded-md bg-cover bg-center" style={{ backgroundImage: `url("${scene.versions.find(v => v.isCurrent)?.imageUrl}")` }}></div>
                  </div>
                  <div className="mt-4">
                    <textarea 
                        value={sceneNarratives[scene.id] || ''} 
                        onChange={(e) => handleNarrativeChange(scene.id, e.target.value)}
                        onBlur={() => handleNarrativeBlur(scene.id)}
                        className="form-input w-full resize-none rounded-md text-white focus:outline-0 border border-[var(--border-color-light)] bg-[var(--bg-inset)] min-h-24 p-3 text-sm placeholder:text-[var(--text-dim)]" placeholder="Add your narrative text here..."></textarea>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default StorybookExportPage;
