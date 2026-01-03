/**
 * Test Esempio - Verificasetup Vitest
 * 
 * Verifica che:
 * 1. Vitest funziona
 * 2. Testing Library configurato
 * 3. jsdom environment attivo
 * 4. Matchers @testing-library/jest-dom disponibili
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

/**
 * Simple component for testing setup
 */
function WelcomeMessage({ name }) {
  return (
    <div>
      <h1>SGQ ISO 9001:2015</h1>
      <p>Benvenuto, {name}!</p>
    </div>
  );
}

describe('Vitest Setup Verification', () => {
  it('dovrebbe eseguire test base', () => {
    expect(true).toBe(true);
  });

  it('dovrebbe avere accesso a matchers personalizzati', () => {
    expect(1 + 1).toBe(2);
    expect([1, 2, 3]).toHaveLength(3);
  });

  it('dovrebbe renderizzare componente React', () => {
    render(<WelcomeMessage name="QS Studio" />);
    
    expect(screen.getByText('SGQ ISO 9001:2015')).toBeInTheDocument();
    expect(screen.getByText(/Benvenuto, QS Studio/)).toBeInTheDocument();
  });

  it('dovrebbe avere jsdom environment', () => {
    expect(typeof window).toBe('object');
    expect(typeof document).toBe('object');
    expect(window.localStorage).toBeDefined();
  });

  it('dovrebbe avere mock IndexedDB', () => {
    expect(window.indexedDB).toBeDefined();
    expect(typeof window.indexedDB.open).toBe('function');
  });

  it('dovrebbe avere mock File System Access API', () => {
    expect(window.showSaveFilePicker).toBeDefined();
    expect(window.showDirectoryPicker).toBeDefined();
  });
});
