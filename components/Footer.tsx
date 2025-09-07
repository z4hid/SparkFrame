import React, { useContext } from 'react';
import { AppContext } from '../context/AppContext';
import { Page } from '../types';
import SparkFrameIcon from './SparkFrameIcon';

const Footer: React.FC = () => {
    const { navigate } = useContext(AppContext);

    const FooterLink: React.FC<{ page: Page, children: React.ReactNode}> = ({ page, children }) => (
        <li>
            <a onClick={() => navigate(page)} className="text-[var(--text-dim)] hover:text-[var(--primary-color)] cursor-pointer transition-colors duration-200">
                {children}
            </a>
        </li>
    );

    return (
        <footer className="bg-[var(--bg-main)] border-t border-[var(--border-color)]">
            <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                    <div className="col-span-2 md:col-span-1 space-y-4">
                        <div className="flex items-center gap-3">
                            <SparkFrameIcon className="h-8 w-8 text-[var(--primary-color)]"/>
                            <span className="text-xl font-bold text-white">SparkFrame</span>
                        </div>
                        <p className="text-[var(--text-dim)] text-sm">A breakthrough AI-powered visual storytelling platform to bring your narratives to life with character consistency.</p>
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-white tracking-wider uppercase">Core Features</h3>
                        <ul className="mt-4 space-y-3">
                            <FooterLink page={Page.GENERATOR}>Scene Generator</FooterLink>
                            <FooterLink page={Page.BLUEPRINT}>Characters</FooterLink>
                            <FooterLink page={Page.STORYBOARD}>Storyboard</FooterLink>
                            <FooterLink page={Page.EDITOR}>Image Editor</FooterLink>
                        </ul>
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-white tracking-wider uppercase">Export Tools</h3>
                        <ul className="mt-4 space-y-3">
                            <FooterLink page={Page.COMIC_EXPORT}>Comic Book</FooterLink>
                            <FooterLink page={Page.STORYBOOK_EXPORT}>Storybook (PDF)</FooterLink>
                        </ul>
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-white tracking-wider uppercase">Resources</h3>
                        <ul className="mt-4 space-y-3">
                            <li><a href="#" className="text-[var(--text-dim)] hover:text-[var(--primary-color)]">Tutorials</a></li>
                            <li><a href="#" className="text-[var(--text-dim)] hover:text-[var(--primary-color)]">FAQs</a></li>
                            <li><a href="#" className="text-[var(--text-dim)] hover:text-[var(--primary-color)]">Contact</a></li>
                        </ul>
                    </div>
                </div>
                <div className="mt-8 border-t border-[var(--border-color)] pt-8 text-center">
                     <p className="text-xs text-[var(--text-dim)]">"To Live Is to Create, To Create Is to Be" - © 2025 <a href="https://github.com/z4hid" target="_blank" rel="noopener noreferrer" className="text-white hover:text-[var(--primary-color)]">Zahid Hasan</a></p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;