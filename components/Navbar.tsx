
import React, { useContext, useEffect, useState } from 'react';
import { AppContext } from '../context/AppContext';
import { Page } from '../types';
import SparkFrameIcon from './SparkFrameIcon';

const Navbar: React.FC<{ currentPage: Page }> = ({ currentPage }) => {
  const { navigate } = useContext(AppContext);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [usage, setUsage] = useState<{
    requestsToday: number;
    requestsPerDayLimit: number;
    imagesThisMinute: number;
    imagesPerMinuteLimit: number;
    minuteResetInSeconds: number;
    dailyResetInSeconds: number;
  } | null>(null);

  useEffect(() => {
    let mounted = true;
    const fetchUsage = async () => {
      try {
        const res = await fetch('/api/usage');
        if (!res.ok) return;
        const data = await res.json();
        if (mounted) setUsage(data);
      } catch {}
    };
    fetchUsage();
    const id = setInterval(fetchUsage, 20000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, []);

  const navLinks = [
    { page: Page.GENERATOR, label: 'Scene Generator' },
    { page: Page.BLUEPRINT, label: 'Characters' },
    { page: Page.STORYBOARD, label: 'Storyboard' },
    { page: Page.STORYBOOK_EXPORT, label: 'Storybook Export' },
    { page: Page.COMIC_EXPORT, label: 'Comic Export' },
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
    <header className="relative flex items-center justify-between whitespace-nowrap border-b border-solid border-[var(--border-color)] px-6 md:px-10 py-4 bg-[var(--bg-content)] z-20" role="banner">
      <div className="flex items-center gap-4 text-white">
        <SparkFrameIcon onClick={() => navigate(Page.HOME)} className="h-8 w-8 text-[var(--primary-color)] cursor-pointer" />
        <div className="flex items-baseline gap-3 cursor-pointer" onClick={() => navigate(Page.HOME)}>
            <h1 className="text-white text-xl font-bold leading-tight tracking-[-0.015em]">SparkFrame</h1>
            <p className="hidden md:block text-sm text-[var(--text-dim)]">To Live Is to Create, To Create Is to Be</p>
        </div>
      </div>
      <nav className="hidden lg:flex items-center gap-2" role="navigation" aria-label="Primary">
        {navLinks.map(link => (
          <a
            key={link.page}
            onClick={() => {
              navigate(link.page);
              setIsMenuOpen(false);
            }}
            aria-current={currentPage === link.page ? 'page' : undefined}
            className={`cursor-pointer px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              currentPage === link.page ? 'text-[var(--primary-color)]' : 'text-gray-300 hover:text-white'
            }`}
          >
            {link.label}
          </a>
        ))}
      </nav>
      <div className="flex items-center gap-4">
        {usage && (
          <div title={`Images: ${usage.imagesThisMinute}/${usage.imagesPerMinuteLimit} (resets in ${usage.minuteResetInSeconds}s) • Requests: ${usage.requestsToday}/${usage.requestsPerDayLimit} (resets in ${usage.dailyResetInSeconds}s)`} className="hidden md:flex items-center gap-2 rounded-full h-9 px-3 border border-[var(--border-color)] bg-[var(--bg-content)] text-[var(--text-dim)] text-xs">
            <span className="material-symbols-outlined text-sm">bolt</span>
            <span>
              {usage.imagesThisMinute}/{usage.imagesPerMinuteLimit} img/min
            </span>
            <span className="opacity-40">•</span>
            <span>
              {usage.requestsToday}/{usage.requestsPerDayLimit} req/day
            </span>
          </div>
        )}
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
        <div className="lg:hidden absolute top-full left-0 right-0 bg-[var(--bg-content)] border-b border-[var(--border-color)] shadow-lg" role="navigation" aria-label="Mobile">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 flex flex-col items-center">
                 {navLinks.map(link => <NavLink key={link.page} {...link} />)}
                 <button onClick={() => navigate(Page.BLUEPRINT)} className="sm:hidden mt-2 w-11/12 flex items-center gap-2 min-w-[84px] cursor-pointer justify-center overflow-hidden rounded-full h-10 px-4 bg-[var(--primary-color)] text-[var(--bg-inset)] text-sm font-bold hover:opacity-80">
                    <span className="material-symbols-outlined">add</span>
                    <span className="truncate">New Character</span>
                </button>
            </div>
        </div>
      )}
      {/* Mobile bottom tab bar */}
      <nav
        className="sm:hidden fixed bottom-0 left-0 right-0 border-t border-[var(--border-color)] bg-[var(--bg-content)] z-30"
        role="navigation"
        aria-label="Bottom tabs"
      >
        <ul className="grid grid-cols-5 text-xs">
          {[{
            page: Page.GENERATOR, label: 'Generate', icon: 'auto_awesome'
          },{
            page: Page.BLUEPRINT, label: 'Characters', icon: 'group'
          },{
            page: Page.STORYBOARD, label: 'Storyboard', icon: 'movie'
          },{
            page: Page.STORYBOOK_EXPORT, label: 'Storybook', icon: 'auto_stories'
          },{
            page: Page.COMIC_EXPORT, label: 'Comic', icon: 'view_carousel'
          }].map(item => (
            <li key={item.page}>
              <button
                onClick={() => navigate(item.page)}
                aria-current={currentPage === item.page ? 'page' : undefined}
                className={`w-full flex flex-col items-center justify-center py-2 ${currentPage === item.page ? 'text-[var(--primary-color)]' : 'text-gray-300'}`}
              >
                <span className="material-symbols-outlined" aria-hidden="true">{item.icon}</span>
                <span className="truncate">{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
};

export default Navbar;
