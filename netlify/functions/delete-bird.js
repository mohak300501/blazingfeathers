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
    google = require('googleapis');
    
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
    
    const { birdId, userId } = JSON.parse(event.body);

    if (!birdId || !userId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required fields' }),
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
        body: JSON.stringify({ error: 'Admin privileges required' }),
      };
    }

    // Get all photos for this bird
    const photosSnapshot = await db.collection('birds').doc(birdId).collection('photos').get();
    const photos = [];
    photosSnapshot.forEach(doc => {
      photos.push({ id: doc.id, ...doc.data() });
    });

    // Delete all photos from Google Drive
    for (const photo of photos) {
      if (photo.driveFileId) {
        try {
          await drive.files.delete({
            fileId: photo.driveFileId,
          });
        } catch (driveError) {
          console.error('Error deleting photo from Drive:', driveError);
          // Continue with other deletions even if one fails
        }
      }
    }

    // Delete all photos from Firestore
    const batch = db.batch();
    photosSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    // Delete the bird document
    batch.delete(db.collection('birds').doc(birdId));

    // Commit the batch
    await batch.commit();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true,
        deletedPhotos: photos.length,
      }),
    };

  } catch (error) {
    console.error('Error deleting bird:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
}; 