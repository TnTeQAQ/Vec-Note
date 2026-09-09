import { describe, expect, it } from 'vitest';
import { KNOWN_PAGES, pageIdFromPath, pathFromPageId } from './routes';

describe('route mapping', () => {
  it('maps known page ids to canonical paths and back', () => {
    for (const id of KNOWN_PAGES) {
      const path = pathFromPageId(id);
      expect(path).toBeTruthy();
      expect(pageIdFromPath(path!)).toBe(id);
    }
  });

  it('home is the clean root and about has its own path', () => {
    expect(pathFromPageId('home')).toBe('/');
    expect(pathFromPageId('about')).toBe('/about');
  });

  it('accepts an optional trailing slash on /about/', () => {
    expect(pageIdFromPath('/about/')).toBe('about');
  });

  it('returns not-found for unknown paths', () => {
    expect(pageIdFromPath('/nope')).toBe('not-found');
    expect(pageIdFromPath('/api/notes')).toBe('not-found');
  });

  it('returns null path for unknown page ids', () => {
    expect(pathFromPageId('not-found')).toBeNull();
    expect(pathFromPageId('whatever')).toBeNull();
  });
});
