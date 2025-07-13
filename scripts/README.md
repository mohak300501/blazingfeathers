# Migration Scripts

## Adding CommonCode to Existing Birds

To add `commonCode` to existing birds in your database, follow these steps:

1. **Get your Firebase service account key:**
   - Go to Firebase Console → Project Settings → Service Accounts
   - Click "Generate new private key"
   - Download the JSON file
   - Rename it to `serviceAccountKey.json` and place it in the project root

2. **Run the migration script:**
   ```bash
   cd scripts
   node addCommonCodes.js
   ```

3. **Verify the results:**
   - Check the Admin Panel to see the commonCode column populated
   - Test the new URL format: `/bird/{commonCode}`

**Note:** This script only needs to be run once. After running it, all existing birds will have a `commonCode` field, and new birds will automatically get one when added through the Admin Panel. 