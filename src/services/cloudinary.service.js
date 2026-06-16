// Firebase Storage is removed from the upload path.
// The backend now owns image hosting and pushes files to Cloudinary with a single reusable service.
const streamifier = require('streamifier');
const { cloudinary, cloudinaryConfig } = require('../config/cloudinary');

const isConfigured = cloudinaryConfig();

const uploadImage = (fileBuffer, options = {}) => {
  return new Promise((resolve, reject) => {
    if (!isConfigured) {
      return reject(new Error('Cloudinary is not configured'));
    }

    if (!fileBuffer || !Buffer.isBuffer(fileBuffer)) {
      return reject(new Error('A valid image buffer is required'));
    }

    const uploadOptions = {
      folder: 'recipes',
      resource_type: 'image',
      transformation: [
        { width: 1200, height: 1200, crop: 'limit', quality: 'auto:good', fetch_format: 'auto' },
      ],
      ...options,
    };

    const uploadStream = cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
      if (error) {
        return reject(error);
      }

      if (!result || !result.secure_url || !result.public_id) {
        return reject(new Error('Cloudinary upload returned an invalid response'));
      }

      resolve({
        secure_url: result.secure_url,
        public_id: result.public_id,
      });
    });

    streamifier.createReadStream(fileBuffer).pipe(uploadStream);
  });
};

const deleteImage = async (publicId) => {
  if (!isConfigured) {
    throw new Error('Cloudinary is not configured');
  }

  if (!publicId) {
    return null;
  }

  return cloudinary.uploader.destroy(publicId, {
    resource_type: 'image',
    invalidate: true,
  });
};

module.exports = {
  uploadImage,
  deleteImage,
};
