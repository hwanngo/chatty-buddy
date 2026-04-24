import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import ReactDOM from 'react-dom';
import useStore from '@store/store';

import Icon from '@components/Icon';
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
  <p className='px-1 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--fg-3)]'>
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
    className={`rounded-xl bg-[var(--bg-card)] border border-[var(--border-mid)] divide-y divide-[var(--border-mid)] ${overflow ? 'overflow-visible' : 'overflow-hidden'}`}
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
      <div className='flex items-center gap-2 text-sm font-medium text-[var(--fg)]'>
        {theme === 'dark' ? <Icon name="moon" /> : <Icon name="sun" />}
        <span>{t(theme === 'dark' ? 'darkMode' : 'lightMode')}</span>
      </div>
      <button
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        className='text-xs px-3 py-1 rounded-lg bg-[var(--border-mid)] text-[var(--fg-2)] hover:bg-[var(--ring)] transition-colors cursor-pointer'
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
              className='absolute inset-0 bg-black/60 backdrop-blur-sm'
              onClick={() => setIsModalOpen(false)}
            />
            <div className='relative z-10 w-full max-w-xl max-h-[88vh] flex flex-col bg-[var(--bg-card)] rounded-[var(--radius-card)] border border-[var(--border-mid)] shadow-[var(--shadow-float)]'>
              {/* Header */}
              <div className='flex items-center justify-between px-5 py-4 border-b border-[var(--border-mid)] flex-shrink-0'>
                <h2 className='text-base font-semibold font-serif text-[var(--fg)]'>
                  {t('setting')}
                </h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className='p-1.5 rounded-lg text-[var(--fg-3)] hover:bg-[var(--border-mid)] hover:text-[var(--fg)] transition-colors cursor-pointer'
                  aria-label='close settings'
                >
                  <Icon name="cross2" />
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
                <div className='rounded-xl bg-[var(--bg-card)] border border-[var(--border-mid)] divide-y divide-[var(--border-mid)] overflow-hidden [&_.btn]:w-full [&_.btn]:justify-start [&_.btn]:rounded-none [&_.btn]:border-none [&_.btn]:bg-transparent [&_.btn]:shadow-none [&_.btn:hover]:bg-[var(--bg-sand)] [&_.btn]:text-[var(--fg)] [&_.btn]:px-4 [&_.btn]:py-3 [&_.btn]:text-sm [&_.btn]:font-medium'>
                  <PromptLibraryMenu />
                  <ChatConfigMenu />
                  <CustomModelsManager />
                </div>

                {/* Data */}
                <SectionLabel>
                  {t('data', { defaultValue: 'Data' })}
                </SectionLabel>
                <div className='rounded-xl bg-[var(--bg-card)] border border-[var(--border-mid)] overflow-hidden [&_.btn]:w-full [&_.btn]:justify-start [&_.btn]:rounded-none [&_.btn]:border-none [&_.btn]:bg-transparent [&_.btn]:shadow-none [&_.btn:hover]:bg-[var(--bg-sand)] [&_.btn]:text-[var(--fg)] [&_.btn]:px-4 [&_.btn]:py-3 [&_.btn]:text-sm [&_.btn]:font-medium'>
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
        className='flex items-center gap-2 w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--fg-2)] text-[13px] transition-colors cursor-pointer'
        onClick={() => setIsModalOpen(true)}
      >
        <Icon name="setting" className='w-4 h-4' /> {t('setting') as string}
      </button>
      {modal}
    </>
  );
};

export default SettingsMenu;
