const multer = require('multer');

const MAX_IMAGE_SIZE_MB = 5;
const allowedMimeTypes = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]);

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (!allowedMimeTypes.has(file.mimetype)) {
    return cb(new Error('Only JPG, PNG, and WEBP images are allowed'));
  }

  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_IMAGE_SIZE_MB * 1024 * 1024,
  },
});

const uploadRecipeImage = (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (!err) {
      return next();
    }

    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: `Image must be smaller than ${MAX_IMAGE_SIZE_MB}MB`,
        });
      }

      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }

    return res.status(400).json({
      success: false,
      message: err.message || 'Invalid image upload',
    });
  });
};

const pickFirstUploadedFile = (req) => {
  const candidates = ['photo', 'image', 'profilePhoto'];

  for (const fieldName of candidates) {
    if (req.files?.[fieldName]?.[0]) {
      return req.files[fieldName][0];
    }
  }

  return null;
};

const uploadProfilePhoto = (req, res, next) => {
  upload.fields([
    { name: 'photo', maxCount: 1 },
    { name: 'image', maxCount: 1 },
    { name: 'profilePhoto', maxCount: 1 },
  ])(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            message: `Image must be smaller than ${MAX_IMAGE_SIZE_MB}MB`,
          });
        }
      }

      return res.status(400).json({
        success: false,
        message: err.message || 'Invalid image upload',
      });
    }

    req.file = pickFirstUploadedFile(req);

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Profile photo is required',
      });
    }

    next();
  });
};

module.exports = {
  uploadRecipeImage,
  uploadProfilePhoto,
  MAX_IMAGE_SIZE_MB,
};
