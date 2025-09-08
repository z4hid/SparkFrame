import React, { useState, useContext, useEffect } from 'react';
import { AppContext } from '../context/AppContext';
import { Page, Character } from '../types';
import toast from 'react-hot-toast';
import { loadHtml2Canvas, loadJsPDF } from '../utils/libsLoader';
import { generateText } from '../services/geminiService';


const StorybookExportPage: React.FC = () => {
  const { navigate, storyboard, updateSceneNarrative, characters } = useContext(AppContext);
  const [isBulkGenerating, setIsBulkGenerating] = useState<'idle'|'running'>('idle');

  const [title, setTitle] = useState("Anya's Magical Seed");
  const [summary, setSummary] = useState("A young hero named Anya embarks on a quest for treasure, but finds a magical seed that promises a different kind of reward.");
  const [sceneNarratives, setSceneNarratives] = useState<Record<string, string>>({});
  // fix: Corrected the syntax for useState.
  const [isLoading, setIsLoading] = useState<'loading' | 'idle' | 'error'>('idle');
  const [isMetaGenerating, setIsMetaGenerating] = useState(false);

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

  const buildCharacterContext = (characterIds: string[]): string => {
    const list: Character[] = characters.filter(c => characterIds.includes(c.id));
    if (!list.length) return '';
    const profiles = list.map(c => `Character: ${c.name}\nBlueprint: ${c.profile}`).join('\n---\n');
    return `Use these character blueprints to keep identity consistent across narratives:\n${profiles}`;
  };

  const escapeHtml = (s: string) => s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  const normalizeSceneTitle = (num: number, raw: string) => {
    const trimmed = (raw || '').trim();
    const rx = new RegExp(`^\\s*Scene\\s*${num}\\s*:\\s*`, 'i');
    return trimmed.replace(rx, '') || `Scene ${num}`;
  };

  const generateTitleAndSummary = async () => {
    if (storyboard.length === 0) return;
    setIsMetaGenerating(true);
    const compiled = storyboard.map(s => `Scene ${s.sceneNumber} - ${s.title}: ${(sceneNarratives[s.id] || s.narrative || '').replace(/\n+/g,' ')}`).join('\n');
    const prompt = `You are a creative editor. Given the following scene titles and narratives, produce:\n- A short, evocative story title (max 6 words).\n- A single sentence summary (20-40 words).\nReturn STRICT JSON only: {\"title\":\"...\",\"summary\":\"...\"}.\n\n${compiled}`;
    try {
      const id = toast.loading('Generating title & summary...');
      const raw = await generateText(prompt);
      let nextTitle = title;
      let nextSummary = summary;
      try {
        const jsonStart = raw.indexOf('{');
        const jsonEnd = raw.lastIndexOf('}');
        const slice = jsonStart >= 0 && jsonEnd >= 0 ? raw.slice(jsonStart, jsonEnd + 1) : raw;
        const parsed = JSON.parse(slice);
        if (parsed?.title) nextTitle = String(parsed.title).trim();
        if (parsed?.summary) nextSummary = String(parsed.summary).trim();
      } catch {
        const t = /title\s*:\s*\"?([^\n\"]+)/i.exec(raw);
        const s = /summary\s*:\s*\"?([^\n\"]+)/i.exec(raw);
        if (t?.[1]) nextTitle = t[1].trim();
        if (s?.[1]) nextSummary = s[1].trim();
      }
      setTitle(nextTitle);
      setSummary(nextSummary);
      toast.success('Updated title & summary', { id });
    } catch (e: any) {
      toast.error(e?.message || 'Failed to generate title & summary');
    } finally {
      setIsMetaGenerating(false);
    }
  };

  const generateSceneNarrative = async (sceneId: string) => {
    const scene = storyboard.find(s => s.id === sceneId);
    if (!scene) return;
    const current = scene.versions.find(v => v.isCurrent);
    if (!current) return;
    const bp = buildCharacterContext(scene.characterIds);
    const prompt = `You are a concise visual storyteller. Write a 2-3 sentence narrative that matches the image description and tone. Keep names consistent.\n${bp}\nScene title: ${scene.title}\nAim for vivid but tight prose. Avoid repeating previous scenes.`;
    try {
      const id = toast.loading('Generating narrative...');
      const text = (await generateText(prompt)).replace(/\n+/g, ' ').trim();
      toast.success('Narrative generated', { id });
      handleNarrativeChange(scene.id, text);
      updateSceneNarrative(scene.id, text);
    } catch (e: any) {
      toast.error(e.message || 'Failed to generate narrative');
    }
  };

  const generateAllNarratives = async () => {
    if (isBulkGenerating === 'running') return;
    setIsBulkGenerating('running');
    const id = toast.loading('Generating narratives for all scenes...');
    try {
      for (const scene of storyboard) {
        const current = scene.versions.find(v => v.isCurrent);
        if (!current) continue;
        const bp = buildCharacterContext(scene.characterIds);
        const prompt = `You are a concise visual storyteller. Write a 2-3 sentence narrative that matches the image description and tone. Keep names consistent.\n${bp}\nScene title: ${scene.title}\nAim for vivid but tight prose. Avoid repeating previous scenes.`;
        const text = (await generateText(prompt)).replace(/\n+/g, ' ').trim();
        handleNarrativeChange(scene.id, text);
        await updateSceneNarrative(scene.id, text);
      }
      toast.success('All narratives generated', { id });
    } catch (e: any) {
      toast.error(e.message || 'Failed to generate some narratives', { id });
    } finally {
      setIsBulkGenerating('idle');
    }
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
        tempContainer.style.background = '#0b1220';
        tempContainer.style.color = 'white';
        tempContainer.style.fontFamily = '"Spline Sans", "Noto Sans", sans-serif';
        document.body.appendChild(tempContainer);
        
        toast.loading('Generating title page...', { id: exportToastId });
        
        // Title Page (character-aware)
        tempContainer.innerHTML = `
            <div style="width: ${pdfWidth}px; height: ${pdfHeight}px; display: flex; flex-direction: column; justify-content: center; text-align: center; padding: ${margin}px; box-sizing: border-box;">
                <h1 style="font-size: 34px; font-weight: 800; margin-bottom: 14px; letter-spacing: .3px;">${escapeHtml(title)}</h1>
                <p style="font-size: 16px; color: #94a3b8; max-width: ${Math.round(pdfWidth*0.75)}px; margin: 0 auto; line-height: 1.6;">${escapeHtml(summary)}</p>
            </div>
        `;
        // Yield to layout engine to ensure content is measurable
        await new Promise(r => requestAnimationFrame(r));
        await new Promise(r => requestAnimationFrame(r));
        const titleRoot = tempContainer.firstElementChild as HTMLElement | null;
        if (!titleRoot) throw new Error('Failed to build title page');
        const titleCanvas = await html2canvas(titleRoot, { useCORS: true, scale: 2, backgroundColor: '#0b1220' });
        const titleImgData = titleCanvas.toDataURL('image/png');
        pdf.addImage(titleImgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

        // Scene Pages
        for (let i = 0; i < storyboard.length; i++) {
            const scene = storyboard[i];
            toast.loading(`Processing Scene ${i + 1} of ${storyboard.length}...`, { id: exportToastId });
            
            const currentVersion = scene.versions.find(v => v.isCurrent);
            if (!currentVersion) continue;

            pdf.addPage();
            
            const cleanTitle = normalizeSceneTitle(scene.sceneNumber, scene.title);
            const narrative = (sceneNarratives[scene.id] || scene.narrative || '').trim();
            tempContainer.innerHTML = `
                <div style="padding: ${margin}px; width: ${pdfWidth}px; box-sizing: border-box;">
                    <div style="background:#0b1220; color:#93c5fd; border-radius:8px; padding:10px 14px; font-weight:700; font-size:18px; margin-bottom:12px;">Scene ${scene.sceneNumber} — ${escapeHtml(cleanTitle)}</div>
                    <img id="scene-img-${i}" src="${currentVersion.imageUrl}" style="width: 100%; height: auto; border-radius: 8px; margin-bottom: 12px;" />
                    <p style="font-size: 14px; color: #e2e8f0; line-height: 1.7; white-space: pre-wrap;">${escapeHtml(narrative)}</p>
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
            const scale = Math.min(2, Math.max(1, (window.devicePixelRatio || 1)));
            const sceneCanvas = await html2canvas(sceneRoot, { useCORS: true, scale, backgroundColor: '#0b1220' });
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
    <main className="flex-1 px-4 sm:px-6 lg:px-10 py-6 lg:py-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <h2 className="text-white text-4xl font-bold tracking-tight">Export Storybook</h2>
          <p className="text-[var(--text-dim)] mt-2 text-lg">Finalize your narratives and export your project as a beautiful PDF storybook.</p>
          <div className="mt-3 flex gap-3">
            <button onClick={generateAllNarratives} disabled={isBulkGenerating==='running' || storyboard.length===0} className="flex items-center gap-2 rounded-full h-10 px-4 bg-[var(--border-color)] text-white text-sm font-bold hover:bg-[var(--border-color-light)] disabled:opacity-50">
              <span className="material-symbols-outlined">auto_awesome</span>
              <span>{isBulkGenerating==='running' ? 'Generating...' : 'AI: Generate All Narratives'}</span>
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          <div className="md:col-span-1 space-y-6 lg:space-y-8">
            <div className={`space-y-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-content)] p-5 sm:p-6`}>
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
                    <div className="mt-2 flex gap-2">
                      <button onClick={() => generateSceneNarrative(scene.id)} className="flex items-center gap-2 rounded-full h-9 px-3 bg-[var(--border-color)] text-white text-xs font-semibold hover:bg-[var(--border-color-light)]">
                        <span className="material-symbols-outlined text-sm">auto_awesome</span>
                        <span>AI: Suggest Narrative</span>
                      </button>
                    </div>
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
