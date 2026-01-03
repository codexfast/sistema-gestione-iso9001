/**
 * Vitest Global Setup - SGQ ISO 9001:2015
 * 
 * Configurazione globale per test environment:
 * - Testing Library matchers
 * - DOM cleanup automatico
 * - Mock IndexedDB/localStorage
 * - Console suppression per test puliti
 * 
 * @see https://testing-library.com/docs/react-testing-library/setup
 */

import { expect, afterEach, vi, beforeAll, afterAll } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

/**
 * Cleanup DOM dopo ogni test
 * Previene memory leak e test pollution
 */
afterEach(() => {
  cleanup();
});

/**
 * Mock window.matchMedia (richiesto da componenti responsive)
 */
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

/**
 * Mock IndexedDB (fallback se jsdom non lo supporta completamente)
 * Usato da: StorageContext, syncService
 */
const indexedDBMock = {
  open: vi.fn(() => ({
    onsuccess: null,
    onerror: null,
    result: {
      transaction: vi.fn(() => ({
        objectStore: vi.fn(() => ({
          put: vi.fn(),
          get: vi.fn(),
          getAll: vi.fn(() => ({ onsuccess: null })),
          delete: vi.fn(),
        })),
      })),
    },
  })),
  deleteDatabase: vi.fn(),
};

if (!window.indexedDB) {
  window.indexedDB = indexedDBMock;
}

/**
 * Mock localStorage (già disponibile in jsdom, ma reset tra test)
 */
beforeAll(() => {
  const localStorageMock = (() => {
    let store = {};
    return {
      getItem: (key) => store[key] || null,
      setItem: (key, value) => {
        store[key] = value.toString();
      },
      removeItem: (key) => {
        delete store[key];
      },
      clear: () => {
        store = {};
      },
    };
  })();

  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    writable: true,
  });
});

afterEach(() => {
  window.localStorage.clear();
});

/**
 * Suppress console errors in test output (opzionale)
 * Decommenta se vuoi output pulito
 */
// const originalError = console.error;
// beforeAll(() => {
//   console.error = (...args) => {
//     if (
//       typeof args[0] === 'string' &&
//       args[0].includes('Warning: ReactDOM.render')
//     ) {
//       return;
//     }
//     originalError.call(console, ...args);
//   };
// });

// afterAll(() => {
//   console.error = originalError;
// });

/**
 * Mock File System Access API (non supportato in test env)
 * Usato da: wordExport.js, fileSystemService.js
 */
if (!window.showSaveFilePicker) {
  window.showSaveFilePicker = vi.fn();
}
if (!window.showDirectoryPicker) {
  window.showDirectoryPicker = vi.fn();
}

/**
 * Mock fetch globale (MSW lo sovrascriverà nei test specifici)
 */
global.fetch = vi.fn();

/**
 * Export utilities per test helpers
 */
export const mockIndexedDB = indexedDBMock;
