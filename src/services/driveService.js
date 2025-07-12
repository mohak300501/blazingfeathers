// This service will be replaced by serverless functions
// For now, we'll create a placeholder that calls the Netlify function

export const uploadPhotoToDrive = async (file, birdName) => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('birdName', birdName);

    const response = await fetch('/.netlify/functions/upload-photo', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to upload photo');
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error uploading to Drive:', error);
    throw error;
  }
};

export const deletePhotoFromDrive = async (fileId) => {
  try {
    const response = await fetch('/.netlify/functions/delete-photo', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fileId }),
    });

    if (!response.ok) {
      throw new Error('Failed to delete photo');
    }

    return await response.json();
  } catch (error) {
    console.error('Error deleting from Drive:', error);
    throw error;
  }
}; 