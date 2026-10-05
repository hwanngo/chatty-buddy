import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import ConfigMenu from '@components/ConfigMenu';
import PromptLibraryMenu from '@components/PromptLibraryMenu';
import ApiMenu from '@components/ApiMenu';
import Dialog from '@components/Dialog';
import CustomModelsManager from '@components/SettingsMenu/CustomModelsManager';

const { state } = vi.hoisted(() => ({
  state: {
    customModels: [],
    prompts: [{ id: '1', name: 'Original', prompt: 'Original prompt' }],
    apiKey: '',
    apiEndpoint: 'http://localhost:11434',
    apiType: 'ollama',
    apiVersion: '',
    addCustomModel: vi.fn(),
    removeCustomModel: vi.fn(),
    setPrompts: vi.fn(),
    setApiKey: vi.fn(),
    setApiEndpoint: vi.fn(),
    setApiType: vi.fn(),
    setApiVersion: vi.fn(),
  },
}));
vi.mock('@store/store', () => ({
  default: Object.assign(
    (selector: (value: typeof state) => unknown) => selector(state),
    { getState: () => state }
  ),
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
  Trans: () => null,
}));
vi.mock('@constants/modelLoader', () => ({
  modelOptions: ['audit'],
  modelMaxToken: { audit: 1000 },
  onModelsReady: (fn: () => void) => {
    fn();
    return () => {};
  },
  reloadModels: vi.fn(),
}));

beforeEach(() => {
  document.body.innerHTML = '<div id="root"></div><div id="modal-root"></div>';
  vi.clearAllMocks();
});
const config = {
  model: 'audit',
  max_tokens: 100,
  temperature: 0,
  top_p: 1,
  presence_penalty: 0,
  frequency_penalty: 0,
  fetchUrl: true,
  webSearch: true,
  think: false,
  reasoningEffort: 'none' as const,
};

describe('audit UI regressions', () => {
  it('keeps tool and reasoning options on explicit configuration save', () => {
    const save = vi.fn();
    render(
      <ConfigMenu
        config={config}
        setConfig={save}
        imageDetail='auto'
        setImageDetail={vi.fn()}
        setIsModalOpen={vi.fn()}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'confirm' }));
    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({
        fetchUrl: true,
        think: false,
        reasoningEffort: 'none',
        webSearch: true,
        temperature: 0,
      })
    );
  });
  it('Escape cancels configuration without saving', () => {
    const save = vi.fn();
    const close = vi.fn();
    render(
      <ConfigMenu
        config={config}
        setConfig={save}
        imageDetail='auto'
        setImageDetail={vi.fn()}
        setIsModalOpen={close}
      />
    );
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(save).not.toHaveBeenCalled();
    expect(close).toHaveBeenCalledWith(false);
  });
  it('prompt cancel leaves the stored objects unchanged', () => {
    render(<PromptLibraryMenu />);
    fireEvent.click(screen.getByRole('button', { name: 'promptLibrary' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'name 1' }), {
      target: { value: 'Unsaved' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'cancel' }));
    expect(state.prompts[0].name).toBe('Original');
    expect(state.setPrompts).not.toHaveBeenCalled();
  });
  it('allows keyless local onboarding and masks credentials by default', () => {
    const close = vi.fn();
    render(<ApiMenu firstRun setIsModalOpen={close} />);
    expect(
      screen.getByLabelText('apiKey.inputLabel').getAttribute('type')
    ).toBe('password');
    fireEvent.click(screen.getByRole('button', { name: 'confirm' }));
    expect(state.setApiEndpoint).toHaveBeenCalledWith('http://localhost:11434');
    expect(close).toHaveBeenCalledWith(false);
  });
  it('saves the custom model completion ceiling from the form', () => {
    render(<CustomModelsManager />);
    fireEvent.click(screen.getByRole('button', { name: 'customModels.title' }));
    fireEvent.change(
      screen.getByRole('textbox', { name: 'customModels.modelId' }),
      { target: { value: 'local-model' } }
    );
    fireEvent.change(
      screen.getByRole('textbox', { name: 'customModels.modelName' }),
      { target: { value: 'Local model' } }
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'customModels.showAdvanced' })
    );
    fireEvent.change(
      screen.getByRole('spinbutton', {
        name: 'customModels.maxCompletionTokens',
      }),
      { target: { value: '2048' } }
    );
    const form = screen
      .getByRole('button', { name: 'customModels.addModel' })
      .closest('form')!;
    expect(
      Array.from(form.elements)
        .filter(
          (element) =>
            element instanceof HTMLInputElement && !element.checkValidity()
        )
        .map((element) => (element as HTMLInputElement).outerHTML)
    ).toEqual([]);
    fireEvent.submit(form);
    expect(state.addCustomModel).toHaveBeenCalledWith(
      expect.objectContaining({
        top_provider: expect.objectContaining({ max_completion_tokens: 2048 }),
      })
    );
  });
  it('isolates the background and restores focus after a dialog unmounts', () => {
    const trigger = document.createElement('button');
    document.getElementById('root')!.append(trigger);
    trigger.focus();
    const view = render(
      <Dialog title='Audit dialog' setIsModalOpen={vi.fn()}>
        <input aria-label='Draft' />
      </Dialog>
    );
    expect(document.getElementById('root')!.inert).toBe(true);
    expect(document.activeElement?.getAttribute('aria-label')).toBe(
      'common.close'
    );
    view.unmount();
    expect(document.getElementById('root')!.inert).toBe(false);
    expect(document.activeElement).toBe(trigger);
  });
});
