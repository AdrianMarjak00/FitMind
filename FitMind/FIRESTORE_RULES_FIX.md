# 🔥 FIX: Firebase Security Rules Update

## 🐛 Problem Identified

The registration fails with "Missing or insufficient permissions" because:
- The app writes user profiles to the `users/{userId}` collection
- But Firebase security rules only allow writes to `userFitnessProfiles/{userId}` collection
- **The `users` collection has NO write permissions configured**

## ✅ Solution: Update Firestore Security Rules

### Option 1: Using Firebase Console (Recommended)

1. Open [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **fitmind-dba6a**
3. Go to **Firestore Database** (in left menu)
4. Click on the **Rules** tab
5. **Replace** all existing rules with the contents of `firestore.rules` file in this project
6. Click **Publish** button

### Option 2: Using Firebase CLI

If you have Firebase CLI installed:

```bash
# Install Firebase CLI (if not installed)
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firestore (if not already)
firebase init firestore

# Deploy the rules
firebase deploy --only firestore:rules
```

## 🔍 What Changed

### Before (Missing Rules):
```javascript
// ❌ No rules for 'users' collection
match /userFitnessProfiles/{userId} {
  allow read, write: if request.auth != null && request.auth.uid == userId;
}
```

### After (Complete Rules):
```javascript
// ✅ Rules added for 'users' collection
match /users/{userId} {
  allow create: if request.auth != null && request.auth.uid == userId;
  allow read, update: if request.auth != null && request.auth.uid == userId;
  allow delete: if false;  // Prevent accidental deletion
}

// Plus rules for userFitnessProfiles, admins, reviews, etc.
```

## 🧪 Testing After Update

1. After publishing the rules in Firebase Console
2. Try registering a new user again
3. Registration should now work without permission errors ✅

## 📝 Key Points

- Users can **create** their profile during registration
- Users can **read/update** only their own profile
- Users **cannot delete** their profiles (safety measure)
- Admin email can read everything
- Reviews are publicly readable but only editable by the author

---

**Next Steps:** Update the rules in Firebase Console, then test registration again!

