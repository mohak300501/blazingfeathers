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
    
    const { fileData, fileName, contentType, birdId, userId, location, dateOfCapture } = JSON.parse(event.body);

    if (!fileData || !fileName || !contentType || !birdId || !userId || !location || !dateOfCapture) {
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

    // Use a different approach - store the file data in Firestore temporarily
    // and create a separate function to process it
    const tempFileRef = await db.collection('temp_uploads').add({
      fileData: fileData,
      fileName: fileName,
      contentType: contentType,
      birdId: birdId,
      userId: userId,
      location: location,
      dateOfCapture: dateOfCapture,
      username: username,
      createdAt: new Date(),
      processed: false
    });

    // Trigger the actual upload process
    // For now, we'll process it directly here, but this could be a separate function
    const google = require('googleapis');
    const { google: googleApi } = google;
    
    const auth = new googleApi.auth.GoogleAuth({
      credentials: {
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/drive'],
    });
    
    const drive = googleApi.drive({ version: 'v3', auth });

    // Convert base64 to buffer
    const fileBuffer = Buffer.from(fileData, 'base64');
    console.log('File buffer size:', fileBuffer.length);

    // Create file metadata
    const fileMetadata = {
      name: fileName,
      parents: [process.env.GOOGLE_DRIVE_FOLDER_ID],
      supportsAllDrives: true,
    };

    console.log('Uploading to Google Drive via proxy...');

    // Get access token
    const authClient = await auth.getClient();
    const accessToken = await authClient.getAccessToken();
    
    // Use https module directly to avoid library issues
    const https = require('https');
    
    // Create multipart form data manually
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
    const multipartBody = Buffer.concat([
      Buffer.from(`--${boundary}\r\n`),
      Buffer.from('Content-Type: application/json; charset=UTF-8\r\n\r\n'),
      Buffer.from(JSON.stringify(fileMetadata)),
      Buffer.from(`\r\n--${boundary}\r\n`),
      Buffer.from(`Content-Type: ${contentType}\r\n\r\n`),
      fileBuffer,
      Buffer.from(`\r\n--${boundary}--\r\n`)
    ]);

    console.log('Making direct HTTPS request to Google Drive API...');

    // Make direct HTTPS request
    const response = await new Promise((resolve, reject) => {
      const options = {
        hostname: 'www.googleapis.com',
        path: '/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink&supportsAllDrives=true',
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken.token}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
          'Content-Length': multipartBody.length.toString()
        }
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ data: JSON.parse(data) });
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.write(multipartBody);
      req.end();
    });

    const file = response;

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

    // Clean up temp file
    await tempFileRef.delete();

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
    console.error('Error in upload proxy:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
}; 