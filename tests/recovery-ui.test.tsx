import { useEffect } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import ErrorBoundary from '@components/ErrorBoundary/ErrorBoundary';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { defaultValue?: string }) =>
      options?.defaultValue ?? key,
  }),
}));

afterEach(() => vi.restoreAllMocks());

function BrokenApp() {
  throw new Error('Startup failed');
}

function StorageEffectFailure() {
  useEffect(() => {
    window.localStorage.getItem('chatty-buddy');
  }, []);
  return <p>Starting application</p>;
}

describe('storage-independent recovery', () => {
  it('renders and reports a denied storage getter without crashing or deleting data', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const read = vi
      .spyOn(window, 'localStorage', 'get')
      .mockImplementation(() => {
        throw new DOMException('Denied', 'SecurityError');
      });
    render(
      <ErrorBoundary>
        <BrokenApp />
      </ErrorBoundary>
    );
    expect(read).not.toHaveBeenCalled();
    expect(screen.getByRole('heading', { level: 1 })).toBeDefined();
    fireEvent.click(
      screen.getByRole('button', { name: 'Download local backup' })
    );
    expect(screen.getByRole('alert').textContent).toContain(
      'saved data has not been cleared'
    );
  });

  it('catches storage denial during application bootstrap effects', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
      throw new DOMException('Denied', 'SecurityError');
    });
    render(
      <ErrorBoundary>
        <StorageEffectFailure />
      </ErrorBoundary>
    );
    expect(screen.getByRole('button', { name: 'Reload page' })).toBeDefined();
    expect(screen.getByText(/never clears your saved chats/)).toBeDefined();
  });

  it('downloads the original stored bytes only after a click', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    localStorage.setItem('chatty-buddy', '{original malformed recovery bytes');
    const read = vi.spyOn(Storage.prototype, 'getItem');
    const createUrl = vi.fn(() => 'blob:recovery-test');
    vi.stubGlobal(
      'URL',
      class extends URL {
        static createObjectURL = createUrl;
        static revokeObjectURL = vi.fn();
      }
    );
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <BrokenApp />
      </ErrorBoundary>
    );
    expect(read).not.toHaveBeenCalled();
    fireEvent.click(
      screen.getByRole('button', { name: 'Download local backup' })
    );
    expect(read).toHaveBeenCalledWith('chatty-buddy');
    expect(createUrl).toHaveBeenCalledOnce();
    expect(localStorage.getItem('chatty-buddy')).toBe(
      '{original malformed recovery bytes'
    );
  });
});
