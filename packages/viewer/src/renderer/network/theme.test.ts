import { describe, expect, test } from 'vitest';
import { networkThemeStyle, resolveNetworkTheme } from './theme';

describe('resolveNetworkTheme', () => {
  test('defaults to obsidian', () => {
    const theme = resolveNetworkTheme({});
    expect(theme).toMatchObject({
      name: 'obsidian',
      backgroundColor: '#11131a',
      textColor: '#d8dee9',
      mutedOpacity: 0.18,
    });
  });

  test('supports light theme', () => {
    const theme = resolveNetworkTheme({ theme: 'light' });
    expect(theme.name).toBe('light');
    expect(theme.backgroundColor).toBe('#f8fafc');
    expect(theme.textColor).toBe('#0f172a');
  });

  test('auto chooses light for bright backgrounds and obsidian for dark backgrounds', () => {
    expect(resolveNetworkTheme({ theme: 'auto', backgroundColor: '#ffffff' }).name).toBe('light');
    expect(resolveNetworkTheme({ theme: 'auto', backgroundColor: '#101820' }).name).toBe('obsidian');
  });

  test('custom tokens override defaults', () => {
    const theme = resolveNetworkTheme({
      theme: 'custom',
      backgroundColor: '#000000',
      selectedColor: '#ff00aa',
      clusterColors: ['#111111', '#222222'],
      mutedOpacity: 0.25,
    });
    expect(theme.name).toBe('custom');
    expect(theme.backgroundColor).toBe('#000000');
    expect(theme.selectedColor).toBe('#ff00aa');
    expect(theme.clusterColors).toEqual(['#111111', '#222222']);
    expect(theme.mutedOpacity).toBe(0.25);
  });
});

describe('networkThemeStyle', () => {
  test('emits safe CSS custom properties', () => {
    const style = networkThemeStyle(resolveNetworkTheme({ theme: 'obsidian' }));
    expect(style).toContain('--xcon-network-bg:#11131a');
    expect(style).toContain('--xcon-network-text:#d8dee9');
    expect(style).not.toContain('javascript:');
    expect(style).not.toContain('url(');
  });
});
