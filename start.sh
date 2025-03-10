#!/bin/bash
set -e

echo "Starting application..."

# Check if dist directory exists
if [ ! -d "dist" ]; then
  echo "Error: 'dist' directory not found. Build may have failed."
  exit 1
fi

# Check if the compiled index.js exists
if [ ! -f "dist/index.js" ]; then
  echo "Error: 'dist/index.js' not found. Build may have failed."
  exit 1
fi

# List the contents of the dist directory for debugging
echo "Contents of dist directory:"
ls -la dist/

# Start the application
echo "Running node dist/index.js"
node dist/index.js
