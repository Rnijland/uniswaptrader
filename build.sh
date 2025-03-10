#!/bin/bash
set -e

echo "Starting build process..."

# Install dependencies
echo "Installing dependencies..."
npm install

# Compile TypeScript
echo "Compiling TypeScript..."
npx tsc

# Check if compilation was successful
if [ ! -d "dist" ]; then
  echo "Error: TypeScript compilation failed. 'dist' directory not created."
  exit 1
fi

if [ ! -f "dist/index.js" ]; then
  echo "Error: TypeScript compilation failed. 'dist/index.js' not found."
  exit 1
fi

# Copy static assets
echo "Copying static assets..."
node copy-static-assets.js

echo "Build completed successfully!"
