const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const path   = require('path');
const fs     = require('fs');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const cloudinaryConfigured =
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_CLOUD_NAME !== 'your_cloud_name';

// ── Cloudinary storage ────────────────────────────────────────────────────────
const cloudinaryStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder:         'stayfinder/properties',
    allowed_formats: ['jpg','jpeg','png','webp'],
    transformation: [{ width: 1200, height: 800, crop: 'limit', quality: 'auto' }],
  },
});

// ── Local fallback storage ────────────────────────────────────────────────────
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const localStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename:    (req, file, cb) => cb(null, `prop_${Date.now()}_${Math.round(Math.random()*1e6)}${path.extname(file.originalname)}`),
});

const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|webp/;
  if (allowed.test(path.extname(file.originalname).toLowerCase())) cb(null, true);
  else cb(new Error('Only image files (jpg, png, webp) are allowed'));
};

// Use Cloudinary if configured, else local disk
const upload = multer({
  storage:   cloudinaryConfigured ? cloudinaryStorage : localStorage,
  limits:    { fileSize: 5 * 1024 * 1024 },
  fileFilter,
});

// Helper: extract public URL regardless of storage backend
function getImageUrl(file) {
  if (cloudinaryConfigured && file.path) return file.path;   // Cloudinary returns URL in path
  return `/uploads/${file.filename}`;                         // local
}

// Helper: delete from Cloudinary
async function deleteImage(publicIdOrUrl) {
  if (!cloudinaryConfigured) return;
  try {
    const publicId = publicIdOrUrl.includes('cloudinary')
      ? publicIdOrUrl.split('/').slice(-2).join('/').split('.')[0]
      : publicIdOrUrl;
    await cloudinary.uploader.destroy(publicId);
  } catch (e) {
    console.error('Cloudinary delete error:', e.message);
  }
}

module.exports = { upload, getImageUrl, deleteImage, cloudinaryConfigured };
