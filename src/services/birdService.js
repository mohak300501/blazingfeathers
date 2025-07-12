import { 
  collection, 
  getDocs, 
  getDoc, 
  doc, 
  addDoc, 
  deleteDoc, 
  updateDoc,
  query,
  orderBy,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase/config';

// Get all birds
export const getBirds = async () => {
  try {
    const birdsRef = collection(db, 'birds');
    const q = query(birdsRef, orderBy('commonName'));
    const querySnapshot = await getDocs(q);
    
    const birds = [];
    querySnapshot.forEach((doc) => {
      birds.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return birds;
  } catch (error) {
    console.error('Error getting birds:', error);
    throw error;
  }
};

// Get a single bird by ID
export const getBirdById = async (birdId) => {
  try {
    const birdRef = doc(db, 'birds', birdId);
    const birdSnap = await getDoc(birdRef);
    
    if (birdSnap.exists()) {
      return {
        id: birdSnap.id,
        ...birdSnap.data()
      };
    } else {
      throw new Error('Bird not found');
    }
  } catch (error) {
    console.error('Error getting bird:', error);
    throw error;
  }
};

// Add a new bird (admin only)
export const addBird = async (birdData) => {
  try {
    const birdsRef = collection(db, 'birds');
    const docRef = await addDoc(birdsRef, {
      ...birdData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    return {
      id: docRef.id,
      ...birdData
    };
  } catch (error) {
    console.error('Error adding bird:', error);
    throw error;
  }
};

// Update a bird (admin only)
export const updateBird = async (birdId, birdData) => {
  try {
    const birdRef = doc(db, 'birds', birdId);
    await updateDoc(birdRef, {
      ...birdData,
      updatedAt: serverTimestamp()
    });
    
    return {
      id: birdId,
      ...birdData
    };
  } catch (error) {
    console.error('Error updating bird:', error);
    throw error;
  }
};

// Delete a bird (admin only)
export const deleteBird = async (birdId) => {
  try {
    const birdRef = doc(db, 'birds', birdId);
    await deleteDoc(birdRef);
    return birdId;
  } catch (error) {
    console.error('Error deleting bird:', error);
    throw error;
  }
};

// Add a photo to a bird
export const addPhotoToBird = async (birdId, photoData) => {
  try {
    const birdRef = doc(db, 'birds', birdId);
    const birdSnap = await getDoc(birdRef);
    
    if (!birdSnap.exists()) {
      throw new Error('Bird not found');
    }
    
    const birdData = birdSnap.data();
    const photos = birdData.photos || [];
    
    const newPhoto = {
      id: Date.now().toString(), // Simple ID generation
      ...photoData,
      uploadedAt: serverTimestamp()
    };
    
    photos.push(newPhoto);
    
    await updateDoc(birdRef, {
      photos: photos,
      updatedAt: serverTimestamp()
    });
    
    return newPhoto;
  } catch (error) {
    console.error('Error adding photo to bird:', error);
    throw error;
  }
};

// Delete a photo from a bird
export const deletePhotoFromBird = async (birdId, photoId, isAdmin = false, uploadedBy = null) => {
  try {
    const birdRef = doc(db, 'birds', birdId);
    const birdSnap = await getDoc(birdRef);
    
    if (!birdSnap.exists()) {
      throw new Error('Bird not found');
    }
    
    const birdData = birdSnap.data();
    const photos = birdData.photos || [];
    
    const photoIndex = photos.findIndex(photo => photo.id === photoId);
    
    if (photoIndex === -1) {
      throw new Error('Photo not found');
    }
    
    const photo = photos[photoIndex];
    
    // Check permissions
    if (!isAdmin && photo.uploadedBy !== uploadedBy) {
      throw new Error('You can only delete your own photos');
    }
    
    // Remove the photo
    photos.splice(photoIndex, 1);
    
    await updateDoc(birdRef, {
      photos: photos,
      updatedAt: serverTimestamp()
    });
    
    return photo;
  } catch (error) {
    console.error('Error deleting photo from bird:', error);
    throw error;
  }
}; 