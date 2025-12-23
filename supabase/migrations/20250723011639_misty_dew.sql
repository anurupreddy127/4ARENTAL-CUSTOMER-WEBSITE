/*
  # Add security rules for offers collection
  
  This file contains the Firestore security rules that need to be applied to your Firebase project.
  
  1. Security Rules
    - Allow admin users to read/write offers
    - Allow authenticated users to read active offers
    - Deny access to unauthenticated users
  
  Note: These rules need to be manually applied in your Firebase Console:
  1. Go to Firebase Console > Firestore Database > Rules
  2. Add these rules to your firestore.rules file
*/

-- FIRESTORE SECURITY RULES (Apply these in Firebase Console)
-- 
-- rules_version = '2';
-- service cloud.firestore {
--   match /databases/{database}/documents {
--     // Existing rules for other collections...
--     
--     // Offers collection rules
--     match /offers/{offerId} {
--       // Allow admin to read and write all offers
--       allow read, write: if request.auth != null && request.auth.token.email == 'admin@4arentals.com';
--       
--       // Allow authenticated users to read only active offers
--       allow read: if request.auth != null && resource.data.active == true;
--     }
--   }
-- }

-- Since this is a Firestore rules issue, you need to:
-- 1. Copy the rules above (without the -- comments)
-- 2. Go to Firebase Console > Firestore Database > Rules
-- 3. Add the offers rules to your existing firestore.rules file
-- 4. Publish the rules

-- Example complete rules file:
-- rules_version = '2';
-- service cloud.firestore {
--   match /databases/{database}/documents {
--     match /vehicles/{vehicleId} {
--       allow read: if true;
--       allow write: if request.auth != null && request.auth.token.email == 'admin@4arentals.com';
--     }
--     
--     match /bookings/{bookingId} {
--       allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
--       allow read, write: if request.auth != null && request.auth.token.email == 'admin@4arentals.com';
--     }
--     
--     match /contacts/{contactId} {
--       allow create: if true;
--       allow read: if request.auth != null && request.auth.token.email == 'admin@4arentals.com';
--     }
--     
--     match /offers/{offerId} {
--       allow read, write: if request.auth != null && request.auth.token.email == 'admin@4arentals.com';
--       allow read: if request.auth != null && resource.data.active == true;
--     }
--   }
-- }