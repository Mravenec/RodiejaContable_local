export const formatImageUrl = (url) => {
  if (!url) return '';
  const trimmed = url.trim();
  // Check if it's a GDrive URL
  const gdriveRegex = /drive\.google\.com\/file\/d\/([^\/]+)/;
  const match = trimmed.match(gdriveRegex);
  if (match && match[1]) {
    return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w1000`;
  }
  return trimmed;
};

export const parseImageUrls = (urlsString) => {
  if (!urlsString) return [];
  // Split by comma or newline
  return urlsString
    .split(/[\n,]+/)
    .map(u => u.trim())
    .filter(u => u.length > 0)
    .map(formatImageUrl);
};
