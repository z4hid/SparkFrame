
import React from 'react';
import { AppContextType, Character } from '../types';

export const AppContext = React.createContext<AppContextType>({
  navigate: () => {},
  characters: [],
  // fix: The addCharacter function should return a Promise to match the type definition.
  addCharacter: (character: Omit<Character, 'id'>): Promise<Character> => {
    return Promise.resolve({
      ...character,
      id: 'default-character-id',
    });
  },
  updateCharacter: () => {},
  deleteCharacter: () => {},
  activeCharacter: null,
  setActiveCharacter: () => {},
  activeScene: null,
  updateActiveScene: () => {},
  storyboard: [],
  addSceneToStoryboard: () => {},
  updateSceneNarrative: () => {},
  updateSceneTransition: () => {},
  startNewStory: () => {},
});
