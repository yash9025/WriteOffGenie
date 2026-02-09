# Backend Cloud Functions Required

Before testing the complete flow, you need to ensure these Cloud Functions exist in your backend:

## Already Implemented ✅
- `sendCPAInvite` - Sends CPA invitation emails (enhanced in inviteController.js)
- `verifyInvite` - Verifies invite tokens (needs update for inviteType field)
- `registerCA` - Registers CPA users
- `toggleCAStatus` - Enables/disables CPA accounts

## Need to be Created ❌

### 1. `sendAgentInvite`
**Location**: `backend/functions/controllers/inviteController.js`

Already added to inviteController.js. Just need to export it in `backend/functions/index.js`:

```javascript
exports.sendAgentInvite = onCall(async (request) => {
  // Check if caller is super_admin
  const callerDoc = await db.collection('Partners').doc(request.auth.uid).get();
  if (!callerDoc.exists || callerDoc.data().role !== 'super_admin') {
    throw new functions.https.HttpsError('permission-denied', 'Only Super Admins can invite Agents');
  }

  const { name, email } = request.data;
  
  // Create invite token
  const token = generateToken();
  const inviteData = {
    name,
    email,
    inviteType: 'agent',
    referredBy: request.auth.uid, // Super Admin who sent the invite
    createdAt: FieldValue.serverTimestamp(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
  };
  
  await db.collection('PendingInvites').doc(token).set(inviteData);
  
  // Send email via SendGrid
  const inviteUrl = `https://writeoffgenie.ai/register?token=${token}`;
  await sendEmail(email, 'Agent Invite', inviteUrl, name);
  
  return { success: true };
});
```

### 2. `registerAgent`
**Location**: Create in `backend/functions/controllers/agentController.js` or create new file

```javascript
exports.registerAgent = onCall(async (request) => {
  const { name, email, password, phone, inviteToken } = request.data;
  
  // Verify invite token
  const inviteDoc = await db.collection('PendingInvites').doc(inviteToken).get();
  if (!inviteDoc.exists) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid invite token');
  }
  
  const inviteData = inviteDoc.data();
  if (inviteData.email !== email || inviteData.inviteType !== 'agent') {
    throw new functions.https.HttpsError('invalid-argument', 'Token mismatch or wrong invite type');
  }
  
  // Create Firebase Auth user
  const userRecord = await admin.auth().createUser({
    email,
    password,
    displayName: name
  });
  
  // Create Partner document with role='agent'
  await db.collection('Partners').doc(userRecord.uid).set({
    displayName: name,
    email,
    phoneNumber: phone,
    role: 'agent',
    commissionRate: 10, // Fixed for agents
    referredBy: inviteData.referredBy, // Super Admin ID
    referralCode: generateReferralCode(),
    walletBalance: 0,
    status: 'active',
    createdAt: FieldValue.serverTimestamp(),
    stats: {
      totalEarnings: 0,
      totalReferred: 0,
      totalRevenue: 0
    }
  });
  
  // Delete used invite
  await db.collection('PendingInvites').doc(inviteToken).delete();
  
  return { success: true, uid: userRecord.uid };
});
```

### 3. Update `verifyInvite` Function
**Location**: `backend/functions/controllers/inviteController.js`

Add `inviteType` and `referredBy` to the response:

```javascript
exports.verifyInvite = onCall(async (request) => {
  const { token } = request.data;
  
  const inviteDoc = await db.collection('PendingInvites').doc(token).get();
  if (!inviteDoc.exists) {
    return { valid: false };
  }
  
  const data = inviteDoc.data();
  const now = new Date();
  const expiresAt = data.expiresAt.toDate();
  
  if (now > expiresAt) {
    await db.collection('PendingInvites').doc(token).delete();
    return { valid: false };
  }
  
  return { 
    valid: true, 
    name: data.name, 
    email: data.email,
    commissionRate: data.commissionRate || 10,
    inviteType: data.inviteType || 'cpa', // NEW: Default to 'cpa' for backward compatibility
    referredBy: data.referredBy // NEW: ID of referrer (admin or agent)
  };
});
```

### 4. Update `sendCPAInvite` Function
**Location**: `backend/functions/controllers/inviteController.js`

Add `inviteType` and `referredBy` fields:

```javascript
exports.sendCPAInvite = onCall(async (request) => {
  const { name, email, commissionRate } = request.data;
  
  // Check permissions - can be called by super_admin or agent
  const callerDoc = await db.collection('Partners').doc(request.auth.uid).get();
  if (!callerDoc.exists) {
    throw new functions.https.HttpsError('permission-denied', 'Unauthorized');
  }
  
  const callerRole = callerDoc.data().role;
  if (callerRole !== 'super_admin' && callerRole !== 'agent') {
    throw new functions.https.HttpsError('permission-denied', 'Only Admins and Agents can invite CPAs');
  }
  
  // Create invite token
  const token = generateToken();
  const inviteData = {
    name,
    email,
    commissionRate,
    inviteType: 'cpa', // NEW
    referredBy: request.auth.uid, // NEW: Can be admin or agent ID
    createdAt: FieldValue.serverTimestamp(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  };
  
  await db.collection('PendingInvites').doc(token).set(inviteData);
  
  // Send email
  const inviteUrl = `https://writeoffgenie.ai/register?token=${token}`;
  await sendEmail(email, 'CPA Invite', inviteUrl, name);
  
  return { success: true };
});
```

### 5. Update `registerCA` Function
**Location**: `backend/functions/controllers/caController.js`

Use `referredBy` from invite instead of hardcoding:

```javascript
exports.registerCA = onCall(async (request) => {
  const { name, email, password, phone, caRegNumber, commissionRate, inviteToken } = request.data;
  
  // Verify invite
  const inviteDoc = await db.collection('PendingInvites').doc(inviteToken).get();
  if (!inviteDoc.exists) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid invite token');
  }
  
  const inviteData = inviteDoc.data();
  if (inviteData.email !== email || inviteData.inviteType !== 'cpa') {
    throw new functions.https.HttpsError('invalid-argument', 'Token mismatch or wrong invite type');
  }
  
  // Create user
  const userRecord = await admin.auth().createUser({
    email,
    password,
    displayName: name
  });
  
  // Create Partner document with role='cpa'
  await db.collection('Partners').doc(userRecord.uid).set({
    displayName: name,
    email,
    phoneNumber: phone,
    caRegNumber: caRegNumber || '',
    role: 'cpa',
    commissionRate: commissionRate,
    referredBy: inviteData.referredBy, // NEW: Use from invite (can be admin or agent)
    referralCode: generateReferralCode(),
    walletBalance: 0,
    status: 'active',
    createdAt: FieldValue.serverTimestamp(),
    stats: {
      totalEarnings: 0,
      totalReferred: 0,
      totalRevenue: 0
    }
  });
  
  // Delete used invite
  await db.collection('PendingInvites').doc(inviteToken).delete();
  
  return { success: true, uid: userRecord.uid };
});
```

## Firebase Indexes Required

Add these composite indexes to Firestore:

1. **Partners Collection**:
   - Fields: `role` (Ascending), `createdAt` (Descending)
   - Fields: `referredBy` (Ascending), `role` (Ascending)

2. **Clients Collection**:
   - Fields: `referredBy` (Ascending), `createdAt` (Descending)

3. **Payouts Collection**:
   - Already has: `requestedAt` (Descending)

## Deployment Steps

1. Update all Cloud Functions in `backend/functions/index.js`:
```javascript
// Existing exports
exports.sendCPAInvite = require('./controllers/inviteController').sendCPAInvite;
exports.verifyInvite = require('./controllers/inviteController').verifyInvite;
exports.registerCA = require('./controllers/caController').registerCA;

// NEW exports
exports.sendAgentInvite = require('./controllers/inviteController').sendAgentInvite;
exports.registerAgent = require('./controllers/agentController').registerAgent;
```

2. Deploy functions:
```bash
cd backend/functions
firebase deploy --only functions
```

3. Deploy Firestore rules:
```bash
firebase deploy --only firestore:rules
```

4. Create indexes (Firebase will prompt or use Firebase Console)

5. Deploy frontend:
```bash
cd ../../client
npm run build
# Deploy to Vercel or your hosting
```

## First-Time Setup

1. Create your first Super Admin manually in Firestore:
```javascript
// In Firestore Console, add to Partners collection:
{
  displayName: "Your Name",
  email: "your@email.com",
  role: "super_admin",
  status: "active",
  createdAt: [current timestamp]
}
```

2. Set custom claim in Firebase Auth (using Firebase Admin SDK or Console):
```javascript
admin.auth().setCustomUserClaims(uid, { role: 'super_admin' });
```

Now you can login and start inviting Agents!
