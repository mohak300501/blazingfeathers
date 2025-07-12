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
    const adminEmails = process.env.VITE_ADMIN_EMAILS ? process.env.VITE_ADMIN_EMAILS.split(',').map(email => email.trim()) : ['admin@blazingfeathers.com'];
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
        await drive.files.delete({
          fileId: photoData.driveFileId,
          supportsAllDrives: true,
        });
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