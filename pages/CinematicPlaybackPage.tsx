import React, { useState, useEffect, useRef, useContext } from 'react';
import { AppContext } from '../context/AppContext';
import { Page } from '../types';
import toast from 'react-hot-toast';
import SparkFrameIcon from '../components/SparkFrameIcon';
import { loadJSZip } from '../utils/libsLoader';

const CinematicPlaybackPage: React.FC = () => {
    const { storyboard, navigate } = useContext(AppContext);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(true);
    const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [animationKey, setAnimationKey] = useState(0);
    const [progress, setProgress] = useState(0);

    const containerRef = useRef<HTMLDivElement>(null);
    const timeoutRef = useRef<number | null>(null);

    useEffect(() => {
        if (storyboard.length === 0) {
            toast.error("No scenes in storyboard to play.");
            navigate(Page.STORYBOARD);
        }
    }, [storyboard, navigate]);

    const handleNext = () => {
        setCurrentIndex(prev => (prev + 1) % storyboard.length);
        setAnimationKey(prev => prev + 1);
    };

    useEffect(() => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setProgress(0); // Reset progress on slide change

        if (isPlaying && storyboard.length > 0) {
            const slideDuration = 5000 / playbackSpeed;
            timeoutRef.current = window.setTimeout(handleNext, slideDuration);

            // Progress bar animation
            const interval = setInterval(() => {
                setProgress(p => {
                    const newProgress = p + 100 / (slideDuration / 100);
                    if (newProgress >= 100) {
                        clearInterval(interval);
                        return 100;
                    }
                    return newProgress;
                });
            }, 100);
            return () => clearInterval(interval);
        }

        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [isPlaying, currentIndex, playbackSpeed, storyboard.length]);

    useEffect(() => {
        const handleFullScreenChange = () => setIsFullScreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handleFullScreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullScreenChange);
    }, []);

    const handlePrev = () => {
        setCurrentIndex(prev => (prev - 1 + storyboard.length) % storyboard.length);
        setAnimationKey(prev => prev + 1);
    };
    const handleTogglePlay = () => setIsPlaying(prev => !prev);
    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        setCurrentIndex(Number(e.target.value));
        setAnimationKey(p => p + 1);
    };
    const handleToggleFullScreen = () => {
        if (!containerRef.current) return;
        if (!document.fullscreenElement) {
            containerRef.current.requestFullscreen().catch(err => {
                toast.error(`Error enabling full-screen: ${err.message}`);
            });
        } else {
            document.exitFullscreen();
        }
    };
    
    const handleExportZip = async () => {
        const id = toast.loading('Preparing your download...');
    
        try {
            const JSZip = await loadJSZip();
            const zip = new JSZip();
            let storyText = `SparkFrame Story\n\nGenerated at: ${new Date().toLocaleString()}\n\n`;
    
            for (let i = 0; i < storyboard.length; i++) {
                const scene = storyboard[i];
                const version = scene.versions.find(v => v.isCurrent);
                if (version) {
                    const fileName = `scene_${String(i + 1).padStart(3, '0')}.png`;
                    zip.file(fileName, version.base64Image, { base64: true });
                    storyText += `--- SCENE ${i + 1} ---\n`;
                    storyText += `Title: ${scene.title}\n`;
                    storyText += `Narrative: ${scene.narrative}\n\n`;
                }
            }
    
            zip.file("story.txt", storyText);
            
            toast.loading('Compressing files...', { id });
            const content = await zip.generateAsync({ type: "blob" });
            
            const link = document.createElement("a");
            link.href = URL.createObjectURL(content);
            link.download = `SparkFrame-Story-${Date.now()}.zip`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);
            toast.success('Download started!', { id });
        } catch (error: any) {
            console.error("Failed to create ZIP:", error);
            toast.error(error.message || "Failed to create ZIP file.", { id });
        }
    };

    if (storyboard.length === 0) return null;

    const currentScene = storyboard[currentIndex];
    const currentVersion = currentScene.versions.find(v => v.isCurrent);
    const prevSceneIndex = (currentIndex - 1 + storyboard.length) % storyboard.length;
    const transition = storyboard[prevSceneIndex]?.transitionToNext || 'Fade';
    const animationClass = `transition-${transition.toLowerCase()}`;

    return (
        <div ref={containerRef} className="flex flex-col min-h-screen bg-[var(--bg-main)] text-white">
            <header className="flex items-center justify-between whitespace-nowrap px-6 py-3 border-b border-[var(--border-color)]">
                <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate(Page.HOME)}>
                    <SparkFrameIcon className="size-7 text-[var(--primary-color)]" />
                    <h1 className="text-xl font-bold">SparkFrame</h1>
                </div>
                <div className="flex items-center gap-4">
                    <button onClick={handleExportZip} className="flex items-center gap-2 rounded-full h-10 px-4 bg-[var(--border-color)] text-white text-sm font-medium hover:bg-[var(--border-color-light)]">
                        <span className="material-symbols-outlined">archive</span>
                        <span>Download Story (ZIP)</span>
                    </button>
                    <button onClick={() => navigate(Page.STORYBOARD)} className="flex items-center justify-center rounded-full h-10 px-4 bg-[var(--primary-color)] text-[var(--bg-inset)] text-sm font-bold tracking-wide hover:bg-opacity-90">
                        Exit Player
                    </button>
                </div>
            </header>

            <main className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 relative overflow-hidden">
                <div key={animationKey} className={`w-full max-w-6xl aspect-video bg-black rounded-lg overflow-hidden shadow-2xl shadow-black/50 relative ${animationClass}`}>
                    <img alt={currentScene.title} className="absolute inset-0 w-full h-full object-contain" src={currentVersion?.imageUrl} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent p-8 flex flex-col justify-end">
                        <h2 className="text-3xl font-bold text-white drop-shadow-lg">{currentScene.title}</h2>
                        <p className="text-white/90 drop-shadow-lg mt-2 max-w-3xl">{currentScene.narrative}</p>
                    </div>
                </div>

                <div className="w-full max-w-5xl mt-6">
                    <div className="w-full h-2 bg-[var(--border-color)] rounded-full mb-4">
                        <div className="h-full bg-[var(--primary-color)] rounded-full" style={{ width: `${progress}%`, transition: 'width 100ms linear' }}></div>
                    </div>
                    <div className="bg-[var(--bg-content)] rounded-xl p-3 md:p-4 border border-[var(--border-color)]">
                        <div className="flex flex-col gap-4">
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2">
                                    <button onClick={handlePrev} disabled={storyboard.length <= 1} className="flex items-center justify-center rounded-md h-10 w-10 md:h-12 md:w-12 bg-[var(--border-color)] text-white hover:bg-[var(--border-color-light)] disabled:opacity-40">
                                        <span className="material-symbols-outlined">skip_previous</span>
                                    </button>
                                    <button onClick={handleTogglePlay} className="flex items-center justify-center rounded-full h-10 md:h-12 px-5 md:px-6 bg-[var(--primary-color)] text-[var(--bg-inset)] font-bold hover:bg-opacity-90">
                                        <span className="material-symbols-outlined mr-1">{isPlaying ? 'pause' : 'play_arrow'}</span>
                                        <span>{isPlaying ? 'Pause' : 'Play'}</span>
                                    </button>
                                    <button onClick={handleNext} disabled={storyboard.length <= 1} className="flex items-center justify-center rounded-md h-10 w-10 md:h-12 md:w-12 bg-[var(--border-color)] text-white hover:bg-[var(--border-color-light)] disabled:opacity-40">
                                        <span className="material-symbols-outlined">skip_next</span>
                                    </button>
                                </div>
                                <div className="flex items-center gap-2">
                                    <label className="hidden md:block text-xs text-[var(--text-dim)]">Speed</label>
                                    <select value={playbackSpeed} onChange={(e) => setPlaybackSpeed(Number(e.target.value))} className="form-select rounded-md bg-[var(--border-color)] border-transparent focus:ring-[var(--primary-color)] focus:border-[var(--primary-color)] text-white text-sm py-1 pl-2 pr-8 h-10 md:h-12">
                                        <option value={0.5}>0.5x</option>
                                        <option value={1.0}>1.0x</option>
                                        <option value={1.5}>1.5x</option>
                                        <option value={2.0}>2.0x</option>
                                    </select>
                                    <button onClick={handleToggleFullScreen} className="flex items-center justify-center rounded-md h-10 w-10 md:h-12 md:w-12 bg-[var(--border-color)] text-white hover:bg-[var(--border-color-light)]">
                                        <span className="material-symbols-outlined">{isFullScreen ? 'fullscreen_exit' : 'fullscreen'}</span>
                                    </button>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                {storyboard.length > 1 && (
                                  <span className="inline-flex items-center rounded-full px-3 py-1 text-xs md:text-sm bg-black/30 border border-[var(--border-color)] text-white">
                                    Scene {currentIndex + 1} of {storyboard.length}
                                  </span>
                                )}
                                <input type="range" min="0" max={storyboard.length - 1} value={currentIndex} onChange={handleSeek} className="w-full h-2 bg-[var(--border-color)] rounded-lg appearance-none cursor-pointer accent-[var(--primary-color)]" />
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default CinematicPlaybackPage;
