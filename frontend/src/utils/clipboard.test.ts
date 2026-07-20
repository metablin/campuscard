import { afterEach, describe, expect, it, vi } from 'vitest';

import { copyToClipboard } from './clipboard';

/** Подменяет navigator.clipboard (в jsdom свойства navigator — на прототипе). */
function stubClipboard(value: unknown) {
  Object.defineProperty(window.navigator, 'clipboard', {
    value,
    configurable: true,
    writable: true,
  });
}

function stubExecCommand(impl: () => boolean) {
  const fn = vi.fn(impl);
  Object.defineProperty(window.document, 'execCommand', {
    value: fn,
    configurable: true,
    writable: true,
  });
  return fn;
}

describe('copyToClipboard', () => {
  afterEach(() => {
    delete (window.navigator as { clipboard?: unknown }).clipboard;
    delete (window.document as { execCommand?: unknown }).execCommand;
  });

  it('использует navigator.clipboard.writeText, когда API доступен', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    stubClipboard({ writeText });

    await expect(copyToClipboard('текст')).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith('текст');
  });

  it('fallback на textarea + execCommand, когда clipboard API нет (http://<IP>)', async () => {
    stubClipboard(undefined);
    const execCommand = stubExecCommand(() => true);

    await expect(copyToClipboard('http://192.168.0.5/u/ivan')).resolves.toBe(true);
    expect(execCommand).toHaveBeenCalledWith('copy');
  });

  it('fallback срабатывает и при отклонении clipboard.writeText', async () => {
    stubClipboard({ writeText: vi.fn().mockRejectedValue(new Error('NotAllowedError')) });
    const execCommand = stubExecCommand(() => true);

    await expect(copyToClipboard('ссылка')).resolves.toBe(true);
    expect(execCommand).toHaveBeenCalledWith('copy');
  });

  it('возвращает false, если скопировать не удалось никак', async () => {
    stubClipboard(undefined);
    stubExecCommand(() => false);

    await expect(copyToClipboard('текст')).resolves.toBe(false);
  });
});
