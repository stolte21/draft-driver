/**
 * Copies the weekly-ALL tier CSVs from the local fftiers pipeline output
 * into data/tiers/, where the rankings API prefers them over Boris Chen's
 * S3 bucket. Override the source directory with FFTIERS_CSV_DIR.
 *
 * Usage: npm run sync-tiers
 */
const fs = require('fs');
const path = require('path');
const os = require('os');

const srcDir =
  process.env.FFTIERS_CSV_DIR ||
  path.join(os.homedir(), 'dev', 'fftiers', 'out', 'current', 'csv');
const destDir = path.join(__dirname, '..', 'data', 'tiers');

const files = ['weekly-ALL.csv', 'weekly-ALL-PPR.csv', 'weekly-ALL-HALF-PPR.csv'];

fs.mkdirSync(destDir, { recursive: true });

let failed = false;
for (const file of files) {
  const src = path.join(srcDir, file);
  try {
    fs.copyFileSync(src, path.join(destDir, file));
    console.log(`synced ${file}`);
  } catch (err) {
    failed = true;
    console.error(`failed to copy ${src}: ${err.message}`);
  }
}

if (failed) {
  console.error(
    '\nRun the fftiers pipeline first (cd ~/projects/fftiers && Rscript src/main.R t),' +
      '\nor point FFTIERS_CSV_DIR at the directory containing the weekly-ALL CSVs.'
  );
  process.exit(1);
}
