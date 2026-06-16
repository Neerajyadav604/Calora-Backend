const { admin } = require('../config/firebase');
const { uploadImage, deleteImage } = require('../services/cloudinary.service');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const logger = require('../utils/logger');

// ─── Sync user with backend ───────────────────────────────────
// POST /api/v1/users/sync
// Called right after Firebase register or login
const syncUser = async (req, res) => {
  try {
    const { uid, email, name } = req.user; // set by auth middleware
    const userRecord = await admin.auth().getUser(uid);

    logger.info(`User synced: ${email}`);

    return successResponse(res, 200, 'User synced successfully', {
      uid,
      email,
      name,
      photoURL: userRecord.photoURL || req.user.photoURL || '',
      photoUrl: userRecord.photoURL || req.user.photoURL || '',
    });

  } catch (error) {
    logger.error(`syncUser error: ${error.message}`);
    return errorResponse(res, 500, 'Failed to sync user');
  }
};

// ─── Get user profile ─────────────────────────────────────────
// GET /api/v1/users/profile
const getProfile = async (req, res) => {
  try {
    const { uid, email, name } = req.user;
    const userRecord = await admin.auth().getUser(uid);

    return successResponse(res, 200, 'Profile fetched', {
      uid,
      email,
      name,
      photoURL: userRecord.photoURL || req.user.photoURL || '',
      photoUrl: userRecord.photoURL || req.user.photoURL || '',
    });

  } catch (error) {
    logger.error(`getProfile error: ${error.message}`);
    return errorResponse(res, 500, 'Failed to fetch profile');
  }
};

// POST /api/v1/users/profile-photo
// Uploads a new avatar to Cloudinary, then stores the public URL on the Firebase Auth user record.
const updateProfilePhoto = async (req, res) => {
  let uploadedImage = null;

  try {
    if (!req.file || !req.file.buffer) {
      return errorResponse(res, 400, 'Profile photo is required');
    }

    uploadedImage = await uploadImage(req.file.buffer, {
      folder: 'profile-photos',
      transformation: [
        { width: 512, height: 512, crop: 'fill', gravity: 'face', quality: 'auto:good', fetch_format: 'auto' },
      ],
    });

    await admin.auth().updateUser(req.user.uid, {
      photoURL: uploadedImage.secure_url,
    });

    logger.info(`Profile photo updated for ${req.user.email}`);

    const photoURL = uploadedImage.secure_url;

    return res.status(200).json({
      success: true,
      message: 'Profile photo updated',
      photoURL,
      photoUrl: photoURL,
      data: {
        photoURL,
        photoUrl: photoURL,
        cloudinaryPublicId: uploadedImage.public_id,
      },
    });
  } catch (error) {
    if (uploadedImage?.public_id) {
      await deleteImage(uploadedImage.public_id).catch(() => null);
    }

    logger.error(`updateProfilePhoto error: ${error.message}`);
    return errorResponse(res, 500, 'Failed to update profile photo');
  }
};

module.exports = { syncUser, getProfile, updateProfilePhoto };
