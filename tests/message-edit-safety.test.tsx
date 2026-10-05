import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import type { ChatInterface, MessageInterface } from '@type/chat';
import ContentView from '@components/Chat/ChatContent/Message/View/ContentView';
import EditView from '@components/Chat/ChatContent/Message/View/EditView';
import {
  hasToolMessages,
  isToolGroupMessage,
} from '@components/Chat/ChatContent/Message/messageMutation';

const { state, submit } = vi.hoisted(() => ({
  state: {
    chats: [] as ChatInterface[],
    currentChatIndex: 0,
    generating: false,
    markdownMode: false,
    inlineLatex: false,
    inputRole: 'user',
    apiKey: '',
    apiEndpoint: 'http://localhost:5199',
    enterToSubmit: true,
    setChats: vi.fn(),
    setCurrentChatIndex: vi.fn(),
    addToast: vi.fn(),
  },
  submit: vi.fn(),
}));
vi.mock('@store/store', () => ({
  default: Object.assign(
    (selector: (value: typeof state) => unknown) => selector(state),
    { getState: () => state }
  ),
}));
vi.mock('@hooks/useSubmit', () => ({
  default: () => ({ handleSubmit: submit }),
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('@constants/modelLoader', () => ({
  modelOptions: ['audit'],
  modelTypes: { audit: 'text' },
  modelMaxToken: { audit: 1000 },
  onModelsReady: () => () => {},
}));
vi.mock('@components/AgentActivity', () => ({
  AgentTimeline: () => null,
  PixelGridLoader: () => null,
}));
const text = (role: 'user' | 'assistant', value: string): MessageInterface => ({
  role,
  content: [{ type: 'text', text: value }],
});
const ordinary = [
  text('user', 'Question'),
  text('assistant', 'Answer'),
  text('user', 'Follow-up'),
];
const tools: MessageInterface[] = [
  text('user', 'Question'),
  {
    ...text('assistant', ''),
    tool_calls: [
      {
        id: 'call',
        type: 'function',
        function: { name: 'fetch_url', arguments: '{}' },
      },
    ],
  },
  {
    role: 'tool',
    tool_call_id: 'call',
    content: [{ type: 'text', text: 'Tool result' }],
  },
  text('assistant', 'Final answer'),
];
function setMessages(messages: MessageInterface[]) {
  state.chats = [
    {
      id: 'chat',
      title: 'Test',
      messages,
      config: {
        model: 'audit',
        max_tokens: 1000,
        temperature: 1,
        top_p: 1,
        presence_penalty: 0,
        frequency_penalty: 0,
      },
      imageDetail: 'auto',
    },
  ];
}
beforeEach(() => {
  document.body.innerHTML = '<div id="root"></div><div id="modal-root"></div>';
  vi.clearAllMocks();
  state.generating = false;
  setMessages(ordinary);
});

describe('message mutation safeguards', () => {
  it('recognizes folded tool runs and leaves ordinary user messages editable', () => {
    expect(hasToolMessages(tools)).toBe(true);
    expect(isToolGroupMessage(tools, 0)).toBe(false);
    expect(isToolGroupMessage(tools, 1)).toBe(true);
    expect(isToolGroupMessage(tools, 2)).toBe(true);
    expect(isToolGroupMessage(tools, 3)).toBe(true);
    expect(hasToolMessages(ordinary)).toBe(false);
  });
  it('disables reorder and deletion for a visible final tool answer', () => {
    setMessages(tools);
    render(
      <ContentView
        role='assistant'
        content={tools[3].content}
        messageIndex={3}
        setIsEdit={vi.fn()}
      />
    );
    expect(
      screen
        .getByRole('button', { name: 'shift message up' })
        .hasAttribute('disabled')
    ).toBe(true);
    expect(
      screen
        .getByRole('button', { name: 'delete message' })
        .hasAttribute('disabled')
    ).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'shift message up' }));
    expect(state.setChats).not.toHaveBeenCalled();
  });
  it('preserves ordinary reordering but guards a handler when generation starts after render', () => {
    render(
      <ContentView
        role='assistant'
        content={ordinary[1].content}
        messageIndex={1}
        setIsEdit={vi.fn()}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'shift message up' }));
    expect(state.setChats.mock.calls[0][0][0].messages).toEqual([
      ordinary[1],
      ordinary[0],
      ordinary[2],
    ]);
    state.setChats.mockClear();
    state.generating = true;
    fireEvent.click(screen.getByRole('button', { name: 'shift message down' }));
    expect(state.setChats).not.toHaveBeenCalled();
  });
  it('requires confirmation before a regeneration keyboard shortcut truncates history', () => {
    render(
      <EditView
        content={ordinary[0].content}
        messageIndex={0}
        role='user'
        setIsEdit={vi.fn()}
      />
    );
    fireEvent.keyDown(screen.getByRole('textbox'), {
      key: 'Enter',
      ctrlKey: true,
      shiftKey: true,
    });
    expect(screen.getByRole('dialog')).toBeDefined();
    expect(state.setChats).not.toHaveBeenCalled();
    expect(submit).not.toHaveBeenCalled();
    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'cancel' })
    );
    expect(state.setChats).not.toHaveBeenCalled();
    fireEvent.keyDown(screen.getByRole('textbox'), {
      key: 'Enter',
      ctrlKey: true,
      shiftKey: true,
    });
    fireEvent.click(screen.getByRole('button', { name: 'confirm' }));
    expect(state.setChats.mock.calls[0][0][0].messages).toHaveLength(1);
    expect(submit).toHaveBeenCalledOnce();
  });
});
