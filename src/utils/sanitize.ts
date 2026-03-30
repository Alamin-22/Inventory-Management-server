/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Recursively strips keys starting with '$' from an object to prevent NoSQL injection.
 * High-performance, zero-dependency, and modern TypeScript compatible.
 */

export const sanitizeData = (obj: any): any => {
  if (obj instanceof Array) {
    for (let i = 0; i < obj.length; i++) {
      obj[i] = sanitizeData(obj[i]);
    }
  } else if (obj !== null && typeof obj === 'object') {
    Object.keys(obj).forEach((key) => {
      if (key.startsWith('$')) {
        delete obj[key]; // The Shield: Deletes the injection key
      } else {
        obj[key] = sanitizeData(obj[key]);
      }
    });
  }
  return obj;
};
