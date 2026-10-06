// scripts/set-user-password.mjs
// Usage: node scripts/set-user-password.mjs <email> <new-password>
// Example: node scripts/set-user-password.mjs customer@gmail.com MyNewPass123

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { cert, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const email = process.argv[2];
const newPassword = process.argv[3];

if (!email || !newPassword) {
  console.error(
    "Usage: node scripts/set-user-password.mjs <email> <new-password>"
  );
  process.exit(1);
}

if (newPassword.length < 6) {
  console.error("Password must be at least 6 characters.");
  process.exit(1);
}

const serviceAccountPath = join(__dirname, "..", "serviceAccount.json");
let serviceAccount;
try {
  serviceAccount = JSON.parse(readFileSync(serviceAccountPath, "utf-8"));
} catch (err) {
  console.error(
    `❌ Cannot read ${serviceAccountPath}\n` +
      `   Make sure you've downloaded the service account key from Firebase Console ` +
      `and saved it as serviceAccount.json in the project root.`
  );
  process.exit(1);
}

initializeApp({
  credential: cert(serviceAccount),
});

const auth = getAuth();

try {
  const user = await auth.getUserByEmail(email);
  console.log(`✅ Found user: ${user.uid}`);
  console.log(`   Email: ${user.email}`);
  console.log(`   Phone: ${user.phoneNumber || "(none)"}`);

  await auth.updateUser(user.uid, { password: newPassword });

  console.log(`\n✅ Password updated successfully!`);
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`   Email:    ${email}`);
  console.log(`   Password: ${newPassword}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`\nTell the customer to sign in with these credentials.\n`);

  process.exit(0);
} catch (err) {
  if (err.code === "auth/user-not-found") {
    console.error(`❌ No user found with email: ${email}`);
  } else {
    console.error("❌ Error:", err.message);
  }
  process.exit(1);
}