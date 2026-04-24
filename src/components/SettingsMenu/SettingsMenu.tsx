import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import ReactDOM from 'react-dom';
import useStore from '@store/store';

import SettingIcon from '@icon/SettingIcon';
import SunIcon from '@icon/SunIcon';
import MoonIcon from '@icon/MoonIcon';
import CrossIcon2 from '@icon/CrossIcon2';
import LanguageSelector from '@components/LanguageSelector';
import AutoTitleToggle from './AutoTitleToggle';
import AdvancedModeToggle from './AdvencedModeToggle';
import InlineLatexToggle from './InlineLatexToggle';
import PromptLibraryMenu from '@components/PromptLibraryMenu';
import ChatConfigMenu from '@components/ChatConfigMenu';
import EnterToSubmitToggle from './EnterToSubmitToggle';
import AutoScrollToggle from './AutoScrollToggle';
import TotalTokenCost, { TotalTokenCostToggle } from './TotalTokenCost';
import ClearConversation from '@components/Menu/MenuOptions/ClearConversation';
import DisplayChatSizeToggle from './DisplayChatSizeToggle';
import MigrationButton from './MigrationButton';
import CustomModelsManager from './CustomModelsManager';

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <p className='px-1 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-[#87867f] dark:text-[#6b6a65]'>
    {children}
  </p>
);

const Group = ({
  children,
  overflow = false,
}: {
  children: React.ReactNode;
  overflow?: boolean;
}) => (
  <div
    className={`rounded-xl bg-[#f5f3ec] dark:bg-[#242422] border border-[#e8e6dc] dark:border-[#2e2e2b] divide-y divide-[#e8e6dc] dark:divide-[#2e2e2b] ${overflow ? 'overflow-visible' : 'overflow-hidden'}`}
  >
    {children}
  </div>
);

const Row = ({ children }: { children: React.ReactNode }) => (
  <div className='px-4 py-3'>{children}</div>
);

const ThemeRow = () => {
  const { t } = useTranslation();
  const theme = useStore((state) => state.theme);
  const setTheme = useStore((state) => state.setTheme);

  useEffect(() => {
    document.documentElement.className = theme;
  }, [theme]);

  if (!theme) return null;

  return (
    <div className='flex items-center justify-between px-4 py-3'>
      <div className='flex items-center gap-2 text-sm font-medium text-[#141413] dark:text-[#faf9f5]'>
        {theme === 'dark' ? <MoonIcon /> : <SunIcon />}
        <span>{t(theme === 'dark' ? 'darkMode' : 'lightMode')}</span>
      </div>
      <button
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        className='text-xs px-3 py-1 rounded-lg bg-[#e8e6dc] dark:bg-[#3d3d3a] text-[#5e5d59] dark:text-[#b0aea5] hover:bg-[#dbd9cf] dark:hover:bg-[#4a4a46] transition-colors cursor-pointer'
        aria-label='toggle theme'
      >
        {t(theme === 'dark' ? 'lightMode' : 'darkMode')}
      </button>
    </div>
  );
};

const SettingsMenu = () => {
  const { t } = useTranslation(['main', 'migration', 'model']);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const countTotalTokens = useStore((state) => state.countTotalTokens);
  const modalRoot = document.getElementById('modal-root');

  const modal =
    isModalOpen && modalRoot
      ? ReactDOM.createPortal(
          <div className='fixed inset-0 z-[999] flex items-center justify-center p-4'>
            <div
              className='absolute inset-0 bg-[#141413]/60 backdrop-blur-sm'
              onClick={() => setIsModalOpen(false)}
            />
            <div className='relative z-10 w-full max-w-md max-h-[88vh] flex flex-col bg-[#faf9f5] dark:bg-[#1a1917] rounded-2xl border border-[#e8e6dc] dark:border-[#30302e] shadow-2xl'>
              {/* Header */}
              <div className='flex items-center justify-between px-5 py-4 border-b border-[#e8e6dc] dark:border-[#30302e] flex-shrink-0'>
                <h2 className='text-base font-semibold font-serif text-[#141413] dark:text-[#faf9f5]'>
                  {t('setting')}
                </h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className='p-1.5 rounded-lg text-[#87867f] hover:bg-[#e8e6dc] hover:text-[#141413] dark:hover:bg-[#30302e] dark:hover:text-[#faf9f5] transition-colors cursor-pointer'
                  aria-label='close settings'
                >
                  <CrossIcon2 />
                </button>
              </div>

              {/* Scrollable content */}
              <div className='flex-1 overflow-y-auto px-4 pb-4'>
                {/* Appearance */}
                <SectionLabel>
                  {t('appearance', { defaultValue: 'Appearance' })}
                </SectionLabel>
                <Group overflow>
                  <Row>
                    <LanguageSelector />
                  </Row>
                  <ThemeRow />
                </Group>

                {/* Chat Behavior */}
                <SectionLabel>
                  {t('chatBehavior', { defaultValue: 'Chat Behavior' })}
                </SectionLabel>
                <Group>
                  <Row>
                    <div className='flex flex-col gap-3'>
                      <AutoTitleToggle reversed />
                    </div>
                  </Row>
                  <Row>
                    <EnterToSubmitToggle
                      reversed
                      description={t('enterToSubmitDesc', {
                        defaultValue: 'Press ↵ to send, Shift+↵ for new line',
                      })}
                    />
                  </Row>
                  <Row>
                    <AutoScrollToggle
                      reversed
                      description={t('autoScrollDesc', {
                        defaultValue: 'Follow the response as it streams',
                      })}
                    />
                  </Row>
                  <Row>
                    <InlineLatexToggle
                      reversed
                      description={t('inlineLatexDesc', {
                        defaultValue: 'Render LaTeX math expressions inline',
                      })}
                    />
                  </Row>
                  <Row>
                    <AdvancedModeToggle
                      reversed
                      description={t('advancedModeDesc', {
                        defaultValue: 'Per-message role and config controls',
                      })}
                    />
                  </Row>
                </Group>

                {/* Display */}
                <SectionLabel>
                  {t('display', { defaultValue: 'Display' })}
                </SectionLabel>
                <Group>
                  <Row>
                    <TotalTokenCostToggle
                      reversed
                      description={t('countTotalTokensDesc', {
                        defaultValue: 'Track and display token usage costs',
                      })}
                    />
                  </Row>
                  <Row>
                    <DisplayChatSizeToggle
                      reversed
                      description={t('displayChatSizeDesc', {
                        defaultValue: 'Show message count in the chat list',
                      })}
                    />
                  </Row>
                </Group>

                {/* Token cost breakdown — only when counting is on */}
                {countTotalTokens && (
                  <>
                    <SectionLabel>
                      {t('usageCosts', { defaultValue: 'Usage Costs' })}
                    </SectionLabel>
                    <Group>
                      <TotalTokenCost />
                    </Group>
                  </>
                )}

                {/* Libraries & Config */}
                <SectionLabel>
                  {t('librariesConfig', { defaultValue: 'Libraries & Config' })}
                </SectionLabel>
                <div className='rounded-xl bg-[#f5f3ec] dark:bg-[#242422] border border-[#e8e6dc] dark:border-[#2e2e2b] divide-y divide-[#e8e6dc] dark:divide-[#2e2e2b] overflow-hidden [&_.btn]:w-full [&_.btn]:justify-start [&_.btn]:rounded-none [&_.btn]:border-none [&_.btn]:bg-transparent [&_.btn]:shadow-none [&_.btn:hover]:bg-[#ede9de] [&_.btn:hover]:dark:bg-[#2a2a27] [&_.btn]:text-[#141413] [&_.btn]:dark:text-[#faf9f5] [&_.btn]:px-4 [&_.btn]:py-3 [&_.btn]:text-sm [&_.btn]:font-medium'>
                  <PromptLibraryMenu />
                  <ChatConfigMenu />
                  <CustomModelsManager />
                </div>

                {/* Data */}
                <SectionLabel>
                  {t('data', { defaultValue: 'Data' })}
                </SectionLabel>
                <div className='rounded-xl bg-[#f5f3ec] dark:bg-[#242422] border border-[#e8e6dc] dark:border-[#2e2e2b] overflow-hidden [&_.btn]:w-full [&_.btn]:justify-start [&_.btn]:rounded-none [&_.btn]:border-none [&_.btn]:bg-transparent [&_.btn]:shadow-none [&_.btn:hover]:bg-[#ede9de] [&_.btn:hover]:dark:bg-[#2a2a27] [&_.btn]:text-[#141413] [&_.btn]:dark:text-[#faf9f5] [&_.btn]:px-4 [&_.btn]:py-3 [&_.btn]:text-sm [&_.btn]:font-medium'>
                  <ClearConversation />
                </div>

                {/* Developer / Danger */}
                <SectionLabel>
                  {t('developer', { defaultValue: 'Developer' })}
                </SectionLabel>
                <div className='rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50/60 dark:bg-red-950/20 overflow-hidden'>
                  <div className='px-4 py-3 flex flex-col items-start gap-1'>
                    <MigrationButton />
                  </div>
                </div>

                <div className='h-2' />
              </div>
            </div>
          </div>,
          modalRoot
        )
      : null;

  return (
    <>
      <button
        className='flex items-center gap-2 w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-[#f0eee6] dark:hover:bg-[#3a3a37] text-[#5e5d59] dark:text-[#b0aea5] text-[13px] transition-colors cursor-pointer'
        onClick={() => setIsModalOpen(true)}
      >
        <SettingIcon className='w-4 h-4' /> {t('setting') as string}
      </button>
      {modal}
    </>
  );
};

export default SettingsMenu;
