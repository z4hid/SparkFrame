
import React, { useContext, useState } from 'react';
import { AppContext } from '../context/AppContext';
import { Page } from '../types';
import SparkFrameIcon from './SparkFrameIcon';

const Navbar: React.FC<{ currentPage: Page }> = ({ currentPage }) => {
  const { navigate } = useContext(AppContext);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navLinks = [
    { page: Page.GENERATOR, label: 'Scene Generator' },
    { page: Page.BLUEPRINT, label: 'Characters' },
    { page: Page.STORYBOARD, label: 'Storyboard' },
    { page: Page.COMIC_EXPORT, label: 'Comic Export' },
    { page: Page.STORYBOOK_EXPORT, label: 'Storybook Export' },
  ];

  const NavLink: React.FC<{ page: Page, label: string }> = ({ page, label }) => {
    const isActive = currentPage === page;
    return (
        <a 
            onClick={() => {
                navigate(page);
                setIsMenuOpen(false);
            }} 
            className={`cursor-pointer px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive 
                ? 'text-[var(--primary-color)]' 
                : 'text-gray-300 hover:text-white'
            }`}
        >
            {label}
        </a>
    );
  }

  return (
    <header className="relative flex items-center justify-between whitespace-nowrap border-b border-solid border-[var(--border-color)] px-6 md:px-10 py-4 bg-[var(--bg-content)] z-20">
      <div className="flex items-center gap-4 text-white">
        <SparkFrameIcon onClick={() => navigate(Page.HOME)} className="h-8 w-8 text-[var(--primary-color)] cursor-pointer" />
        <div className="flex items-baseline gap-3 cursor-pointer" onClick={() => navigate(Page.HOME)}>
            <h1 className="text-white text-xl font-bold leading-tight tracking-[-0.015em]">SparkFrame</h1>
            <p className="hidden md:block text-sm text-[var(--text-dim)]">To Live Is to Create, To Create Is to Be</p>
        </div>
      </div>
      <nav className="hidden lg:flex items-center gap-2">
        {navLinks.map(link => <NavLink key={link.page} {...link} />)}
      </nav>
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(Page.BLUEPRINT)} className="hidden sm:flex items-center gap-2 min-w-[84px] cursor-pointer justify-center overflow-hidden rounded-full h-10 px-4 bg-[var(--primary-color)] text-[var(--bg-inset)] text-sm font-bold hover:opacity-80">
          <span className="material-symbols-outlined">add</span>
          <span className="truncate">New Character</span>
        </button>
        <div className="lg:hidden">
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-[var(--border-color)] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white">
                <span className="material-symbols-outlined">{isMenuOpen ? 'close' : 'menu'}</span>
            </button>
        </div>
      </div>
      {isMenuOpen && (
        <div className="lg:hidden absolute top-full left-0 right-0 bg-[var(--bg-content)] border-b border-[var(--border-color)] shadow-lg">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 flex flex-col items-center">
                 {navLinks.map(link => <NavLink key={link.page} {...link} />)}
                 <button onClick={() => navigate(Page.BLUEPRINT)} className="sm:hidden mt-2 w-11/12 flex items-center gap-2 min-w-[84px] cursor-pointer justify-center overflow-hidden rounded-full h-10 px-4 bg-[var(--primary-color)] text-[var(--bg-inset)] text-sm font-bold hover:opacity-80">
                    <span className="material-symbols-outlined">add</span>
                    <span className="truncate">New Character</span>
                </button>
            </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
