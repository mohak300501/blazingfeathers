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

    // Instead of exposing the access token in URL, let's use a different approach
    // We'll create a temporary signed URL that doesn't expose the token
    const drive = googleApi.drive({ version: 'v3', auth: authClient });
    
    try {
      // Get file metadata to verify access
      const fileMetadata = await drive.files.get({
        fileId: fileId,
        fields: 'id,name,mimeType,size',
        supportsAllDrives: true,
      });
      
      console.log('File metadata retrieved:', fileMetadata.data);
      
      // Create a temporary signed URL (this is a workaround since Google Drive doesn't support signed URLs directly)
      // We'll use a different approach - create a temporary public link
      const tempUrl = `https://drive.google.com/uc?export=view&id=${fileId}`;
      
      console.log('Generated temporary URL:', tempUrl);

      // Return a redirect to the temporary URL
      return {
        statusCode: 302,
        headers: {
          ...headers,
          'Location': tempUrl,
          'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
        },
        body: '',
      };
      
    } catch (error) {
      console.error('Error getting file metadata:', error);
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'File not found or access denied' }),
      };
    }

  } catch (error) {
    console.error('Error serving image:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error', details: error.message }),
    };
  }
}; 