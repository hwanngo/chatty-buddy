import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import useStore from '@store/store';
import {
  selectableLanguages,
  languageCodeToName,
  languageCodeToShort,
} from '@constants/language';

import NewChat from './NewChat';
import NewFolder from './NewFolder';
import ChatHistoryList from './ChatHistoryList';

import AboutMenu from '@components/AboutMenu';
import ImportExportChat from '@components/ImportExportChat';
import SettingsMenu from '@components/SettingsMenu';
import GoogleSync from '@components/GoogleSync';
import Api from './MenuOptions/Api';
import { TotalTokenCostDisplay } from '@components/SettingsMenu/TotalTokenCost';

import Icon from '@components/Icon';
import { Theme } from '@type/theme';

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || undefined;

const Menu = () => {
  const { t, i18n } = useTranslation();
  const hideSideMenu = useStore((state) => state.hideSideMenu);
  const setHideSideMenu = useStore((state) => state.setHideSideMenu);
  const menuWidth = useStore((state) => state.menuWidth);
  const setMenuWidth = useStore((state) => state.setMenuWidth);
  const theme = useStore((state) => state.theme);
  const setTheme = useStore((state) => state.setTheme);
  const countTotalTokens = useStore((state) => state.countTotalTokens);

  const windowWidthRef = useRef<number>(window.innerWidth);
  const isResizing = useRef<boolean>(false);
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleTheme = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.className = next;
  };

  useEffect(() => {
    if (window.innerWidth < 768) setHideSideMenu(true);
    window.addEventListener('resize', () => {
      if (
        windowWidthRef.current !== window.innerWidth &&
        window.innerWidth < 768
      )
        setHideSideMenu(true);
    });
  }, []);

  const handleMouseDown = () => {
    isResizing.current = true;
  };
  const handleMouseMove = (e: MouseEvent) => {
    if (isResizing.current) {
      const newWidth = e.clientX;
      if (newWidth > 100 && newWidth < window.innerWidth * 0.75)
        setMenuWidth(newWidth);
    }
  };
  const handleMouseUp = () => {
    isResizing.current = false;
  };

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  return (
    <>
      <div
        id='menu'
        className={`group/menu bg-[var(--bg-card)] border-r border-[var(--border)] fixed md:inset-y-0 md:flex md:flex-col transition-transform z-[999] top-0 left-0 h-full max-md:!w-[82%] max-md:!max-w-[320px] ${
          hideSideMenu ? 'translate-x-[-100%]' : 'translate-x-[0%]'
        }`}
        style={{ width: `${menuWidth}px` }}
      >
        <div className='flex h-full min-h-0 flex-col'>
          {/* ── Header ─────────────────────────────────── */}
          <div className='flex items-center gap-1.5 px-2.5 py-3 border-b border-[var(--border)]'>
            <NewChat />
            <NewFolder />
            <button
              onClick={toggleTheme}
              title={
                theme === 'dark'
                  ? t('switchToLightMode')
                  : t('switchToDarkMode')
              }
              className='flex items-center justify-center w-[34px] h-[34px] rounded-lg border border-[var(--border-mid)] bg-[var(--bg-hover)] text-[var(--fg-2)] hover:bg-[var(--bg-sand)] hover:text-[var(--fg)] transition-colors duration-150 shrink-0 cursor-pointer'
            >
              {theme === 'dark' ? <Icon name="sun" /> : <Icon name="moon" />}
            </button>
          </div>

          {/* ── Chat list (includes search bar) ────────── */}
          <ChatHistoryList />

          {/* ── Footer — always visible ─────────────────── */}
          <div className='border-t border-[var(--border)] py-1.5 px-2'>
            {countTotalTokens && <TotalTokenCostDisplay />}
            {googleClientId && <GoogleSync clientId={googleClientId} />}
            <AboutMenu />
            <ImportExportChat />
            <Api />
            <SettingsMenu />
            <div className='flex items-center justify-between px-2.5 py-[5px]'>
              <span className='text-[13px] text-[var(--fg-2)]'>
                {t('author')}
              </span>
              <div ref={langRef} className='relative'>
                <button
                  onClick={() => setLangOpen((v) => !v)}
                  className='flex items-center gap-1 h-[24px] px-2 rounded-md border text-[11px] font-medium cursor-pointer transition-colors border-[var(--accent)] bg-[rgba(201,100,66,0.08)] text-[var(--accent)] hover:bg-[rgba(201,100,66,0.15)]'
                >
                  {languageCodeToShort[i18n.language] ?? i18n.language}
                  <svg
                    width='10'
                    height='10'
                    viewBox='0 0 10 10'
                    fill='none'
                    className={`transition-transform ${langOpen ? 'rotate-180' : ''}`}
                  >
                    <path
                      d='M2 3.5L5 6.5L8 3.5'
                      stroke='currentColor'
                      strokeWidth='1.5'
                      strokeLinecap='round'
                      strokeLinejoin='round'
                    />
                  </svg>
                </button>
                {langOpen && (
                  <div className='absolute bottom-full right-0 mb-1.5 min-w-[130px] rounded-[10px] border border-[var(--border-mid)] bg-[var(--bg-card)] shadow-[var(--shadow-float)] overflow-hidden py-1 z-[9999]'>
                    {selectableLanguages.map((lang) => (
                      <button
                        key={lang}
                        onClick={() => {
                          i18n.changeLanguage(lang);
                          setLangOpen(false);
                        }}
                        className={`w-full text-left px-3 py-1.5 text-[12px] transition-colors ${
                          i18n.language === lang
                            ? 'text-[var(--accent)] bg-[rgba(201,100,66,0.08)] font-medium'
                            : 'text-[var(--fg-2)] hover:bg-[var(--bg-hover)]'
                        }`}
                      >
                        {languageCodeToName[lang] ?? lang}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Mobile close button */}
        <div
          id='menu-close'
          className={`${
            hideSideMenu ? 'hidden' : ''
          } md:hidden absolute z-[999] right-0 translate-x-full top-10 bg-[var(--bg-hover)] border border-[var(--border-mid)] rounded-lg p-2 cursor-pointer hover:bg-[var(--bg)] text-[var(--fg-2)]`}
          onClick={() => setHideSideMenu(true)}
        >
          <Icon name="cross2" />
        </div>

        {/* Desktop sidebar toggle */}
        <div
          className={`${
            hideSideMenu ? 'opacity-100' : 'opacity-0'
          } group/menu md:group-hover/menu:opacity-100 max-md:hidden transition-opacity absolute z-[999] right-0 translate-x-full top-14 bg-[var(--bg-hover)] border border-[var(--border-mid)] rounded-md p-1 cursor-pointer hover:bg-[var(--bg)] text-[var(--fg-2)] ${
            hideSideMenu ? '' : 'rotate-90'
          }`}
          onClick={() => setHideSideMenu(!hideSideMenu)}
        >
          {hideSideMenu ? (
            <Icon name="menu" className='h-4 w-4' />
          ) : (
            <Icon name="downArrow" className='h-4 w-4' />
          )}
        </div>

        {/* Resize handle */}
        <div
          className='absolute top-0 right-0 h-full w-2 cursor-ew-resize'
          onMouseDown={handleMouseDown}
        />
      </div>

      {/* Mobile backdrop */}
      <div
        id='menu-backdrop'
        className={`${
          hideSideMenu ? 'hidden' : ''
        } md:hidden fixed top-0 left-0 h-full w-full z-[60] bg-black/30`}
        onClick={() => setHideSideMenu(true)}
      />
    </>
  );
};

export default Menu;
