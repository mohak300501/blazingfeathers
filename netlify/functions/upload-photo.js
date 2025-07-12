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
    
    // Parse multipart form data
    let formData = event.body;
    console.log('Content-Type:', event.headers['content-type']);
    console.log('Body length:', formData.length);
    console.log('Body preview:', formData.substring(0, 500));
    
    // Check if body is base64 encoded
    if (formData.startsWith('LS0tLS0t')) {
      console.log('Detected base64 encoded body, decoding...');
      formData = Buffer.from(formData, 'base64').toString('utf8');
      console.log('Decoded body preview:', formData.substring(0, 500));
    }
    
    let boundary = event.headers['content-type'].split('boundary=')[1];
    // Remove quotes if present
    if (boundary && boundary.startsWith('"') && boundary.endsWith('"')) {
      boundary = boundary.slice(1, -1);
    }
    console.log('Boundary:', boundary);
    
    const parts = formData.split(`--${boundary}`);
    console.log('Number of parts:', parts.length);
    
    let photoFile = null;
    let birdId = null;
    let userId = null;
    let location = null;
    let dateOfCapture = null;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i].trim();
      if (!part || part === '--') continue; // Skip empty parts
      
      console.log(`Part ${i}:`, part.substring(0, 200) + '...');
      
      if (part.includes('Content-Disposition: form-data')) {
        console.log(`Processing part ${i} with Content-Disposition`);
        const lines = part.split('\r\n');
        const contentDisposition = lines.find(line => line.startsWith('Content-Disposition: form-data'));
        
        if (contentDisposition) {
          const nameMatch = contentDisposition.match(/name="([^"]+)"/);
          if (nameMatch) {
            const name = nameMatch[1];
            console.log('Found field:', name, 'in part:', i);
            
            // Get the value after the headers
            const headerEndIndex = part.indexOf('\r\n\r\n');
            console.log('Header end index:', headerEndIndex, 'for field:', name);
            if (headerEndIndex !== -1) {
              const value = part.substring(headerEndIndex + 4).trim();
              console.log('Value length for', name, ':', value.length);
              
              if (name === 'photo') {
                // Extract file data
                const contentTypeMatch = lines.find(line => line.startsWith('Content-Type:'));
                const contentType = contentTypeMatch ? contentTypeMatch.split(': ')[1] : 'image/jpeg';
                
                // Convert to base64 if not already
                let base64Data = value;
                if (!value.includes(';base64,')) {
                  base64Data = Buffer.from(value, 'binary').toString('base64');
                }
                
                photoFile = {
                  data: base64Data,
                  contentType: contentType,
                  name: `bird_${Date.now()}.jpg`
                };
                console.log('Photo file found, size:', value.length, 'base64 size:', base64Data.length);
              } else if (name === 'birdId') {
                birdId = value;
                console.log('BirdId:', birdId);
              } else if (name === 'userId') {
                userId = value;
                console.log('UserId:', userId);
              } else if (name === 'location') {
                location = value;
                console.log('Location:', location);
              } else if (name === 'dateOfCapture') {
                dateOfCapture = value;
                console.log('DateOfCapture:', dateOfCapture);
              }
            }
          }
        }
      }
    }

    if (!photoFile || !birdId || !userId || !location || !dateOfCapture) {
      console.error('Missing fields:', { photoFile: !!photoFile, birdId, userId, location, dateOfCapture });
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
      supportsAllDrives: true,
    };

    console.log('Uploading to Google Drive:', { 
      folderId: process.env.GOOGLE_DRIVE_FOLDER_ID,
      sharedDriveId: process.env.GOOGLE_DRIVE_SHARED_DRIVE_ID,
      fileName: photoFile.name,
      contentType: photoFile.contentType 
    });

    // Convert base64 to buffer
    const fileBuffer = Buffer.from(photoFile.data, 'base64');
    console.log('File buffer size:', fileBuffer.length);

    console.log('Starting Google Drive upload...');
    const file = await drive.files.create({
      resource: fileMetadata,
      media: {
        mimeType: photoFile.contentType,
        body: fileBuffer,
      },
      fields: 'id,webViewLink',
      supportsAllDrives: true,
    });
    console.log('Google Drive upload successful, file ID:', file.data.id);

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