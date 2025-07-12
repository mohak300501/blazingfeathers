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

    console.log('Starting file ID cleanup...');

    // Get all birds
    const birdsSnapshot = await db.collection('birds').get();
    let totalPhotos = 0;
    let fixedPhotos = 0;
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
          const originalFileId = photoData.driveFileId;
          const cleanFileId = originalFileId.trim().replace(/[^a-zA-Z0-9_-]/g, '');

          if (originalFileId !== cleanFileId) {
            console.log(`Fixing file ID for photo ${photoId}: "${originalFileId}" -> "${cleanFileId}"`);
            
            try {
              await db.collection('birds').doc(birdId).collection('photos').doc(photoId).update({
                driveFileId: cleanFileId
              });
              fixedPhotos++;
            } catch (error) {
              console.error(`Error fixing photo ${photoId}:`, error);
              errors.push(`Photo ${photoId}: ${error.message}`);
            }
          }
        }
      }
    }

    console.log(`File ID cleanup completed. Total photos: ${totalPhotos}, Fixed: ${fixedPhotos}, Errors: ${errors.length}`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        totalPhotos,
        fixedPhotos,
        errors
      }),
    };

  } catch (error) {
    console.error('Error fixing file IDs:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error', details: error.message }),
    };
  }
}; 