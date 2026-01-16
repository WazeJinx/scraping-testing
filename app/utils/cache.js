export const cache = {};

// Optional: Add a cleanup function to prevent memory leaks
export const cleanupCache = (maxAge = 5 * 60 * 1000) => {
  const now = Date.now();
  Object.keys(cache).forEach((key) => {
    if (cache[key] && now - cache[key].lastFetched > maxAge) {
      delete cache[key];
    }
  });
};
