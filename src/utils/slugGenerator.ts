export const slugify = (text: string): string => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9 -]/g, '') // Remove invalid chars
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/-+/g, '-'); // Replace multiple - with single -
};
