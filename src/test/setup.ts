/**
 * Vitest Test Setup
 * Global test configuration and mocks
 */
/* eslint-env node */

import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Extend global type for testing
declare global {
  var WebGLRenderingContext: typeof WebGLRenderingContext;
  var WebGL2RenderingContext: typeof WebGL2RenderingContext;
  var AudioContext: typeof AudioContext;
  var webkitAudioContext: typeof AudioContext;
}

// Mock WebGL for testing (Three.js needs this)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
globalThis.WebGLRenderingContext = globalThis.WebGLRenderingContext || ({} as any);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
globalThis.WebGL2RenderingContext = globalThis.WebGL2RenderingContext || ({} as any);

// Mock Canvas API
HTMLCanvasElement.prototype.getContext = vi.fn(() => {
  return {
    fillRect: vi.fn(),
    clearRect: vi.fn(),
    getImageData: vi.fn(() => ({ data: new Array(4) })),
    putImageData: vi.fn(),
    createImageData: vi.fn(() => []),
    setTransform: vi.fn(),
    drawImage: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    scale: vi.fn(),
    rotate: vi.fn(),
    translate: vi.fn(),
    clip: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    strokeStyle: '',
    fillStyle: '',
    globalAlpha: 1,
    lineWidth: 1,
    font: '10px sans-serif',
  };
});

// Mock requestAnimationFrame for testing
globalThis.requestAnimationFrame = (callback: FrameRequestCallback) => {
  return setTimeout(callback, 16) as unknown as number; // ~60fps
};

globalThis.cancelAnimationFrame = (id: number) => {
  clearTimeout(id);
};

// Mock ResizeObserver
globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock AudioContext for Howler.js
globalThis.AudioContext =
  globalThis.AudioContext ||
  (class AudioContext {
    createOscillator() {
      return {};
    }
    createGain() {
      return { gain: { value: 0 } };
    }
    destination = {};
    currentTime = 0;
    sampleRate = 44100;
    state = 'running' as AudioContextState;
    suspend() {
      return Promise.resolve();
    }
    resume() {
      return Promise.resolve();
    }
    close() {
      return Promise.resolve();
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);

// Mock webkitAudioContext
globalThis.webkitAudioContext = globalThis.AudioContext;
