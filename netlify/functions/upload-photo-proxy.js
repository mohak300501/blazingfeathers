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
    
    console.log('Creating multipart data with boundary:', boundary);
    console.log('File metadata:', JSON.stringify(fileMetadata, null, 2));
    console.log('Content type:', contentType);
    console.log('File buffer size:', fileBuffer.length);
    console.log('File buffer first 20 bytes:', fileBuffer.subarray(0, 20));
    
    // Try using the resumable upload method instead
    console.log('Using resumable upload method...');
    
    // First, get the upload URL
    const sessionResponse = await new Promise((resolve, reject) => {
      const sessionOptions = {
        hostname: 'www.googleapis.com',
        path: '/upload/drive/v3/files?uploadType=resumable&fields=id,webViewLink&supportsAllDrives=true',
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken.token}`,
          'Content-Type': 'application/json',
          'X-Upload-Content-Type': contentType,
          'X-Upload-Content-Length': fileBuffer.length.toString()
        }
      };

      const sessionReq = https.request(sessionOptions, (res) => {
        console.log('Session response status:', res.statusCode);
        console.log('Session response headers:', res.headers);
        
        if (res.statusCode === 200) {
          const location = res.headers.location;
          console.log('Upload session location:', location);
          resolve(location);
        } else {
          let data = '';
          res.on('data', (chunk) => data += chunk);
          res.on('end', () => {
            reject(new Error(`Session creation failed: ${res.statusCode} - ${data}`));
          });
        }
      });

      sessionReq.on('error', reject);
      sessionReq.write(JSON.stringify(fileMetadata));
      sessionReq.end();
    });

    // Now upload the file content
    const uploadResponse = await new Promise((resolve, reject) => {
      const uploadUrl = new URL(sessionResponse);
      const uploadOptions = {
        hostname: uploadUrl.hostname,
        path: uploadUrl.pathname + uploadUrl.search,
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken.token}`,
          'Content-Type': contentType,
          'Content-Length': fileBuffer.length.toString()
        }
      };

      const uploadReq = https.request(uploadOptions, (res) => {
        console.log('Upload response status:', res.statusCode);
        console.log('Upload response headers:', res.headers);
        
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          console.log('Upload response body:', data);
          
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              const parsedData = JSON.parse(data);
              console.log('Parsed upload response:', parsedData);
              resolve({ data: parsedData });
            } catch (parseError) {
              reject(new Error(`Failed to parse upload response: ${parseError.message}`));
            }
          } else {
            reject(new Error(`Upload failed: ${res.statusCode} - ${data}`));
          }
        });
      });

      uploadReq.on('error', reject);
      uploadReq.write(fileBuffer);
      uploadReq.end();
    });

    const file = uploadResponse;

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