const { admin } = require('../config/firebase');
const { uploadImage, deleteImage } = require('../services/cloudinary.service');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const logger = require('../utils/logger');
const {
  ensureProfile,
  getProfile: getStoredProfile,
  mergeAuthAndProfile,
  resetManualMacroTargets,
  updateManualMacroTargets,
  updateProfileAndRecalculate,
} = require('../services/profile.service');

// ─── Sync user with backend ───────────────────────────────────
// POST /api/v1/users/sync
// Called right after Firebase register or login
const syncUser = async (req, res) => {
  try {
    const { uid, email, name } = req.user; // set by auth middleware
    const userRecord = await admin.auth().getUser(uid);
    const profile = await ensureProfile(uid, {
      email,
      name,
      photoURL: userRecord.photoURL || req.user.photoURL || '',
    });

    logger.info(`User synced: ${email}`);

    return successResponse(res, 200, 'User synced successfully', {
      uid,
      email,
      name,
      photoURL: userRecord.photoURL || req.user.photoURL || '',
      photoUrl: userRecord.photoURL || req.user.photoURL || '',
      ...mergeAuthAndProfile(req.user, profile),
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
    const profile = await ensureProfile(uid, {
      email,
      name,
      photoURL: userRecord.photoURL || req.user.photoURL || '',
    });

    return successResponse(res, 200, 'Profile fetched', {
      uid,
      email,
      name,
      photoURL: userRecord.photoURL || req.user.photoURL || '',
      photoUrl: userRecord.photoURL || req.user.photoURL || '',
      ...mergeAuthAndProfile(req.user, profile),
    });

  } catch (error) {
    logger.error(`getProfile error: ${error.message}`);
    return errorResponse(res, 500, 'Failed to fetch profile');
  }
};

const updateProfile = async (req, res) => {
  try {
    const { uid, email, name, photoURL } = req.user;
    const currentProfile = await ensureProfile(uid, { email, name, photoURL });
    const { manualMacrosEnabled, targetCalories, macros, ...safeUpdates } = req.body;
    const updated = await updateProfileAndRecalculate(uid, safeUpdates, currentProfile, {
      uid,
      email,
      name,
      photoURL,
    });

    logger.info(`Profile updated for ${email}`);

    return successResponse(res, 200, 'Profile updated', {
      ...mergeAuthAndProfile(req.user, {
        ...currentProfile,
        ...updated,
      }),
    });
  } catch (error) {
    logger.error(`updateProfile error: ${error.message}`);
    return errorResponse(res, error.statusCode || 500, error.message || 'Failed to update profile');
  }
};

const updateManualMacros = async (req, res) => {
  try {
    const { uid, email, name, photoURL } = req.user;
    await ensureProfile(uid, { email, name, photoURL });
    await updateManualMacroTargets(uid, req.body, { uid, email, name, photoURL });
    const updatedProfile = await getStoredProfile(uid);

    logger.info(`Manual macros updated for ${email}`);

    return successResponse(res, 200, 'Manual macro targets saved', mergeAuthAndProfile(req.user, updatedProfile));
  } catch (error) {
    logger.error(`updateManualMacros error: ${error.message}`);
    return errorResponse(res, error.statusCode || 500, error.message || 'Failed to save manual macro targets');
  }
};

const resetManualMacros = async (req, res) => {
  try {
    const { uid, email, name, photoURL } = req.user;
    const currentProfile = await ensureProfile(uid, { email, name, photoURL });
    const result = await resetManualMacroTargets(uid, currentProfile, { uid, email, name, photoURL });
    const updatedProfile = await getStoredProfile(uid);

    logger.info(`Manual macros reset for ${email}`);

    return successResponse(res, 200, 'Manual macro targets reset', {
      ...mergeAuthAndProfile(req.user, updatedProfile),
      recalculated: {
        bmr: result.calculated.bmr,
        tdee: result.calculated.tdee,
        targetCalories: result.calculated.targetCalories,
        macros: result.calculated.macros,
      },
    });
  } catch (error) {
    logger.error(`resetManualMacros error: ${error.message}`);
    return errorResponse(res, error.statusCode || 500, error.message || 'Failed to reset macro targets');
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

module.exports = {
  syncUser,
  getProfile,
  updateProfile,
  updateManualMacros,
  resetManualMacros,
  updateProfilePhoto,
};
