/*
  # Firebase Firestore Security Rules for Offers Collection
  
  IMPORTANT: These rules must be manually applied in your Firebase Console!
  
  1. Go to Firebase Console (https://console.firebase.google.com)
  2. Select your project
  3. Navigate to Firestore Database > Rules
  4. Copy the rules below and add them to your firestore.rules file
  5. Click "Publish" to apply the changes
  
  ## Rules to Add:
  
  Add this inside your existing rules_version = '2'; service cloud.firestore block:
*/

-- COPY THESE RULES TO YOUR FIREBASE CONSOLE:
-- 
-- rules_version = '2';
-- service cloud.firestore {
--   match /databases/{database}/documents {
--     
--     // ===== OFFERS COLLECTION RULES =====
--     match /offers/{offerId} {
--       // Allow everyone to read active offers (for public website)
--       allow read: if resource.data.active == true;
--       
--       // Allow admin to read and write all offers
--       allow read, write: if request.auth != null && 
--         request.auth.token.email == 'admin@4arentals.com';
--     }
--     
--     // ===== YOUR EXISTING RULES (keep these) =====
--     match /vehicles/{vehicleId} {
--       allow read: if true;
--       allow write: if request.auth != null && 
--         request.auth.token.email == 'admin@4arentals.com';
--     }
--     
--     match /bookings/{bookingId} {
--       allow read, write: if request.auth != null && 
--         request.auth.uid == resource.data.userId;
--       allow read, write: if request.auth != null && 
--         request.auth.token.email == 'admin@4arentals.com';
--     }
--     
--     match /contacts/{contactId} {
--       allow create: if true;
--       allow read: if request.auth != null && 
--         request.auth.token.email == 'admin@4arentals.com';
--     }
--   }
-- }

-- ========================================
-- STEP-BY-STEP INSTRUCTIONS:
-- ========================================
-- 
-- 1. Open Firebase Console: https://console.firebase.google.com
-- 2. Select your 4A Rentals project
-- 3. Click "Firestore Database" in the left sidebar
-- 4. Click "Rules" tab at the top
-- 5. You should see your existing rules file
-- 6. Add the offers rules section (lines 15-22 above) to your existing rules
-- 7. Make sure it's inside the "match /databases/{database}/documents" block
-- 8. Click "Publish" button to save and apply the rules
-- 
-- Your final rules file should look like the complete example above.
-- 
-- ========================================
-- TROUBLESHOOTING:
-- ========================================
-- 
-- If you still get permission errors after applying rules:
-- 1. Check that offers in your Firestore have "active: true" field
-- 2. Verify rules are published (green checkmark in Firebase Console)
-- 3. Try refreshing your website after 1-2 minutes
-- 4. Check browser console for any other error messages
-- 
-- The key change: We now allow public read access to active offers
-- without requiring authentication, which matches how your website works.