export function generateCommonCode(commonName: string): string {
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
    // 3 words: 1 letter each of first word and 2 letters of third word
    code = words[0].substring(0, 1) + words[2].substring(0, 2);
  } else {
    // 4 words or more: 1 letter each of first 4 words
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

export function generateUniqueCommonCode(commonName: string, existingCodes: string[]): string {
  const baseCode = generateCommonCode(commonName);
  
  // Start with digit 0
  let digit = 0;
  let fullCode = baseCode + digit;
  
  // Keep incrementing the digit until we find a unique code
  while (existingCodes.includes(fullCode)) {
    digit++;
    if (digit > 9) {
      // If we exceed 9, we need to handle this case
      // For now, we'll throw an error, but in practice this should be very rare
      throw new Error(`Too many birds with similar names starting with ${baseCode}`);
    }
    fullCode = baseCode + digit;
  }
  
  return fullCode;
} 