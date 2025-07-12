let admin, db;

// Lazy load dependencies to reduce memory usage
async function initializeDependencies() {
  if (!admin) {
    admin = require('firebase-admin');
    
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
      });
    }
    
    db = admin.firestore();
  }
}

exports.handler = async (event, context) => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    // Initialize dependencies
    await initializeDependencies();
    
    const { userId } = JSON.parse(event.body);

    if (!userId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing userId' }),
      };
    }

    // Check if user is admin
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'User not found' }),
      };
    }

    const userData = userDoc.data();
    const adminEmails = process.env.ADMIN_EMAILS ? process.env.ADMIN_EMAILS.split(',').map(email => email.trim()) : ['admin@blazingfeathers.com'];
    const isAdmin = adminEmails.includes(userData.email);

    if (!isAdmin) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Admin access required' }),
      };
    }

    console.log('Starting file permissions fix...');

    // Initialize Google Drive API
    const { google: googleApi } = require('googleapis');
    
    const auth = new googleApi.auth.GoogleAuth({
      credentials: {
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/drive'],
    });

    const authClient = await auth.getClient();
    const accessToken = await authClient.getAccessToken();
    const https = require('https');

    // Get all birds
    const birdsSnapshot = await db.collection('birds').get();
    let totalPhotos = 0;
    let fixedPermissions = 0;
    let errors = [];

    for (const birdDoc of birdsSnapshot.docs) {
      const birdId = birdDoc.id;
      console.log(`Processing bird: ${birdId}`);

      // Get all photos for this bird
      const photosSnapshot = await db.collection('birds').doc(birdId).collection('photos').get();
      
      for (const photoDoc of photosSnapshot.docs) {
        const photoId = photoDoc.id;
        const photoData = photoDoc.data();
        totalPhotos++;

        if (photoData.driveFileId) {
          const fileId = photoData.driveFileId.trim().replace(/[^a-zA-Z0-9_-]/g, '');
          
          try {
            console.log(`Fixing permissions for photo ${photoId}, file ${fileId}`);
            
            // Set explicit permissions for the service account
            const permissionResponse = await new Promise((resolve, reject) => {
              const permissionOptions = {
                hostname: 'www.googleapis.com',
                path: `/drive/v3/files/${fileId}/permissions?supportsAllDrives=true`,
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${accessToken.token}`,
                  'Content-Type': 'application/json',
                }
              };

              const permissionData = {
                role: 'writer',
                type: 'user',
                emailAddress: process.env.FIREBASE_CLIENT_EMAIL
              };

              const req = https.request(permissionOptions, (res) => {
                console.log(`Permission response for ${fileId}:`, res.statusCode);
                
                let data = '';
                res.on('data', (chunk) => data += chunk);
                res.on('end', () => {
                  if (res.statusCode >= 200 && res.statusCode < 300) {
                    console.log(`Permission set successfully for ${fileId}`);
                    resolve();
                  } else {
                    console.error(`Permission setting failed for ${fileId}:`, res.statusCode, data);
                    reject(new Error(`Permission setting failed: ${res.statusCode} - ${data}`));
                  }
                });
              });

              req.on('error', reject);
              req.write(JSON.stringify(permissionData));
              req.end();
            });
            
            fixedPermissions++;
          } catch (error) {
            console.error(`Error fixing permissions for photo ${photoId}:`, error);
            errors.push(`Photo ${photoId}: ${error.message}`);
          }
        }
      }
    }

    console.log(`File permissions fix completed. Total photos: ${totalPhotos}, Fixed: ${fixedPermissions}, Errors: ${errors.length}`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        totalPhotos,
        fixedPermissions,
        errors
      }),
    };

  } catch (error) {
    console.error('Error fixing file permissions:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error', details: error.message }),
    };
  }
}; 