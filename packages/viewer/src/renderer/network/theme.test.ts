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

  test('trims and lowercases theme names', () => {
    expect(resolveNetworkTheme({ theme: ' Light ' }).name).toBe('light');
    expect(resolveNetworkTheme({ theme: ' AUTO ', backgroundColor: '#ffffff' }).name).toBe('light');
    expect(resolveNetworkTheme({ theme: ' CuStOm ' }).name).toBe('custom');
  });

  test('auto chooses light for bright backgrounds and obsidian for dark backgrounds', () => {
    expect(resolveNetworkTheme({ theme: 'auto', backgroundColor: '#ffffff' }).name).toBe('light');
    expect(resolveNetworkTheme({ theme: 'auto', backgroundColor: '#101820' }).name).toBe('obsidian');
  });

  test('applies safe token overrides to the default theme', () => {
    const theme = resolveNetworkTheme({
      backgroundColor: '#101820',
      linkColor: '#334455',
    });

    expect(theme.name).toBe('obsidian');
    expect(theme.backgroundColor).toBe('#101820');
    expect(theme.linkColor).toBe('#334455');
  });

  test('applies safe token overrides after resolving auto theme', () => {
    const theme = resolveNetworkTheme({
      theme: 'auto',
      backgroundColor: '#ffffff',
      nodeColor: '#123456',
    });

    expect(theme.name).toBe('light');
    expect(theme.backgroundColor).toBe('#ffffff');
    expect(theme.nodeColor).toBe('#123456');
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

  test('rejects unsafe custom input tokens', () => {
    const theme = resolveNetworkTheme({
      theme: 'custom',
      backgroundColor: 'url(javascript:alert(1))',
      selectedColor: 'javascript:alert(1)',
      clusterColors: ['#111111', 'url(https://example.test/a.png)', 'blue'],
    });
    const style = networkThemeStyle(theme);

    expect(theme.backgroundColor).toBe('#11131a');
    expect(theme.selectedColor).toBe('#f8fafc');
    expect(theme.clusterColors).toEqual(['#111111', 'blue']);
    expect(style).not.toContain('javascript:');
    expect(style).not.toContain('url(');
  });

  test('clamps muted opacity overrides', () => {
    expect(resolveNetworkTheme({ mutedOpacity: 2 }).mutedOpacity).toBe(1);
    expect(resolveNetworkTheme({ theme: 'light', mutedOpacity: -0.5 }).mutedOpacity).toBe(0);
  });

  test('filters invalid cluster colors while keeping safe values', () => {
    const theme = resolveNetworkTheme({
      clusterColors: ['#111111', 'url(https://example.test/a.png)', 'var(--network-token)', 'rgb(1, 2, 3)'],
    });

    expect(theme.clusterColors).toEqual(['#111111', 'var(--network-token)']);
  });
});

describe('networkThemeStyle', () => {
  test('emits safe CSS custom properties', () => {
    const style = networkThemeStyle(resolveNetworkTheme({ theme: 'obsidian' }));
    expect(style).toContain('--xcon-network-bg:#11131a');
    expect(style).toContain('--xcon-network-text:#d8dee9');
    expect(style).toContain('--xcon-network-panel:#1b2030');
    expect(style).not.toContain('--xcon-network-panel-bg');
    expect(style).not.toContain('javascript:');
    expect(style).not.toContain('url(');
  });
});
