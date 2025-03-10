const fs = require('fs-extra');
const path = require('path');

// Define source and destination directories
const srcDir = path.join(__dirname, 'src');
const destDir = path.join(__dirname, 'dist');

// Helper function to safely copy a directory if it exists
async function safeCopyDir(source, destination, options = {}) {
  try {
    if (await fs.pathExists(source)) {
      await fs.copy(source, destination, options);
      console.log(`Copied ${source} to ${destination}`);
    } else {
      console.log(`Skipping ${source} - directory does not exist`);
    }
  } catch (err) {
    console.error(`Error copying ${source}:`, err);
    // Don't exit the process, just log the error and continue
  }
}

// Function to copy static assets and JavaScript files
async function copyStaticAssets() {
  try {
    // Ensure the destination directory exists
    await fs.ensureDir(destDir);
    console.log('Created dist directory');

    // Copy UI views (EJS templates)
    await safeCopyDir(
      path.join(srcDir, 'ui', 'views'),
      path.join(destDir, 'ui', 'views')
    );

    // Copy UI public files (CSS, JS, images)
    await safeCopyDir(
      path.join(srcDir, 'ui', 'public'),
      path.join(destDir, 'ui', 'public')
    );

    // Copy JavaScript files from routes directory
    await safeCopyDir(
      path.join(srcDir, 'routes'),
      path.join(destDir, 'routes'),
      { filter: (src) => !src.endsWith('.ts') && !src.endsWith('.d.ts') }
    );

    // Copy JavaScript files from controllers directory
    await safeCopyDir(
      path.join(srcDir, 'controllers'),
      path.join(destDir, 'controllers'),
      { filter: (src) => !src.endsWith('.ts') && !src.endsWith('.d.ts') }
    );

    // Copy JavaScript files from filters directory
    await safeCopyDir(
      path.join(srcDir, 'filters'),
      path.join(destDir, 'filters'),
      { filter: (src) => !src.endsWith('.ts') && !src.endsWith('.d.ts') }
    );

    // Copy JavaScript files from services directory (if it exists)
    await safeCopyDir(
      path.join(srcDir, 'services'),
      path.join(destDir, 'services'),
      { filter: (src) => !src.endsWith('.ts') && !src.endsWith('.d.ts') }
    );

    // Copy JavaScript files from components directory (if it exists)
    await safeCopyDir(
      path.join(srcDir, 'components'),
      path.join(destDir, 'components'),
      { filter: (src) => !src.endsWith('.ts') && !src.endsWith('.d.ts') && !src.endsWith('.tsx') }
    );

    console.log('Static assets and JavaScript files copied successfully!');
  } catch (err) {
    console.error('Error copying static assets:', err);
    process.exit(1);
  }
}

// Run the copy function
copyStaticAssets();
