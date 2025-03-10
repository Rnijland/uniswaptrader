const fs = require('fs-extra');
const path = require('path');

// Define source and destination directories
const srcDir = path.join(__dirname, 'src');
const destDir = path.join(__dirname, 'dist');

// Function to copy static assets
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

    console.log('Static assets copied successfully!');
  } catch (err) {
    console.error('Error copying static assets:', err);
    process.exit(1);
  }
}

// Run the copy function
copyStaticAssets();
