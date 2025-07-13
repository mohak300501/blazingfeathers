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

// Import commonCode generator
const { generateUniqueCommonCode } = require('./commonCode');

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
    
    const { commonName, scientificName, userId } = JSON.parse(event.body);

    if (!commonName || !scientificName || !userId) {
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
        body: JSON.stringify({ error: 'Admin privileges required' }),
      };
    }

    // Check if bird already exists (case-insensitive)
    const birdsQuery = await db.collection('birds')
      .where('commonName', '==', commonName)
      .get();

    if (!birdsQuery.empty) {
      return {
        statusCode: 409,
        headers,
        body: JSON.stringify({ error: 'Bird with this common name already exists' }),
      };
    }

    // Get all existing commonCodes to ensure uniqueness
    const allBirdsQuery = await db.collection('birds').get();
    const existingCodes = [];
    allBirdsQuery.forEach(doc => {
      const data = doc.data();
      if (data.commonCode) {
        existingCodes.push(data.commonCode);
      }
    });

    // Generate unique commonCode
    const commonCode = generateUniqueCommonCode(commonName, existingCodes);

    // Add bird to Firestore
    const birdRef = await db.collection('birds').add({
      commonName: commonName.trim(),
      scientificName: scientificName.trim(),
      commonCode: commonCode,
      photoCount: 0,
      createdAt: new Date(),
      addedBy: userId,
      addedByUsername: userData.username
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        birdId: birdRef.id,
        commonName,
        scientificName,
        commonCode
      }),
    };

  } catch (error) {
    console.error('Error adding bird:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
}; 