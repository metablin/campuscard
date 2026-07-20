/**
 * Копирование текста в буфер обмена.
 *
 * navigator.clipboard доступен только в secure context (https/localhost);
 * при открытии сайта по http://<IP> его нет — тогда fallback на скрытый
 * textarea + document.execCommand('copy').
 *
 * @returns true, если текст попал в буфер; false — показать ссылку вручную.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  // в не-secure context свойства clipboard нет вовсе — TS об этом не знает
  const clipboard = navigator.clipboard as Clipboard | undefined;
  if (clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // clipboard API есть, но отклонил запрос (нет фокуса/прав) — пробуем fallback
    }
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  // вне вьюпорта и без флэша выделения
  textarea.style.position = 'fixed';
  textarea.style.top = '0';
  textarea.style.left = '0';
  textarea.style.opacity = '0';
  textarea.readOnly = true;
  document.body.appendChild(textarea);
  try {
    textarea.focus();
    textarea.select();
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    // узел удаляем даже при исключении в focus/select/execCommand
    textarea.remove();
  }
}
