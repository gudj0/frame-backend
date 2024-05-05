import admin from 'firebase-admin';

//const serviceAccount = require('./firebase-admin-key.json');
const base64Credential = process.env.FIREBASE_CREDENTIALS_BASE64;
const decodedCredential = JSON.parse(Buffer.from(base64Credential ?? '', 'base64').toString('utf-8'));

if (admin.apps.length === 0) {
    admin.initializeApp({credential: admin.credential.cert(decodedCredential)});
}
export const db = admin.firestore();