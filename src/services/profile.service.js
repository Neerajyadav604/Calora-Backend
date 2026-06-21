const { admin } = require('../config/firebase');
const { calculateNutritionTargets } = require('../utils/nutritionCalculator');

const USERS_COLLECTION = 'users';

const toPlainObject = (value) => {
  if (!value || typeof value !== 'object') {
    return {};
  }

  return { ...value };
};

const getProfileRef = (uid) => {
  if (!uid) {
    throw new Error('User ID is required');
  }

  return admin.firestore().collection(USERS_COLLECTION).doc(uid);
};

const getProfile = async (uid) => {
  const snapshot = await getProfileRef(uid).get();

  if (!snapshot.exists) {
    return null;
  }

  return {
    id: snapshot.id,
    ...snapshot.data(),
  };
};

const ensureProfile = async (uid, fallback = {}) => {
  const ref = getProfileRef(uid);
  const snapshot = await ref.get();

  if (!snapshot.exists) {
    const initialProfile = {
      uid,
      email: fallback.email || '',
      name: fallback.name || '',
      photoURL: fallback.photoURL || '',
      photoUrl: fallback.photoURL || '',
      manualMacrosEnabled: false,
      macros: {
        protein: 0,
        carbs: 0,
        fats: 0,
      },
      targetCalories: 0,
      bmr: 0,
      tdee: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      ...toPlainObject(fallback.profile),
    };

    await ref.set(initialProfile, { merge: true });
    return {
      id: uid,
      ...initialProfile,
    };
  }

  return {
    id: snapshot.id,
    ...snapshot.data(),
  };
};

const mergeAuthAndProfile = (authUser, profile = {}) => {
  const currentProfile = toPlainObject(profile);

  return {
    uid: authUser.uid,
    email: authUser.email || currentProfile.email || '',
    name: authUser.name || currentProfile.name || '',
    photoURL: authUser.photoURL || currentProfile.photoURL || currentProfile.photoUrl || '',
    photoUrl: authUser.photoURL || currentProfile.photoURL || currentProfile.photoUrl || '',
    manualMacrosEnabled: Boolean(currentProfile.manualMacrosEnabled),
    targetCalories: currentProfile.targetCalories ?? 0,
    macros: currentProfile.macros || { protein: 0, carbs: 0, fats: 0 },
    bmr: currentProfile.bmr ?? 0,
    tdee: currentProfile.tdee ?? 0,
    ...currentProfile,
  };
};

const saveProfile = async (uid, updates, fallback = {}) => {
  const ref = getProfileRef(uid);
  const payload = {
    ...toPlainObject(updates),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  await ref.set(payload, { merge: true });

  const profile = await getProfile(uid);
  return mergeAuthAndProfile(fallback, profile || payload);
};

const updateManualMacroTargets = async (uid, body, fallback = {}) => {
  const targetCalories = Number(body.targetCalories);
  const protein = Number(body.protein);
  const carbs = Number(body.carbs);
  const fats = Number(body.fats);

  const update = {
    manualMacrosEnabled: true,
    targetCalories,
    macros: {
      protein,
      carbs,
      fats,
    },
  };

  await saveProfile(uid, update, fallback);
  return update;
};

const resetManualMacroTargets = async (uid, profile, fallback = {}) => {
  const calculated = calculateNutritionTargets(profile);

  const update = {
    manualMacrosEnabled: false,
    bmr: calculated.bmr,
    tdee: calculated.tdee,
    targetCalories: calculated.targetCalories,
    macros: calculated.macros,
  };

  await saveProfile(uid, update, fallback);
  return {
    ...update,
    calculated,
  };
};

const updateProfileAndRecalculate = async (uid, updates, existingProfile, fallback = {}) => {
  const nextProfile = {
    ...toPlainObject(existingProfile),
    ...toPlainObject(updates),
  };

  const profileUpdate = {
    ...toPlainObject(updates),
  };

  if (!nextProfile.manualMacrosEnabled) {
    const calculated = calculateNutritionTargets(nextProfile);
    profileUpdate.bmr = calculated.bmr;
    profileUpdate.tdee = calculated.tdee;
    profileUpdate.targetCalories = calculated.targetCalories;
    profileUpdate.macros = calculated.macros;
  }

  await saveProfile(uid, profileUpdate, fallback);
  return profileUpdate;
};

module.exports = {
  ensureProfile,
  getProfile,
  mergeAuthAndProfile,
  resetManualMacroTargets,
  saveProfile,
  updateManualMacroTargets,
  updateProfileAndRecalculate,
};
