# Blazing Feathers - Bird Photography Webapp

A beautiful, modern web application for bird photography enthusiasts. Built with React, Firebase, and Google Drive integration.

## Features

- 🔐 **Authentication**: Firebase Auth with email verification
- 🐦 **Bird Gallery**: Browse and search through bird species
- 📸 **Photo Upload**: Members can upload photos with location and date
- 👑 **Admin Panel**: Manage birds and view system statistics
- 🗂️ **Google Drive Integration**: Photos stored in shared Google Drive folder
- 🚀 **Serverless Functions**: Netlify functions for backend operations
- 📱 **Responsive Design**: Beautiful UI that works on all devices

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS
- **Authentication**: Firebase Auth
- **Database**: Firestore
- **File Storage**: Google Drive API
- **Deployment**: Netlify
- **Icons**: Lucide React
- **Notifications**: React Hot Toast

## Prerequisites

Before setting up this project, you'll need:

1. **Firebase Project**: Create a Firebase project and enable Authentication and Firestore
2. **Google Cloud Project**: Set up Google Drive API and create a service account
3. **Google Drive**: Create a shared drive folder for photos
4. **Netlify Account**: For deployment and serverless functions

## Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/blazing-feathers.git
cd blazing-feathers
```

### 2. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select existing one
3. Enable Authentication with Email/Password
4. Enable Firestore Database
5. Go to Project Settings > Service Accounts
6. Generate a new private key (download the JSON file)
7. Copy the Firebase config values

### 3. Google Drive Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google Drive API
4. Create a service account and download the JSON key
5. Create a shared drive folder for photos
6. Share the folder with the service account email

### 4. Environment Variables

1. Copy `env.example` to `.env`
2. Fill in all the required values:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef123456

# Firebase Admin SDK (for serverless functions)
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=your_service_account_email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour private key here\n-----END PRIVATE KEY-----\n"

# Google Drive API
GOOGLE_CLIENT_EMAIL=your_google_service_account_email
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour Google private key here\n-----END PRIVATE KEY-----\n"
GOOGLE_DRIVE_FOLDER_ID=your_shared_drive_folder_id

# Admin Configuration
ADMIN_EMAILS=admin@blazingfeathers.com,another_admin@example.com
```

### 5. Firestore Security Rules

Set up the following Firestore security rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Birds are publicly readable, only admins can write
    match /birds/{birdId} {
      allow read: if true;
      allow write: if request.auth != null && 
        request.auth.token.email in ['admin@blazingfeathers.com'];
      
      // Photos are publicly readable, owners and admins can write
      match /photos/{photoId} {
        allow read: if true;
        allow write: if request.auth != null && 
          (resource.data.uploadedBy == request.auth.uid || 
           request.auth.token.email in ['admin@blazingfeathers.com']);
      }
    }
  }
}
```

### 6. Deploy to Netlify

1. Push your code to GitHub
2. Connect your repository to Netlify
3. Set the build command: `npm run build`
4. Set the publish directory: `dist`
5. Add all environment variables in Netlify dashboard
6. Deploy!

## Project Structure

```
blazingfeathers/
├── src/
│   ├── components/          # Reusable UI components
│   ├── contexts/           # React contexts (Auth)
│   ├── pages/              # Page components
│   ├── config/             # Configuration files
│   ├── App.tsx             # Main app component
│   └── main.tsx            # App entry point
├── netlify/
│   └── functions/          # Serverless functions
├── public/                 # Static assets
├── package.json            # Dependencies
├── netlify.toml           # Netlify configuration
└── README.md              # This file
```

## Features in Detail

### Authentication
- Email/password registration and login
- Email verification required
- Protected routes for logged-in users
- Admin role checking

### Bird Management
- Public bird gallery with search
- Admin-only bird addition/deletion
- Bird details with photo galleries

### Photo Management
- Upload photos with location and date
- High-quality image display
- Delete permissions (owner or admin)
- Automatic Google Drive integration

### Admin Features
- Add/delete bird species
- Delete any photo
- View system statistics
- User management

## Security Features

- Firebase Auth with email verification
- Firestore security rules
- Admin-only operations
- File upload validation
- CORS protection on functions

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support, please open an issue on GitHub or contact the development team.

## Acknowledgments

- Firebase for authentication and database
- Google Drive API for file storage
- Netlify for hosting and serverless functions
- Tailwind CSS for styling
- Lucide React for icons 