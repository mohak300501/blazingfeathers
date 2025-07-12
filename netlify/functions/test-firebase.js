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
    
    console.log('Testing Firebase Admin SDK...');
    console.log('Project ID:', process.env.FIREBASE_PROJECT_ID);
    console.log('Client Email:', process.env.FIREBASE_CLIENT_EMAIL);
    console.log('Private Key exists:', !!process.env.FIREBASE_PRIVATE_KEY);
    
    // Test Firestore access
    const testDoc = await db.collection('test').doc('connection').get();
    console.log('Firestore connection test successful');
    
    // Test writing to Firestore
    await db.collection('test').doc('connection').set({
      timestamp: new Date(),
      message: 'Firebase Admin SDK is working!'
    });
    console.log('Firestore write test successful');
    
    // Test reading from birds collection
    const birdsSnapshot = await db.collection('birds').limit(1).get();
    console.log('Birds collection access test successful');
    console.log('Number of birds found:', birdsSnapshot.size);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Firebase Admin SDK is working correctly',
        projectId: process.env.FIREBASE_PROJECT_ID,
        birdsCount: birdsSnapshot.size,
        timestamp: new Date().toISOString()
      }),
    };

  } catch (error) {
    console.error('Firebase Admin SDK test failed:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Firebase Admin SDK test failed', 
        details: error.message,
        stack: error.stack
      }),
    };
  }
}; 