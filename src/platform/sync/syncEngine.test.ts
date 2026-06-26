import { expect, test, describe } from 'vitest';
import { generateChecksum } from './syncEngine';

describe('Sync Engine / Checksum', () => {
  test('generates consistent checksums for identical objects', () => {
    const obj1 = { a: 1, b: 2, c: { nested: true } };
    const obj2 = { c: { nested: true }, b: 2, a: 1 };
    
    expect(generateChecksum(obj1)).toBe(generateChecksum(obj2));
  });

  test('generates different checksums for different objects', () => {
    const obj1 = { a: 1, b: 2 };
    const obj2 = { a: 1, b: 3 };
    
    expect(generateChecksum(obj1)).not.toBe(generateChecksum(obj2));
  });

  test('handles nulls and arrays', () => {
    const obj1 = { list: [1, 2, null] };
    const obj2 = { list: [1, 2, null] };
    
    expect(generateChecksum(obj1)).toBe(generateChecksum(obj2));
  });
});
