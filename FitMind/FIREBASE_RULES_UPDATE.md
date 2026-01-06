# 🔥 COMPLETE FIRESTORE RULES - FINAL VERSION

## ⚠️ IMPORTANT: Copy these rules to Firebase Console NOW

### Steps:
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: **fitmind-dba6a**
3. Click **Firestore Database** → **Rules** tab
4. **Replace ALL content** with the rules below
5. Click **Publish**

---

## 📋 Complete Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // ===== USERS COLLECTION (FOR USER PROFILES) =====
    // Allows users to create and manage their profiles
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // ===== USER FITNESS PROFILES =====
    match /userFitnessProfiles/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;

      match /{sub=**} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }

    // ===== REVIEWS COLLECTION =====
    match /reviews/{reviewId} {
      // Anyone can read reviews (they are public)
      allow read: if true;
      
      // Only authenticated users can create reviews
      allow create: if request.auth != null;
      
      // Only the author can update/delete their own review
      allow update, delete: if request.auth != null && 
        request.auth.uid == resource.data.userId;
    }

    // ===== ADMINS COLLECTION =====
    match /admins/{adminId} {
      // Allow users to read their own admin status (if document exists)
      allow read: if request.auth != null && request.auth.uid == adminId;
      // Only existing admins can write
      allow write: if false; 
    }

    // ===== CATCH-ALL (DENY EVERYTHING ELSE) =====
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

---

## 🔍 What Each Rule Does:

### 1. **users** Collection
- Users can read/write **only their own** profile document
- Used for: Registration, profile management

### 2. **userFitnessProfiles** Collection
- Users can read/write **only their own** fitness data
- Includes subcollections: food, exercise, mood, sleep, stress, weight entries
- Used for: Dashboard, tracking

### 3. **reviews** Collection ✨ NEW
- **Anyone can read** reviews (public)
- **Authenticated users can create** reviews
- **Only the author can edit/delete** their own reviews
- Used for: Reviews page

### 4. **admins** Collection
- Users can read their own admin status
- No one can write (admins must be set manually via Firebase Console)
- Used for: Admin guard

### 5. **Catch-all Rule**
- Denies access to any other collection
- Security by default

---

## ✅ After Updating Rules:

1. Reload your FitMind app (F5)
2. Navigate to Reviews page
3. Error should be gone! ✅
4. All other pages should also work without permission errors

---

**Current Status:** Rules updated in code, **MUST be published to Firebase Console**

