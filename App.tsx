
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { AppContext } from './context/AppContext';
import { Page, Character, Scene, StoryboardScene, SceneVersion, TransitionType } from './types';
import GeneratorPage from './pages/GeneratorPage';
import BlueprintPage from './pages/BlueprintPage';
import EditorPage from './pages/EditorPage';
import StoryboardPage from './pages/StoryboardPage';
import StorybookExportPage from './pages/StorybookExportPage';
import ComicExportPage from './pages/ComicExportPage';
import HomePage from './pages/HomePage';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import { Toaster, toast } from 'react-hot-toast';
import CinematicPlaybackPage from './pages/CinematicPlaybackPage';
import { dbService } from './services/dbService';

const App: React.FC = () => {
  const [isReady, setIsReady] = useState(false);
  const [currentPage, setCurrentPage] = useState<Page>(Page.HOME);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [activeScene, setActiveScene] = useState<Scene | null>(null);
  const [activeCharacter, setActiveCharacter] = useState<Character | null>(null);
  const [storyboard, setStoryboard] = useState<StoryboardScene[]>([]);

  useEffect(() => {
    const loadData = async () => {
      const [chars, board, actScene, actChar] = await Promise.all([
        dbService.getAllCharacters(),
        dbService.getAllStoryboardScenes(),
        dbService.getActiveScene(),
        dbService.getActiveCharacter()
      ]);
      setCharacters(chars);
      setStoryboard(board.sort((a, b) => a.sceneNumber - b.sceneNumber));
      setActiveScene(actScene || null);
      setActiveCharacter(actChar || null);
      setIsReady(true);
    };
    loadData();
  }, []);

  const navigate = useCallback((page: Page, options?: { sceneToEdit?: Scene; characterToEdit?: Character }) => {
    if (page === Page.EDITOR && options?.sceneToEdit) {
      setActiveScene(options.sceneToEdit);
      dbService.setActiveScene(options.sceneToEdit);
    }
    if (page === Page.BLUEPRINT && options?.characterToEdit) {
      setActiveCharacter(options.characterToEdit);
      dbService.setActiveCharacter(options.characterToEdit);
    } else if (page === Page.BLUEPRINT) {
      setActiveCharacter(null); // Ensure we're in create mode
      dbService.setActiveCharacter(null);
    }
    setCurrentPage(page);
  }, []);

  const addCharacter = useCallback(async (character: Omit<Character, 'id'>) => {
    const newCharacter = { ...character, id: `char-${Date.now()}` };
    await dbService.putCharacter(newCharacter);
    setCharacters(prev => [...prev, newCharacter]);
    return newCharacter;
  }, []);
  
  const updateCharacter = useCallback(async (updatedCharacter: Character) => {
    await dbService.putCharacter(updatedCharacter);
    setCharacters(prev => prev.map(char => char.id === updatedCharacter.id ? updatedCharacter : char));
    if (activeScene && activeScene.characters.some(c => c.id === updatedCharacter.id)) {
        const newActiveScene = {
            ...activeScene,
            characters: activeScene.characters.map(c => c.id === updatedCharacter.id ? updatedCharacter : c)
        };
        setActiveScene(newActiveScene);
        await dbService.setActiveScene(newActiveScene);
    }
  }, [activeScene]);

  const deleteCharacter = useCallback(async (characterId: string) => {
    const characterToDelete = characters.find(c => c.id === characterId);
    if (!characterToDelete) return;

    if (!window.confirm(`Are you sure you want to delete the character "${characterToDelete.name}"? This action cannot be undone.`)) {
        return;
    }

    await dbService.deleteCharacter(characterId);

    setCharacters(prev => prev.filter(c => c.id !== characterId));

    if (activeCharacter?.id === characterId) {
        setActiveCharacter(null);
        await dbService.setActiveCharacter(null);
    }

    if (activeScene?.characterIds.includes(characterId)) {
        const newActiveScene: Scene = {
            ...activeScene,
            characters: activeScene.characters.filter(c => c.id !== characterId),
            characterIds: activeScene.characterIds.filter(id => id !== characterId),
        };
        setActiveScene(newActiveScene);
        await dbService.setActiveScene(newActiveScene);
    }

    const updatedStoryboard = storyboard.map(scene => {
        if (scene.characterIds.includes(characterId)) {
            return {
                ...scene,
                characterIds: scene.characterIds.filter(id => id !== characterId)
            };
        }
        return scene;
    });

    for (const scene of updatedStoryboard) {
        // Only write to db if it changed
        if (storyboard.find(s => s.id === scene.id)?.characterIds.length !== scene.characterIds.length) {
            await dbService.putStoryboardScene(scene);
        }
    }
    setStoryboard(updatedStoryboard);
    
    toast.success(`Character "${characterToDelete.name}" deleted.`);
  }, [characters, activeCharacter, activeScene, storyboard]);

  const updateActiveScene = useCallback(async (scene: Scene | null) => {
    setActiveScene(scene);
    await dbService.setActiveScene(scene);

    if (scene) {
      const sceneInStoryboard = storyboard.find(sbScene => sbScene.id === scene.id);
      if (sceneInStoryboard) {
        const lastEdit = scene.editHistory[scene.editHistory.length - 1];
        const newVersion: SceneVersion = {
          id: `v${sceneInStoryboard.versions.length + 1}`,
          name: `Version ${sceneInStoryboard.versions.length + 1}`,
          timestamp: lastEdit.timestamp,
          imageUrl: scene.imageUrl,
          base64Image: scene.base64Image,
          mimeType: scene.mimeType,
          prompt: lastEdit.prompt,
          isCurrent: true
        };
        
        const updatedSceneForStoryboard = {
          ...sceneInStoryboard,
          narrative: scene.narrative,
          versions: [...sceneInStoryboard.versions.map(v => ({...v, isCurrent: false})), newVersion],
        };

        setStoryboard(prev => prev.map(s => s.id === scene.id ? updatedSceneForStoryboard : s));
        await dbService.putStoryboardScene(updatedSceneForStoryboard);
      }
    }
  }, [storyboard]);

  const addSceneToStoryboard = useCallback(async (scene: Scene) => {
    const existingSceneIndex = storyboard.findIndex(sbScene => sbScene.id === scene.id);

    if (existingSceneIndex !== -1) return;

    const newStoryboardScene: StoryboardScene = {
        id: scene.id,
        sceneNumber: storyboard.length + 1,
        title: `Scene ${storyboard.length + 1}: ${scene.description.substring(0,20)}...`,
        narrative: scene.description,
        characterIds: scene.characterIds,
        versions: [{
            id: `v1`,
            name: 'Version 1',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            imageUrl: scene.imageUrl,
            base64Image: scene.base64Image,
            mimeType: scene.mimeType,
            prompt: scene.editHistory[0]?.prompt || 'Original Image',
            isCurrent: true
        }],
        transitionToNext: 'Fade',
    };
    setStoryboard(prev => [...prev, newStoryboardScene]);
    await dbService.putStoryboardScene(newStoryboardScene);
  }, [storyboard]);

  const updateSceneNarrative = useCallback(async (sceneId: string, narrative: string) => {
    const sceneToUpdate = storyboard.find(s => s.id === sceneId);
    if(sceneToUpdate) {
        const updatedScene = { ...sceneToUpdate, narrative };
        await dbService.putStoryboardScene(updatedScene);
        setStoryboard(prev => prev.map(scene => scene.id === sceneId ? updatedScene : scene));
    }
  }, [storyboard]);

  const updateSceneTransition = useCallback(async (sceneId: string, transition: TransitionType) => {
    const sceneToUpdate = storyboard.find(s => s.id === sceneId);
    if(sceneToUpdate) {
        const updatedScene = { ...sceneToUpdate, transitionToNext: transition };
        await dbService.putStoryboardScene(updatedScene);
        setStoryboard(prev => prev.map(scene => scene.id === sceneId ? updatedScene : scene));
    }
  }, [storyboard]);
  
  const startNewStory = useCallback(async () => {
      if (window.confirm('Are you sure you want to start a new story? This will clear your current storyboard.')) {
          await dbService.clearStoryboard();
          await dbService.setActiveScene(null);
          setStoryboard([]);
          setActiveScene(null);
          navigate(Page.GENERATOR);
      }
  }, [navigate]);

  const contextValue = useMemo(() => ({
    navigate,
    characters,
    addCharacter,
    updateCharacter,
    deleteCharacter,
    activeCharacter,
    setActiveCharacter: (char: Character | null) => {
        setActiveCharacter(char);
        dbService.setActiveCharacter(char);
    },
    activeScene,
    updateActiveScene,
    storyboard,
    addSceneToStoryboard,
    updateSceneNarrative,
    updateSceneTransition,
    startNewStory,
  }), [navigate, characters, addCharacter, updateCharacter, deleteCharacter, activeCharacter, activeScene, updateActiveScene, storyboard, addSceneToStoryboard, updateSceneNarrative, updateSceneTransition, startNewStory]);

  const renderPage = () => {
    switch (currentPage) {
      case Page.HOME:
        return <HomePage />;
      case Page.GENERATOR:
        return <GeneratorPage />;
      case Page.BLUEPRINT:
        return <BlueprintPage />;
      case Page.EDITOR:
        return <EditorPage />;
      case Page.STORYBOARD:
        return <StoryboardPage />;
      case Page.STORYBOOK_EXPORT:
        return <StorybookExportPage />;
      case Page.COMIC_EXPORT:
        return <ComicExportPage />;
      case Page.CINEMATIC_PLAYBACK:
        return <CinematicPlaybackPage />;
      default:
        return <HomePage />;
    }
  };
  
  if (!isReady) {
    return <div className="bg-gray-900 text-white flex items-center justify-center h-screen">Loading SparkFrame...</div>;
  }

  return (
    <AppContext.Provider value={contextValue}>
       <Toaster
        position="bottom-center"
        toastOptions={{
          className: '',
          style: {
            margin: '40px',
            background: '#111714',
            color: '#fff',
            padding: '16px',
            borderRadius: '12px',
            border: '1px solid #29382f',
          },
        }}
      />
      {currentPage === Page.HOME || currentPage === Page.CINEMATIC_PLAYBACK ? (
        renderPage()
      ) : (
        <div className="relative flex size-full min-h-screen flex-col text-white bg-[var(--bg-content)]">
          <Navbar currentPage={currentPage} />
          <main className="flex-grow flex flex-col">
              {renderPage()}
          </main>
          <Footer/>
        </div>
      )}
    </AppContext.Provider>
  );
};

export default App;
