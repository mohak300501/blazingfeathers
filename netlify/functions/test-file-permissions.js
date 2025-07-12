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
    
    const { fileId, userId } = JSON.parse(event.body);

    if (!fileId || !userId) {
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
        body: JSON.stringify({ error: 'Admin access required' }),
      };
    }

    console.log('Testing permissions for file:', fileId);

    // Initialize Google Drive API
    const { google: googleApi } = require('googleapis');
    
    const auth = new googleApi.auth.GoogleAuth({
      credentials: {
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/drive'],
    });

    const authClient = await auth.getClient();
    const accessToken = await authClient.getAccessToken();
    
    console.log('Service account email:', process.env.FIREBASE_CLIENT_EMAIL);
    console.log('Access token obtained:', !!accessToken.token);

    // Test file access with different methods
    const https = require('https');
    const sharedDriveId = process.env.GOOGLE_DRIVE_SHARED_DRIVE_ID;
    
    // Test 1: Get file info
    const fileInfoResponse = await new Promise((resolve, reject) => {
      const options = {
        hostname: 'www.googleapis.com',
        path: `/drive/v3/files/${fileId}?fields=id,name,parents,owners,permissions&supportsAllDrives=true`,
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken.token}`,
        }
      };

      const req = https.request(options, (res) => {
        console.log('File info response status:', res.statusCode);
        
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              const fileInfo = JSON.parse(data);
              console.log('File info:', fileInfo);
              resolve(fileInfo);
            } catch (parseError) {
              reject(new Error(`Failed to parse file info: ${parseError.message}`));
            }
          } else {
            console.error('File info error:', res.statusCode, data);
            reject(new Error(`File info failed: ${res.statusCode} - ${data}`));
          }
        });
      });

      req.on('error', reject);
      req.end();
    });

    // Test 2: Try to get permissions
    const permissionsResponse = await new Promise((resolve, reject) => {
      const options = {
        hostname: 'www.googleapis.com',
        path: `/drive/v3/files/${fileId}/permissions?supportsAllDrives=true`,
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken.token}`,
        }
      };

      const req = https.request(options, (res) => {
        console.log('Permissions response status:', res.statusCode);
        
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              const permissions = JSON.parse(data);
              console.log('Permissions:', permissions);
              resolve(permissions);
            } catch (parseError) {
              reject(new Error(`Failed to parse permissions: ${parseError.message}`));
            }
          } else {
            console.error('Permissions error:', res.statusCode, data);
            resolve(null); // Don't fail, just log
          }
        });
      });

      req.on('error', reject);
      req.end();
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        fileInfo: fileInfoResponse,
        permissions: permissionsResponse,
        serviceAccountEmail: process.env.FIREBASE_CLIENT_EMAIL,
        sharedDriveId: sharedDriveId
      }),
    };

  } catch (error) {
    console.error('Error testing file permissions:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error', details: error.message }),
    };
  }
}; 