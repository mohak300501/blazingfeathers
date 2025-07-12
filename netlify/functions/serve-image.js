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
  console.log('Serve-image function called with event:', {
    httpMethod: event.httpMethod,
    queryStringParameters: event.queryStringParameters,
    headers: event.headers
  });

  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    console.log('Handling OPTIONS request');
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  if (event.httpMethod !== 'GET') {
    console.log('Invalid HTTP method:', event.httpMethod);
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    // Initialize dependencies
    console.log('Initializing dependencies...');
    await initializeDependencies();
    console.log('Dependencies initialized successfully');
    
    // Extract file ID from query parameters
    const { fileId } = event.queryStringParameters || {};
    
    if (!fileId) {
      console.log('No fileId provided in query parameters');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'File ID is required' }),
      };
    }

    console.log('Generating signed URL for file ID:', fileId);

    // Get access token for Google Drive API
    console.log('Getting Google Drive access token...');
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
    console.log('Got access token successfully');

    // Generate a signed URL that expires in 1 hour
    const signedUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&supportsAllDrives=true&access_token=${accessToken.token}`;
    
    console.log('Generated signed URL (truncated):', signedUrl.substring(0, 100) + '...');

    // Return a redirect to the signed URL
    return {
      statusCode: 302,
      headers: {
        ...headers,
        'Location': signedUrl,
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
      body: '',
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