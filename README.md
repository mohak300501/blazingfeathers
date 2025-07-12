# BlazingFeathers 🦅

A beautiful, community-driven bird photography webapp built with React, Firebase, and Google Drive integration.

## Features

- **Beautiful UI**: Modern, responsive design with Tailwind CSS
- **Authentication**: Firebase Auth with email verification
- **Bird Gallery**: Browse and search bird species
- **Photo Upload**: Upload high-quality bird photos to Google Drive
- **Admin Controls**: Admin users can manage bird species and photos
- **Community Driven**: Users can contribute their own bird photographs
- **Serverless**: Built with Netlify Functions for scalability

## Tech Stack

- **Frontend**: React 18, React Router, Tailwind CSS
- **Authentication**: Firebase Authentication
- **Database**: Firestore
- **File Storage**: Google Drive API
- **Deployment**: Netlify
- **Functions**: Netlify Serverless Functions

## Prerequisites

Before setting up this project, you'll need:

1. **Firebase Project**: Create a Firebase project and enable Authentication and Firestore
2. **Google Cloud Project**: Set up Google Drive API and create a service account
3. **Netlify Account**: For deployment and serverless functions
4. **GitHub Account**: For version control

## Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/blazingfeathers.git
cd blazingfeathers
```

### 2. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project
3. Enable Authentication with Email/Password
4. Create a Firestore database
5. Get your Firebase config from Project Settings > General > Your apps
6. Update the Firestore security rules with the provided `firestore.rules`

### 3. Google Drive Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google Drive API
4. Create a Service Account:
   - Go to IAM & Admin > Service Accounts
   - Create a new service account
   - Download the JSON key file
   - Share your Google Drive folder with the service account email
5. Note down the folder ID from your shared Google Drive folder

### 4. Environment Configuration

1. Copy `env.example` to `.env`:
   ```bash
   cp env.example .env
   ```

2. Fill in your environment variables:
   ```env
   # Firebase Configuration
   REACT_APP_FIREBASE_API_KEY=your_firebase_api_key
   REACT_APP_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   REACT_APP_FIREBASE_PROJECT_ID=your_project_id
   REACT_APP_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   REACT_APP_FIREBASE_APP_ID=your_app_id

   # Google Drive Configuration
   GOOGLE_PROJECT_ID=your_google_project_id
   GOOGLE_PRIVATE_KEY_ID=your_private_key_id
   GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour private key here\n-----END PRIVATE KEY-----\n"
   GOOGLE_CLIENT_EMAIL=your_service_account_email@your_project.iam.gserviceaccount.com
   GOOGLE_CLIENT_ID=your_client_id
   GOOGLE_DRIVE_FOLDER_ID=your_shared_drive_folder_id

   # Admin Configuration
   ADMIN_EMAILS=admin@blazingfeathers.com,another_admin@example.com
   ```

### 5. Install Dependencies

```bash
# Install main dependencies
npm install

# Install function dependencies
cd functions
npm install
cd ..
```

### 6. Development

```bash
# Start development server
npm run dev
```

The app will be available at `http://localhost:8888`

### 7. Deployment

#### Option A: Deploy to Netlify

1. Push your code to GitHub
2. Connect your repository to Netlify
3. Set the build command: `npm run build`
4. Set the publish directory: `dist`
5. Add all environment variables in Netlify's environment settings
6. Deploy!

#### Option B: Manual Deployment

```bash
# Build the project
npm run build

# Deploy to Netlify CLI
netlify deploy --prod
```

## Project Structure

```
blazingfeathers/
├── src/
│   ├── components/          # React components
│   ├── contexts/           # React contexts
│   ├── pages/              # Page components
│   ├── services/           # API services
│   ├── styles/             # CSS styles
│   ├── firebase/           # Firebase configuration
│   ├── App.js              # Main app component
│   └── index.js            # Entry point
├── functions/              # Netlify serverless functions
├── public/                 # Static assets
├── netlify.toml           # Netlify configuration
├── tailwind.config.js     # Tailwind CSS configuration
└── package.json           # Dependencies and scripts
```

## Features in Detail

### Authentication
- Email/password registration and login
- Email verification required
- Protected routes for authenticated users
- Admin role checking

### Bird Management
- Public bird gallery (no login required)
- Admin-only bird species addition
- Search functionality by common and scientific names
- Detailed bird pages with photo galleries

### Photo Management
- Upload photos to Google Drive
- Location and date capture tracking
- User attribution for all photos
- Photo deletion (own photos only, or all for admins)
- High-quality image display

### Admin Features
- Add new bird species
- Delete any bird species (removes all associated photos)
- Delete any photo
- Admin status indicated in UI

## Security

- Firestore security rules prevent unauthorized access
- Admin checks on both client and server side
- File upload validation and size limits
- CORS protection on serverless functions
- Environment variables for sensitive data

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

If you encounter any issues or have questions:

1. Check the Firebase and Google Drive setup
2. Verify all environment variables are set correctly
3. Check the browser console for errors
4. Review the Netlify function logs

## Acknowledgments

- Built with React and Firebase
- Styled with Tailwind CSS
- Icons from Lucide React
- Deployed on Netlify 