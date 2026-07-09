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
    await initializeDependencies();
    
    const { birdId, commonName, scientificName, familyName, userId } = JSON.parse(event.body);

    if (!birdId || !commonName || !scientificName || !userId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required fields' }),
      };
    }

    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'User not found' }),
      };
    }

    const userData = userDoc.data();
    const isAdmin = userData.isAdmin === true;

    if (!isAdmin) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Admin privileges required' }),
      };
    }

    const birdRef = db.collection('birds').doc(birdId);
    const birdDoc = await birdRef.get();
    
    if (!birdDoc.exists) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Bird not found' }),
      };
    }

    const currentData = birdDoc.data();
    
    // Check if commonName changed to generate a new commonCode
    let updateData = {
      commonName: commonName.trim(),
      scientificName: scientificName.trim(),
      familyName: familyName ? familyName.trim() : 'Uncategorized',
      updatedAt: new Date(),
    };

    if (currentData.commonName !== commonName.trim()) {
      // Check if new commonName already exists
      const birdsQuery = await db.collection('birds')
        .where('commonName', '==', commonName.trim())
        .get();

      if (!birdsQuery.empty) {
        return {
          statusCode: 409,
          headers,
          body: JSON.stringify({ error: 'Bird with this common name already exists' }),
        };
      }

      // Get all existing commonCodes
      const allBirdsQuery = await db.collection('birds').get();
      const existingCodes = [];
      allBirdsQuery.forEach(doc => {
        const data = doc.data();
        if (data.commonCode && doc.id !== birdId) {
          existingCodes.push(data.commonCode);
        }
      });

      const newCommonCode = generateUniqueCommonCode(commonName.trim(), existingCodes);
      updateData.commonCode = newCommonCode;
    }

    await birdRef.update(updateData);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        birdId,
        ...updateData
      }),
    };

  } catch (error) {
    console.error('Error editing bird:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
