// Utility to convert Cloudinary image URL to WebP transformation
const toCloudinaryWebp = async (url) => {
  if (!url) return url;
  if (!url.includes('res.cloudinary.com')) return url;
  const matches = url.match(/upload\/(?:v\d+\/)?(.+?)(?:\.(jpg|jpeg|png|webp))$/i);
  if (!matches) return url;
  const publicId = matches[1];
  return url.replace(/\/upload\/.*$/, `/upload/f_webp/${publicId}`);
}
module.exports = { toCloudinaryWebp };