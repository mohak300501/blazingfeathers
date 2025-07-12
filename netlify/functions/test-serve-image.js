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
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  try {
    // Initialize dependencies
    await initializeDependencies();
    
    // Test with a specific file ID from the logs
    const testFileId = '1grSHPIAKc7QzSJUn9ZhTPDPz8ollsiF9';
    
    console.log('Testing serve-image functionality with file ID:', testFileId);

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

    console.log('Got access token:', accessToken.token ? 'SUCCESS' : 'FAILED');

    // Use https module to fetch the file directly with service account credentials
    const https = require('https');
    
    const response = await new Promise((resolve, reject) => {
      const options = {
        hostname: 'www.googleapis.com',
        path: `/drive/v3/files/${testFileId}?alt=media&supportsAllDrives=true`,
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken.token}`,
        }
      };

      console.log('Making request to:', options.hostname + options.path);

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

    console.log('Successfully retrieved file with size:', response.body.length);
    console.log('Content type:', response.contentType);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Serve-image test successful',
        fileId: testFileId,
        fileSize: response.body.length,
        contentType: response.contentType,
        firstBytes: response.body.subarray(0, 20).toString('hex'),
        timestamp: new Date().toISOString()
      }),
    };

  } catch (error) {
    console.error('Serve-image test failed:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Serve-image test failed', 
        details: error.message,
        stack: error.stack
      }),
    };
  }
}; 