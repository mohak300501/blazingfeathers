#!/bin/bash

# Exit on any error
set -e

echo "Installing dependencies..."
npm ci

echo "Installing function dependencies..."
cd netlify/functions && npm install && cd ../..

echo "Building the application..."
npm run build

echo "Build completed successfully!" 