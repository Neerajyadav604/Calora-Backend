const express = require('express');
const router  = express.Router();

const { syncUser, getProfile, updateProfilePhoto } = require('../controllers/userController');
const { protect } = require('../middlewares/auth');
const { uploadProfilePhoto } = require('../middlewares/upload.middleware');

// All user routes are protected — need Firebase token
router.post('/sync',    protect, syncUser);
router.get('/profile',  protect, getProfile);
router.post('/profile-photo', protect, uploadProfilePhoto, updateProfilePhoto);
router.put('/profile-photo', protect, uploadProfilePhoto, updateProfilePhoto);

module.exports = router;
