import { describe, expect, it } from 'vitest';
import { shortcutOf, SHORTCUTS, type KeyPress } from './shortcuts';

function press(key: string, mods: Partial<KeyPress> = {}): KeyPress {
  return { key, shiftKey: false, ctrlKey: false, metaKey: false, altKey: false, ...mods };
}

describe('shortcutOf', () => {
  it('debuggerKeys', () => {
    expect(shortcutOf(press('F5'), false)).toBe('toggle-run');
    expect(shortcutOf(press('F10'), false)).toBe('step');
    expect(shortcutOf(press('F5', { shiftKey: true }), false)).toBe('stop');
  });

  it('workWhileTypingInTheEditor', () => {
    // las teclas de funcion no escriben nada: valen tambien con el foco en el codigo
    expect(shortcutOf(press('F5'), true)).toBe('toggle-run');
    expect(shortcutOf(press('F10'), true)).toBe('step');
  });

  it('questionMarkOnlyOutsideTextFields', () => {
    expect(shortcutOf(press('?', { shiftKey: true }), false)).toBe('help');
    expect(shortcutOf(press('?', { shiftKey: true }), true)).toBeNull();
  });

  it('browserReloadCombosAreLeftAlone', () => {
    expect(shortcutOf(press('F5', { ctrlKey: true }), false)).toBeNull();
    expect(shortcutOf(press('F5', { metaKey: true }), false)).toBeNull();
    expect(shortcutOf(press('r', { ctrlKey: true }), false)).toBeNull();
  });

  it('otherKeysAreNotShortcuts', () => {
    expect(shortcutOf(press('a'), false)).toBeNull();
    expect(shortcutOf(press('F6'), false)).toBeNull();
  });

  it('everyActionIsListed', () => {
    expect(SHORTCUTS.map((s) => s.action).sort()).toEqual(['help', 'step', 'stop', 'toggle-run']);
  });
});
