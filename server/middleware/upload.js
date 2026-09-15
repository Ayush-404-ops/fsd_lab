const path = require('path');
const fs = require('fs');
const multer = require('multer');

const uploadDir = path.join(__dirname, '../uploads/builds');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `build-${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedExts = ['.zip', '.rar', '.7z', '.gz', '.tgz', '.exe', '.bin', '.apk', '.dmg'];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedExts.includes(ext) || file.mimetype === 'application/zip' || file.mimetype === 'application/x-zip-compressed') {
    cb(null, true);
  } else {
    cb(new Error(`Invalid build file type "${ext}". Allowed types: ${allowedExts.join(', ')}`), false);
  }
};

const uploadBuild = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB max build size for course demo
  },
  fileFilter
});

module.exports = {
  uploadBuild
};
