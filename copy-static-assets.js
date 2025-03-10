const fs = require('fs-extra');
const path = require('path');

// Define source and destination directories
const srcDir = path.join(__dirname, 'src');
const destDir = path.join(__dirname, 'dist');

// Function to copy static assets and JavaScript files
async function copyStaticAssets() {
  try {
    // Ensure the destination directory exists
    await fs.ensureDir(destDir);

    // Copy UI views (EJS templates)
    await fs.copy(
      path.join(srcDir, 'ui', 'views'),
      path.join(destDir, 'ui', 'views')
    );

    // Copy UI public files (CSS, JS, images)
    await fs.copy(
      path.join(srcDir, 'ui', 'public'),
      path.join(destDir, 'ui', 'public')
    );

    // Copy JavaScript files from routes directory
    await fs.copy(
      path.join(srcDir, 'routes'),
      path.join(destDir, 'routes'),
      { filter: (src) => !src.endsWith('.ts') && !src.endsWith('.d.ts') }
    );

    // Copy JavaScript files from controllers directory
    await fs.copy(
      path.join(srcDir, 'controllers'),
      path.join(destDir, 'controllers'),
      { filter: (src) => !src.endsWith('.ts') && !src.endsWith('.d.ts') }
    );

    // Copy JavaScript files from filters directory
    await fs.copy(
      path.join(srcDir, 'filters'),
      path.join(destDir, 'filters'),
      { filter: (src) => !src.endsWith('.ts') && !src.endsWith('.d.ts') }
    );

    // Copy JavaScript files from services directory
    await fs.copy(
      path.join(srcDir, 'services'),
      path.join(destDir, 'services'),
      { filter: (src) => !src.endsWith('.ts') && !src.endsWith('.d.ts') }
    );

    console.log('Static assets and JavaScript files copied successfully!');
  } catch (err) {
    console.error('Error copying static assets:', err);
    process.exit(1);
  }
}

// Run the copy function
copyStaticAssets();
