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
    
    const { userId } = JSON.parse(event.body);

    if (!userId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing userId' }),
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
    const adminEmails = process.env.VITE_ADMIN_EMAILS ? process.env.VITE_ADMIN_EMAILS.split(',').map(email => email.trim()) : ['admin@blazingfeathers.com'];
    const isAdmin = adminEmails.includes(userData.email);

    if (!isAdmin) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Admin privileges required' }),
      };
    }

    // Fetch admin statistics
    const birdsSnapshot = await db.collection('birds').get();
    const usersSnapshot = await db.collection('users').get();
    
    let totalPhotos = 0;
    const birdsData = [];
    
    birdsSnapshot.forEach((doc) => {
      const data = doc.data();
      birdsData.push({
        id: doc.id,
        commonName: data.commonName,
        scientificName: data.scientificName,
        photoCount: data.photoCount || 0
      });
      totalPhotos += data.photoCount || 0;
    });

    const stats = {
      totalBirds: birdsData.length,
      totalPhotos,
      totalUsers: usersSnapshot.size,
      birds: birdsData
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(stats),
    };

  } catch (error) {
    console.error('Error fetching admin stats:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
}; 