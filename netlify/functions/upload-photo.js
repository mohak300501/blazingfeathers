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
    
    // Parse multipart form data
    const formData = event.body;
    const boundary = event.headers['content-type'].split('boundary=')[1];
    const parts = formData.split(`--${boundary}`);
    
    let photoFile = null;
    let birdId = null;
    let userId = null;
    let userEmail = null;
    let location = null;
    let dateOfCapture = null;

    for (const part of parts) {
      if (part.includes('Content-Disposition: form-data')) {
        const lines = part.split('\r\n');
        const contentDisposition = lines.find(line => line.startsWith('Content-Disposition: form-data'));
        
        if (contentDisposition) {
          const nameMatch = contentDisposition.match(/name="([^"]+)"/);
          if (nameMatch) {
            const name = nameMatch[1];
            const value = lines.slice(3).join('\r\n').trim();
            
            if (name === 'photo') {
              // Extract file data
              const contentTypeMatch = lines.find(line => line.startsWith('Content-Type:'));
              const contentType = contentTypeMatch ? contentTypeMatch.split(': ')[1] : 'image/jpeg';
              
              photoFile = {
                data: value,
                contentType: contentType,
                name: `bird_${Date.now()}.jpg`
              };
            } else if (name === 'birdId') {
              birdId = value;
            } else if (name === 'userId') {
              userId = value;
            } else if (name === 'userEmail') {
              userEmail = value;
            } else if (name === 'location') {
              location = value;
            } else if (name === 'dateOfCapture') {
              dateOfCapture = value;
            }
          }
        }
      }
    }

    if (!photoFile || !birdId || !userId || !location || !dateOfCapture) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required fields' }),
      };
    }

    // Get user data
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'User not found' }),
      };
    }
    const userData = userDoc.data();
    const username = userData.username;

    // Upload to Google Drive
    const fileMetadata = {
      name: photoFile.name,
      parents: [process.env.GOOGLE_DRIVE_FOLDER_ID],
    };

    const media = {
      mimeType: photoFile.contentType,
      body: Buffer.from(photoFile.data, 'base64'),
    };

    const file = await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: 'id,webViewLink',
    });

    // Generate public URL
    const fileId = file.data.id;
    const publicUrl = `https://drive.google.com/uc?export=view&id=${fileId}`;

    // Save to Firestore
    const photoRef = await db.collection('birds').doc(birdId).collection('photos').add({
      url: publicUrl,
      driveFileId: fileId,
      location: location,
      dateOfCapture: new Date(dateOfCapture),
      uploadedBy: userId,
      uploadedByUsername: username,
      uploadedAt: new Date(),
    });

    // Update bird's photo count
    await db.collection('birds').doc(birdId).update({
      photoCount: admin.firestore.FieldValue.increment(1),
    });

    // Set featured photo if it's the first one
    const birdDoc = await db.collection('birds').doc(birdId).get();
    const birdData = birdDoc.data();
    if (!birdData.featuredPhoto) {
      await db.collection('birds').doc(birdId).update({
        featuredPhoto: publicUrl,
      });
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        photoId: photoRef.id,
        url: publicUrl,
        location: location,
        dateOfCapture: dateOfCapture,
        username: username,
      }),
    };

  } catch (error) {
    console.error('Error uploading photo:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
}; 