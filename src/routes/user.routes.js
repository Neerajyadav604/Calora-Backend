const express = require('express');
const router  = express.Router();

const {
  syncUser,
  getProfile,
  updateProfile,
  updateManualMacros,
  resetManualMacros,
  updateProfilePhoto,
} = require('../controllers/userController');
const { protect } = require('../middlewares/auth');
const { uploadProfilePhoto } = require('../middlewares/upload.middleware');
const { validateManualMacroTargets, validateProfileUpdate } = require('../middlewares/profile.validation');

// All user routes are protected — need Firebase token
router.post('/sync',    protect, syncUser);
router.get('/profile',  protect, getProfile);
router.put('/profile', protect, validateProfileUpdate, updateProfile);
router.post('/profile/macros', protect, validateManualMacroTargets, updateManualMacros);
router.post('/profile/macros/reset', protect, resetManualMacros);
router.post('/profile-photo', protect, uploadProfilePhoto, updateProfilePhoto);
router.put('/profile-photo', protect, uploadProfilePhoto, updateProfilePhoto);

module.exports = router;
