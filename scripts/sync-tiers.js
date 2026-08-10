/**
 * Copies the weekly-ALL tier CSVs from the local fftiers pipeline output
 * into public/tiers/, where the rankings API prefers them over Boris Chen's
 * S3 bucket and they are served directly at /tiers/*.csv. Override the
 * source directory with FFTIERS_CSV_DIR.
 *
 * Usage: npm run sync-tiers
 */
const fs = require('fs');
const path = require('path');
const os = require('os');

const srcDir =
  process.env.FFTIERS_CSV_DIR ||
  path.join(os.homedir(), 'dev', 'fftiers', 'out', 'current', 'csv');
const destDir = path.join(__dirname, '..', 'public', 'tiers');

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

if (!failed) {
  // Vercel normalizes file mtimes inside function bundles, so record the
  // sync time explicitly for the API's last-modified reporting. The file is
  // served publicly at /tiers/metadata.json, so it also carries attribution
  // for consumers of the CSVs.
  fs.writeFileSync(
    path.join(destDir, 'metadata.json'),
    JSON.stringify(
      {
        syncedAt: new Date().toUTCString(),
        attribution: {
          methodology:
            "Tiers generated using Boris Chen's open source fftiers project",
          methodologySource: 'https://github.com/borisachen/fftiers',
          methodologyWebsite: 'https://www.borischen.co',
          dataSource:
            'Underlying rankings data from FantasyPros expert consensus (https://www.fantasypros.com)',
        },
      },
      null,
      2
    ) + '\n'
  );
  console.log('wrote metadata.json');
}

if (failed) {
  console.error(
    '\nRun the fftiers pipeline first (cd ~/projects/fftiers && Rscript src/main.R t),' +
      '\nor point FFTIERS_CSV_DIR at the directory containing the weekly-ALL CSVs.'
  );
  process.exit(1);
}
