import '@testing-library/jest-dom';

// Mock the api module
vi.mock('../src/utils/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

// Spy on URL.createObjectURL and revokeObjectURL without breaking the URL constructor
const mockCreateObjectURL = vi.fn(() => 'blob:http://localhost/test-blob');
const mockRevokeObjectURL = vi.fn();
vi.spyOn(URL, 'createObjectURL').mockImplementation(mockCreateObjectURL);
vi.spyOn(URL, 'revokeObjectURL').mockImplementation(mockRevokeObjectURL);

// Mock document.createElement to intercept anchor clicks
const originalCreateElement = document.createElement.bind(document);
vi.spyOn(document, 'createElement').mockImplementation((tagName, options) => {
  const el = originalCreateElement(tagName, options);
  if (tagName.toLowerCase() === 'a') {
    el.click = vi.fn();
  }
  return el;
});

// Keep native Blob - we only mock URL.createObjectURL above
