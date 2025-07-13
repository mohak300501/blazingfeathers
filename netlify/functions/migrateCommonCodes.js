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
const { generateUniqueCommonCode } = require('./commonCodeGenerator');

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
    
    const { userId } = JSON.parse(event.body);

    if (!userId) {
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

    // Get all birds that don't have commonCode
    const birdsQuery = await db.collection('birds').get();
    const birdsToUpdate = [];
    const existingCodes = [];

    // First pass: collect existing codes and identify birds that need updating
    birdsQuery.forEach(doc => {
      const data = doc.data();
      if (data.commonCode) {
        existingCodes.push(data.commonCode);
      } else {
        birdsToUpdate.push({
          id: doc.id,
          commonName: data.commonName,
          scientificName: data.scientificName
        });
      }
    });

    // Second pass: generate unique codes for birds that need them
    const updatePromises = birdsToUpdate.map(async (bird) => {
      const commonCode = generateUniqueCommonCode(bird.commonName, existingCodes);
      existingCodes.push(commonCode); // Add to existing codes for next iteration
      
      return db.collection('birds').doc(bird.id).update({
        commonCode: commonCode
      });
    });

    // Execute all updates
    await Promise.all(updatePromises);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        updatedCount: birdsToUpdate.length,
        message: `Successfully added commonCode to ${birdsToUpdate.length} birds`
      }),
    };

  } catch (error) {
    console.error('Error migrating commonCodes:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
}; 