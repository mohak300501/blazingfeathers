const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('../serviceAccountKey.json'); // You'll need to add your service account key here

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

// CommonCode generation functions
function generateCommonCode(commonName) {
  // Split the common name on spaces and hyphens
  const words = commonName.split(/[\s-]+/).filter(word => word.length > 0);
  
  let code = '';
  
  if (words.length === 1) {
    // 1 word: first 4 letters
    code = words[0].substring(0, 4);
  } else if (words.length === 2) {
    // 2 words: first 2 letters each
    code = words[0].substring(0, 2) + words[1].substring(0, 2);
  } else if (words.length === 3) {
    // 3 words: first 1 letter each of first word and first 2 letters of third word
    code = words[0].substring(0, 1) + words[1].substring(0, 1) + words[2].substring(0, 2);
  } else {
    // 4 words or more: first 1 letter each of first 4 words
    code = words.slice(0, 4).map(word => word.substring(0, 1)).join('');
  }
  
  // Ensure the code is exactly 4 characters by padding or truncating
  if (code.length < 4) {
    code = code.padEnd(4, 'X');
  } else if (code.length > 4) {
    code = code.substring(0, 4);
  }
  
  return code;
}

function generateUniqueCommonCode(commonName, existingCodes) {
  const baseCode = generateCommonCode(commonName);
  
  // Start with digit 0
  let digit = 0;
  let fullCode = baseCode + digit;
  
  // Keep incrementing the digit until we find a unique code
  while (existingCodes.includes(fullCode)) {
    digit++;
    if (digit > 9) {
      throw new Error(`Too many birds with similar names starting with ${baseCode}`);
    }
    fullCode = baseCode + digit;
  }
  
  return fullCode;
}

async function addCommonCodesToExistingBirds() {
  try {
    console.log('Starting to add commonCode to existing birds...');
    
    // Get all birds
    const birdsQuery = await db.collection('birds').get();
    const birdsToUpdate = [];
    const existingCodes = [];

    // First pass: collect existing codes and identify birds that need updating
    birdsQuery.forEach(doc => {
      const data = doc.data();
      if (data.commonCode) {
        existingCodes.push(data.commonCode);
        console.log(`Bird "${data.commonName}" already has commonCode: ${data.commonCode}`);
      } else {
        birdsToUpdate.push({
          id: doc.id,
          commonName: data.commonName,
          scientificName: data.scientificName
        });
      }
    });

    console.log(`Found ${birdsToUpdate.length} birds that need commonCode`);

    // Second pass: generate unique codes for birds that need them
    for (const bird of birdsToUpdate) {
      const commonCode = generateUniqueCommonCode(bird.commonName, existingCodes);
      existingCodes.push(commonCode); // Add to existing codes for next iteration
      
      console.log(`Adding commonCode "${commonCode}" to "${bird.commonName}"`);
      
      await db.collection('birds').doc(bird.id).update({
        commonCode: commonCode
      });
    }

    console.log(`Successfully added commonCode to ${birdsToUpdate.length} birds!`);
    
  } catch (error) {
    console.error('Error adding commonCode to birds:', error);
  } finally {
    process.exit(0);
  }
}

// Run the migration
addCommonCodesToExistingBirds(); 