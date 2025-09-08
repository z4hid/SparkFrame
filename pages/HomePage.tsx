
import React, { useContext } from 'react';
import { AppContext } from '../context/AppContext';
import { Page } from '../types';
import SparkFrameIcon from '../components/SparkFrameIcon';
import Footer from '../components/Footer';

const HomePage: React.FC = () => {
    const { navigate, characters, storyboard, startNewStory } = useContext(AppContext);
    
    const hasContent = characters.length > 0 || storyboard.length > 0;

    const OnboardingView = () => (
         <div className="text-center">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tighter leading-tight mb-4">
                To Live Is to Create, To Create Is to Be
            </h1>
            <p className="max-w-3xl mx-auto text-lg sm:text-xl text-[var(--text-dim)] mb-12">
                SparkFrame transforms your stories into visually consistent narratives. Create a character and bring your world to life.
            </p>
            <button onClick={() => navigate(Page.BLUEPRINT)} className="flex items-center justify-center gap-3 rounded-full h-14 px-8 bg-[var(--primary-color)] text-[var(--bg-inset)] text-lg font-bold hover:opacity-90 mx-auto">
                <span className="material-symbols-outlined">add</span>
                <span>Create Your First Character</span>
            </button>
        </div>
    );

    const DashboardView = () => (
        <div className="max-w-7xl mx-auto w-full">
            <div className="text-center mb-12">
                <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">Welcome Back to SparkFrame</h1>
                <p className="mt-3 text-lg sm:text-xl text-[var(--text-dim)]">Ready to continue your story?</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                <div onClick={() => navigate(Page.GENERATOR)} className="bg-[var(--bg-content)] p-8 rounded-2xl border border-[var(--border-color)] hover:border-[var(--primary-color)] cursor-pointer flex flex-col items-center text-center">
                    <span className="material-symbols-outlined text-5xl text-[var(--primary-color)] mb-4">auto_awesome</span>
                    <h2 className="text-2xl font-bold text-white">Scene Generator</h2>
                    <p className="text-[var(--text-dim)] mt-1">Continue your story or create a new scene.</p>
                </div>
                 <div onClick={() => navigate(Page.BLUEPRINT)} className="bg-[var(--bg-content)] p-8 rounded-2xl border border-[var(--border-color)] hover:border-[var(--primary-color)] cursor-pointer flex flex-col items-center text-center">
                    <span className="material-symbols-outlined text-5xl text-[var(--primary-color)] mb-4">group_add</span>
                    <h2 className="text-2xl font-bold text-white">New Character</h2>
                    <p className="text-[var(--text-dim)] mt-1">Bring a new hero or villain to life.</p>
                </div>
            </div>

            {characters.length > 0 && (
                <section className="mb-12">
                    <h2 className="text-3xl font-bold tracking-tight mb-6">Your Characters</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                        {characters.map(char => (
                             <div key={char.id} onClick={() => navigate(Page.BLUEPRINT, { characterToEdit: char })} className="group cursor-pointer space-y-3">
                                <div className="aspect-square w-full bg-cover bg-center rounded-xl border-2 border-[var(--border-color)] group-hover:border-[var(--primary-color)]" style={{backgroundImage: `url('${char.imageUrl}')`}}></div>
                                <div>
                                    <h3 className="font-bold text-lg text-white group-hover:text-[var(--primary-color)]">{char.name}</h3>
                                    <p className="text-sm text-[var(--text-dim)] truncate">{char.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {storyboard.length > 0 && (
                <section>
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-3xl font-bold tracking-tight">Current Storyboard</h2>
                        <div className="flex gap-4">
                            <button onClick={startNewStory} className="flex items-center gap-2 rounded-full h-11 px-5 bg-[var(--border-color)] text-white text-sm font-bold hover:bg-red-600/50">
                                <span className="material-symbols-outlined">delete_sweep</span>
                                <span>Start New Story</span>
                            </button>
                            <button onClick={() => navigate(Page.STORYBOARD)} className="flex items-center gap-2 rounded-full h-11 px-5 bg-[var(--primary-color)] text-[var(--bg-inset)] text-sm font-bold hover:opacity-90">
                                <span>View Full Storyboard</span>
                                <span className="material-symbols-outlined">arrow_forward</span>
                            </button>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {storyboard.slice(0, 4).map(scene => {
                            const currentVersion = scene.versions.find(v => v.isCurrent);
                            return currentVersion ? (
                                <div key={scene.id} className="relative aspect-video rounded-lg overflow-hidden border border-[var(--border-color)]">
                                     <img src={currentVersion.imageUrl} alt={scene.title} className="w-full h-full object-cover" />
                                     <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent p-3 flex flex-col justify-end">
                                        <p className="font-bold text-white text-sm truncate">{scene.title}</p>
                                     </div>
                                </div>
                            ) : null;
                        })}
                    </div>
                </section>
            )}
        </div>
    );


    return (
        <div className="relative flex size-full min-h-screen flex-col overflow-x-hidden bg-[var(--bg-main)] text-white">
            <header className="sticky top-0 z-50 bg-[var(--bg-main)]/80 backdrop-blur-sm border-b border-[var(--border-color)]" role="banner">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex h-20 items-center justify-between">
                        <div className="flex items-center gap-4">
                            <SparkFrameIcon className="h-10 w-10 text-[var(--primary-color)]" />
                            <h1 className="text-2xl font-bold leading-tight tracking-tighter">SparkFrame</h1>
                        </div>
                        <nav className="hidden md:flex items-center gap-8 text-sm font-medium" role="navigation" aria-label="Primary">
                            <a onClick={() => navigate(Page.GENERATOR)} className="text-gray-300 hover:text-[var(--primary-color)] transition-colors cursor-pointer">Scene Generator</a>
                            <a onClick={() => navigate(Page.BLUEPRINT)} className="text-gray-300 hover:text-[var(--primary-color)] transition-colors cursor-pointer">Character Blueprints</a>
                            <a onClick={() => navigate(Page.STORYBOARD)} className="text-gray-300 hover:text-[var(--primary-color)] transition-colors cursor-pointer">Storyboard</a>
                        </nav>
                        <button onClick={() => navigate(Page.GENERATOR)} className="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-full h-10 px-6 bg-[var(--primary-color)] text-[var(--bg-inset)] text-sm font-bold tracking-wide hover:opacity-90 transition-all">
                            Start Creating
                        </button>
                    </div>
                </div>
            </header>
            <main className="flex-grow grid-bg">
                <section className="relative py-16 sm:py-24 flex items-center min-h-[calc(100vh-20rem)]">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[var(--primary-color)]/10 rounded-full blur-3xl -z-10"></div>
                    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                        {hasContent ? <DashboardView /> : <OnboardingView />}
                    </div>
                </section>
            </main>
            <Footer />
        </div>
    );
};

export default HomePage;