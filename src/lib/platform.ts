/**
 * Thin platform layer: uses Tauri APIs when running as the Windows desktop
 * app, and falls back to plain browser behaviour in `npm run dev` / preview.
 * Everything is local; nothing here talks to the internet.
 */

export const isTauri = (): boolean =>
  typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

async function win() {
  const {getCurrentWindow} = await import('@tauri-apps/api/window');
  return getCurrentWindow();
}

export const windowControls = {
  minimize: async () => isTauri() && (await win()).minimize(),
  toggleMaximize: async () => isTauri() && (await win()).toggleMaximize(),
  close: async () => isTauri() && (await win()).close(),
  startDragging: async () => isTauri() && (await win()).startDragging(),
};

/** Open an external URL (WhatsApp Web / WhatsApp Desktop deep link). */
export async function openExternal(url: string): Promise<void> {
  if (isTauri()) {
    try {
      const {openUrl} = await import('@tauri-apps/plugin-opener');
      await openUrl(url);
      return;
    } catch {
      /* fall through */
    }
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}

/**
 * Save a file. In Tauri a native "Save As" dialog is shown; in the browser the
 * file is downloaded. Returns false if the user cancelled.
 */
export async function saveFile(
  filename: string,
  data: Blob,
  filter: {name: string; extensions: string[]},
): Promise<boolean> {
  if (isTauri()) {
    const {save} = await import('@tauri-apps/plugin-dialog');
    const {writeFile} = await import('@tauri-apps/plugin-fs');
    const path = await save({defaultPath: filename, filters: [filter]});
    if (!path) return false;
    await writeFile(path, new Uint8Array(await data.arrayBuffer()));
    return true;
  }
  const url = URL.createObjectURL(data);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return true;
}

/** Let the user pick a file to read (backup restore). */
export function pickTextFile(accept = '.json,application/json'): Promise<string | null> {
  return new Promise(resolve => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.onchange = async () => {
      const f = input.files?.[0];
      resolve(f ? await f.text() : null);
    };
    input.oncancel = () => resolve(null);
    input.click();
  });
}

export async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}
