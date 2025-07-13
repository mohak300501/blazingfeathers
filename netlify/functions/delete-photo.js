let admin, google, db, drive;

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
  
  if (!google) {
    const { google: googleApi } = require('googleapis');
    google = googleApi;
    
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/drive'],
    });
    
    drive = google.drive({ version: 'v3', auth });
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
    
    const { birdId, photoId, userId } = JSON.parse(event.body);

    if (!birdId || !photoId || !userId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required fields' }),
      };
    }

    // Get photo data
    const photoDoc = await db.collection('birds').doc(birdId).collection('photos').doc(photoId).get();
    if (!photoDoc.exists) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Photo not found' }),
      };
    }

    const photoData = photoDoc.data();
    console.log('Photo data:', {
      photoId,
      driveFileId: photoData.driveFileId,
      url: photoData.url,
      uploadedBy: photoData.uploadedBy
    });

    // Check permissions (only admin or photo owner can delete)
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

    if (!isAdmin && photoData.uploadedBy !== userId) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Permission denied' }),
      };
    }

    // Delete from Google Drive
    if (photoData.driveFileId) {
      try {
        // Use the file ID as-is - don't clean it
        const fileId = photoData.driveFileId;
        console.log('File ID:', fileId);
        console.log('Deleting file from Google Drive:', fileId);
        
        // Get access token using the same auth setup as other functions
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
        
        // Use https module directly for better control
        const https = require('https');
        
        // Get shared drive ID if available
        const sharedDriveId = process.env.GOOGLE_DRIVE_SHARED_DRIVE_ID;
        
        // First, try to get file info to check if we have access
        const fileInfoResponse = await new Promise((resolve, reject) => {
          const options = {
            hostname: 'www.googleapis.com',
            path: `/drive/v3/files/${fileId}?fields=id,name,parents&supportsAllDrives=true`,
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${accessToken.token}`,
            }
          };

          const req = https.request(options, (res) => {
            console.log('File info response status:', res.statusCode);
            
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
              if (res.statusCode >= 200 && res.statusCode < 300) {
                try {
                  const fileInfo = JSON.parse(data);
                  console.log('File info:', fileInfo);
                  resolve(fileInfo);
                } catch (parseError) {
                  reject(new Error(`Failed to parse file info: ${parseError.message}`));
                }
              } else {
                console.error('File info error:', res.statusCode, data);
                reject(new Error(`File info failed: ${res.statusCode} - ${data}`));
              }
            });
          });

          req.on('error', reject);
          req.end();
        });
        
        console.log('Successfully accessed file info, proceeding with deletion...');
        
        // First, add the service account as owner of the file
        console.log('Adding service account as owner...');
        
        const permissionResponse = await new Promise((resolve, reject) => {
          const permissionOptions = {
            hostname: 'www.googleapis.com',
            path: `/drive/v3/files/${fileId}/permissions?supportsAllDrives=true&transferOwnership=true`,
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken.token}`,
              'Content-Type': 'application/json',
            }
          };

          const permissionData = {
            role: 'owner',
            type: 'user',
            emailAddress: process.env.FIREBASE_CLIENT_EMAIL
          };

          const req = https.request(permissionOptions, (res) => {
            console.log('Permission response status:', res.statusCode);
            
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
              if (res.statusCode >= 200 && res.statusCode < 300) {
                console.log('Service account added as owner');
                resolve();
              } else {
                console.log('Permission setting failed (continuing anyway):', res.statusCode, data);
                resolve(); // Continue even if permission setting fails
              }
            });
          });

          req.on('error', (error) => {
            console.error('Permission request error:', error);
            resolve(); // Continue even if permission setting fails
          });

          req.write(JSON.stringify(permissionData));
          req.end();
        });
        
        // Now delete the file
        console.log('Deleting file...');
        
        const deleteResponse = await new Promise((resolve, reject) => {
          const options = {
            hostname: 'www.googleapis.com',
            path: `/drive/v3/files/${fileId}?supportsAllDrives=true`,
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${accessToken.token}`,
            }
          };

          const req = https.request(options, (res) => {
            console.log('Delete response status:', res.statusCode);
            
            if (res.statusCode >= 200 && res.statusCode < 300) {
              console.log('File deleted successfully');
              resolve();
            } else if (res.statusCode === 404) {
              console.log('File not found (may have been deleted already)');
              resolve();
            } else {
              let errorData = '';
              res.on('data', (chunk) => errorData += chunk);
              res.on('end', () => {
                console.error('Delete error:', res.statusCode, errorData);
                reject(new Error(`Delete failed: ${res.statusCode} - ${errorData}`));
              });
            }
          });

          req.on('error', (error) => {
            console.error('Delete request error:', error);
            reject(error);
          });

          req.end();
        });
        
        console.log('Google Drive deletion completed');
      } catch (driveError) {
        console.error('Error deleting from Drive:', driveError);
        // Continue with Firestore deletion even if Drive deletion fails
      }
    }

    // Delete from Firestore
    await db.collection('birds').doc(birdId).collection('photos').doc(photoId).delete();

    // Update bird's photo count
    await db.collection('birds').doc(birdId).update({
      photoCount: admin.firestore.FieldValue.increment(-1),
    });

    // If this was the featured photo, update it
    const birdDoc = await db.collection('birds').doc(birdId).get();
    const birdData = birdDoc.data();
    if (birdData.featuredPhoto === photoData.url) {
      // Get the next photo to set as featured
      const photosSnapshot = await db.collection('birds').doc(birdId).collection('photos')
        .orderBy('uploadedAt', 'desc')
        .limit(1)
        .get();

      if (!photosSnapshot.empty) {
        const nextPhoto = photosSnapshot.docs[0].data();
        await db.collection('birds').doc(birdId).update({
          featuredPhoto: nextPhoto.url,
        });
      } else {
        // No more photos, remove featured photo
        await db.collection('birds').doc(birdId).update({
          featuredPhoto: admin.firestore.FieldValue.delete(),
        });
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true }),
    };

  } catch (error) {
    console.error('Error deleting photo:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
}; 