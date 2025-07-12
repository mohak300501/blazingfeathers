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
    
    // Parse multipart form data
    let formData = event.body;
    console.log('Content-Type:', event.headers['content-type']);
    console.log('Body length:', formData.length);
    console.log('Body preview:', formData.substring(0, 500));
    
    // Check if body is base64 encoded
    if (formData.startsWith('LS0tLS0t')) {
      console.log('Detected base64 encoded body, decoding...');
      formData = Buffer.from(formData, 'base64').toString('utf8');
      console.log('Decoded body preview:', formData.substring(0, 500));
    }
    
    let boundary = event.headers['content-type'].split('boundary=')[1];
    // Remove quotes if present
    if (boundary && boundary.startsWith('"') && boundary.endsWith('"')) {
      boundary = boundary.slice(1, -1);
    }
    console.log('Boundary:', boundary);
    
    const parts = formData.split(`--${boundary}`);
    console.log('Number of parts:', parts.length);
    
    let photoFile = null;
    let birdId = null;
    let userId = null;
    let location = null;
    let dateOfCapture = null;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i].trim();
      if (!part || part === '--') continue; // Skip empty parts
      
      console.log(`Part ${i}:`, part.substring(0, 200) + '...');
      
      if (part.includes('Content-Disposition: form-data')) {
        console.log(`Processing part ${i} with Content-Disposition`);
        const lines = part.split('\r\n');
        const contentDisposition = lines.find(line => line.startsWith('Content-Disposition: form-data'));
        
        if (contentDisposition) {
          const nameMatch = contentDisposition.match(/name="([^"]+)"/);
          if (nameMatch) {
            const name = nameMatch[1];
            console.log('Found field:', name, 'in part:', i);
            
            // Get the value after the headers
            const headerEndIndex = part.indexOf('\r\n\r\n');
            console.log('Header end index:', headerEndIndex, 'for field:', name);
            if (headerEndIndex !== -1) {
              const value = part.substring(headerEndIndex + 4).trim();
              console.log('Value length for', name, ':', value.length);
              
              if (name === 'photo') {
                // Extract file data
                const contentTypeMatch = lines.find(line => line.startsWith('Content-Type:'));
                const contentType = contentTypeMatch ? contentTypeMatch.split(': ')[1] : 'image/jpeg';
                
                // The value should already be the raw file data (not base64)
                // We need to convert it to base64 for storage
                const base64Data = Buffer.from(value, 'binary').toString('base64');
                
                photoFile = {
                  data: base64Data,
                  contentType: contentType,
                  name: `bird_${Date.now()}.jpg`
                };
                console.log('Photo file found, raw size:', value.length, 'base64 size:', base64Data.length);
                console.log('Base64 data preview:', base64Data.substring(0, 100));
              } else if (name === 'birdId') {
                birdId = value;
                console.log('BirdId:', birdId);
              } else if (name === 'userId') {
                userId = value;
                console.log('UserId:', userId);
              } else if (name === 'location') {
                location = value;
                console.log('Location:', location);
              } else if (name === 'dateOfCapture') {
                dateOfCapture = value;
                console.log('DateOfCapture:', dateOfCapture);
              }
            }
          }
        }
      }
    }

    if (!photoFile || !birdId || !userId || !location || !dateOfCapture) {
      console.error('Missing fields:', { photoFile: !!photoFile, birdId, userId, location, dateOfCapture });
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required fields' }),
      };
    }

    // Get user data
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'User not found' }),
      };
    }
    const userData = userDoc.data();
    const username = userData.username;

    // Use the proxy function for Google Drive upload
    console.log('Calling upload proxy function...');
    
    const proxyResponse = await fetch(`${process.env.URL}/.netlify/functions/upload-photo-proxy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileData: photoFile.data,
        fileName: photoFile.name,
        contentType: photoFile.contentType,
        birdId: birdId,
        userId: userId,
        location: location,
        dateOfCapture: dateOfCapture,
      }),
    });

    if (!proxyResponse.ok) {
      const errorData = await proxyResponse.json();
      throw new Error(errorData.error || 'Proxy upload failed');
    }

    const result = await proxyResponse.json();
    console.log('Proxy upload successful:', result);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result),
    };

  } catch (error) {
    console.error('Error uploading photo:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
}; 