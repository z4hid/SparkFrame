export enum Page {
  HOME,
  GENERATOR,
  BLUEPRINT,
  EDITOR,
  STORYBOARD,
  STORYBOOK_EXPORT,
  COMIC_EXPORT,
  CINEMATIC_PLAYBACK,
}

export interface ReferenceImage {
  id: string;
  name: string;
  base64Image: string;
  mimeType: string;
}

export interface Character {
  id:string;
  name: string;
  description: string;
  profile: string;
  imageUrl: string;
  base64Image: string;
  mimeType: string;
  identityLocked: boolean;
  referenceImages: ReferenceImage[];
}

export interface Edit {
  id: string;
  prompt: string;
  timestamp: string;
}

export interface ImageHistoryEntry {
    imageUrl: string;
    base64Image: string;
    mimeType: string;
}

export interface Scene {
  id: string;
  description: string;
  narrative: string;
  imageUrl: string;
  base64Image: string;
  mimeType: string;
  characters: Character[];
  characterIds: string[];
  editHistory: Edit[];
  imageHistory: ImageHistoryEntry[];
}

export interface SceneVersion {
    id: string;
    name: string;
    timestamp: string;
    imageUrl: string;
    base64Image: string;
    mimeType: string;
    isCurrent: boolean;
    prompt?: string;
}

export type TransitionType = 'Fade' | 'Slide' | 'Dissolve' | 'None';

export interface StoryboardScene {
    id: string;
    sceneNumber: number;
    title: string;
    narrative: string;
    characterIds: string[];
    versions: SceneVersion[];
    transitionToNext?: TransitionType;
}

export interface AppContextType {
  navigate: (page: Page, options?: { sceneToEdit?: Scene; characterToEdit?: Character }) => void;
  characters: Character[];
  // fix: The addCharacter function is async, so it should return a Promise<Character>.
  addCharacter: (character: Omit<Character, 'id'>) => Promise<Character>;
  updateCharacter: (character: Character) => void;
  deleteCharacter: (characterId: string) => void;
  activeCharacter: Character | null;
  setActiveCharacter: React.Dispatch<React.SetStateAction<Character | null>>;
  activeScene: Scene | null;
  updateActiveScene: (scene: Scene | null) => void;
  storyboard: StoryboardScene[];
  addSceneToStoryboard: (scene: Scene) => void;
  updateSceneNarrative: (sceneId: string, narrative: string) => void;
  updateSceneTransition: (sceneId: string, transition: TransitionType) => void;
  startNewStory: () => void;
}
