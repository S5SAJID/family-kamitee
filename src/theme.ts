/**
 * Kameti Khata theme.
 *
 * Starts from the generated Astryx theme module (Neutral) and only swaps the
 * typography to the native Windows system font stack so the app never needs a
 * web font (100% offline in Tauri). Everything else is inherited from Neutral.
 */
import {defineTheme} from '@astryxdesign/core/theme';
import {themes, defaultThemeSlug} from './astryx-themes';

const SYSTEM_SANS =
  "'Segoe UI Variable Text', 'Segoe UI Variable', 'Segoe UI', -apple-system, BlinkMacSystemFont, system-ui, Roboto, 'Helvetica Neue', Arial, sans-serif";
const SYSTEM_DISPLAY =
  "'Segoe UI Variable Display', 'Segoe UI Variable', 'Segoe UI', -apple-system, BlinkMacSystemFont, system-ui, Roboto, 'Helvetica Neue', Arial, sans-serif";
const SYSTEM_MONO = "'Cascadia Mono', Consolas, 'SF Mono', Menlo, monospace";

export const kametiTheme = defineTheme({
  name: 'kameti',
  extends: themes[defaultThemeSlug],
  tokens: {
    '--font-family-body': SYSTEM_SANS,
    '--font-family-heading': SYSTEM_DISPLAY,
    '--font-family-code': SYSTEM_MONO,
  },
});
