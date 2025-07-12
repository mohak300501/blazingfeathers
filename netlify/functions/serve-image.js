let admin;

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
  }
}

exports.handler = async (event, context) => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    // Initialize dependencies
    await initializeDependencies();
    
    // Extract file ID from query parameters
    const { fileId } = event.queryStringParameters || {};
    
    if (!fileId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'File ID is required' }),
      };
    }

    console.log('Serving image for file ID:', fileId);

    // Get access token for Google Drive API
    const google = require('googleapis');
    const { google: googleApi } = google;
    
    const auth = new googleApi.auth.GoogleAuth({
      credentials: {
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    });
    
    const authClient = await auth.getClient();
    const accessToken = await authClient.getAccessToken();

    // Use https module to fetch the file directly with service account credentials
    const https = require('https');
    
    const response = await new Promise((resolve, reject) => {
      const options = {
        hostname: 'www.googleapis.com',
        path: `/drive/v3/files/${fileId}?alt=media&supportsAllDrives=true`,
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken.token}`,
        }
      };

      const req = https.request(options, (res) => {
        console.log('Google Drive file response status:', res.statusCode);
        console.log('Google Drive file response headers:', res.headers);
        
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const chunks = [];
          res.on('data', (chunk) => {
            chunks.push(chunk);
          });
          res.on('end', () => {
            const fileBuffer = Buffer.concat(chunks);
            console.log('File size received:', fileBuffer.length);
            console.log('File first 20 bytes:', fileBuffer.subarray(0, 20));
            
            resolve({
              statusCode: res.statusCode,
              contentType: res.headers['content-type'] || 'image/jpeg',
              body: fileBuffer
            });
          });
        } else {
          let errorData = '';
          res.on('data', (chunk) => errorData += chunk);
          res.on('end', () => {
            console.error('Google Drive API error:', res.statusCode, errorData);
            reject(new Error(`Google Drive API error: ${res.statusCode} - ${errorData}`));
          });
        }
      });

      req.on('error', (error) => {
        console.error('Request error:', error);
        reject(error);
      });

      req.end();
    });

    // Set appropriate headers for image serving
    const imageHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Content-Type': response.contentType,
      'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      'Content-Length': response.body.length.toString(),
    };

    console.log('Returning image with headers:', imageHeaders);
    console.log('Image size:', response.body.length);

    return {
      statusCode: 200,
      headers: imageHeaders,
      body: response.body.toString('base64'),
      isBase64Encoded: true,
    };

  } catch (error) {
    console.error('Error serving image:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error', details: error.message }),
    };
  }
}; 