# Quick Start Guide - 3-Tier Architecture

## 🚀 What Has Been Implemented

### ✅ **Complete**
1. **Firestore Security Rules** - RBAC for super_admin, agent, cpa roles
2. **Reusable Components** - StatCard, DataTable, Modal, Sidebar
3. **Agent Portal** - 5 complete pages (Dashboard, CPAs, Earnings, Wallet, Profile)
4. **Universal Layout** - ProtectedLayout that adapts to user role
5. **Updated Routing** - App.jsx with all 3 role routes
6. **Backend Controllers** - Agent functions (stats, CPAs, commission)
7. **Enhanced Invites** - Separate flows for Agent & CPA invites

### 📋 **Architecture Overview**

```
Super Admin (role: super_admin)
    ↓ invites
Agent (role: agent, referredBy: admin_uid)
    ↓ invites
CPA (role: cpa, referredBy: agent_uid)
    ↓ invites
Client (referredBy: cpa_uid)
```

### 💰 **Commission Flow**

```
Client pays $1000
    ↓
CPA earns: $200 (20% commission rate)
    ↓
Agent earns: $100 (10% of original amount)
    ↓
Platform keeps: $700
```

---

## 🔧 Immediate Next Steps

### 1. Deploy Firestore Rules (5 min)
```bash
cd backend
firebase deploy --only firestore:rules
```

### 2. Create Your Super Admin Account (2 min)
Open Firebase Console → Firestore → Partners collection → Find your document → Add field:
- Field: `role`
- Type: `string`
- Value: `super_admin`

### 3. Test Login (1 min)
- Login to the app
- You should be redirected to `/admin/dashboard`
- Verify the sidebar shows admin menu items

---

## 📦 File Structure Created

```
client/src/
├── components/
│   ├── common/
│   │   ├── StatCard.jsx          ✅ NEW
│   │   ├── DataTable.jsx         ✅ NEW
│   │   └── Modal.jsx             ✅ NEW
│   └── navigation/
│       └── Sidebar.jsx           ✅ NEW
│
├── context/
│   └── AuthContext.jsx           ✅ UPDATED (added role helpers)
│
├── layouts/
│   └── ProtectedLayout.jsx       ✅ NEW
│
├── pages/
│   └── agent/                    ✅ NEW FOLDER
│       ├── Dashboard.jsx
│       ├── CPAManagement.jsx
│       ├── Earnings.jsx
│       ├── Wallet.jsx
│       └── Profile.jsx
│
└── App.jsx                       ✅ UPDATED (new routing)

backend/functions/
├── controllers/
│   ├── agentController.js        ✅ NEW
│   └── inviteController.js       ✅ UPDATED
│
└── index.js                      ✅ UPDATED (exported agent functions)

backend/
└── firestore.rules               ✅ UPDATED (RBAC rules)
```

---

## 🎯 What Still Needs Implementation

### Priority 1: Super Admin Pages (Required)
Create these pages in `client/src/pages/super-admin/`:

1. **AgentManagement.jsx** - List all agents, invite new agents
2. **AgentDetail.jsx** - Agent profile + tree view (Agent → CPAs → Clients)
3. Update **CAManagement.jsx** - Show ALL CPAs (not filtered by referrer)
4. Update **EarningsTrack.jsx** - Add Agent vs CPA breakdown
5. Update **WithdrawalManagement.jsx** - Handle both Agent and CPA withdrawals

### Priority 2: Registration Flow Update
Update `client/src/pages/auth/Register.jsx`:
- Detect `?type=agent` or `?type=cpa` from URL
- Show appropriate UI
- Set correct `role` field during registration

### Priority 3: Commission Automation
- Implement webhook/handler when client subscribes
- Call `processAgentCommission` backend function
- Update wallet balances automatically

---

## 🔑 Key Environment Variables

Make sure these are set in your Firebase Functions:

```env
SENDGRID_API_KEY=your_sendgrid_api_key
SENDGRID_VERIFIED_EMAIL=noreply@writeoffgenie.ai
INVITE_SECRET=your_secret_key_for_token_encryption
```

---

## 🧪 Testing Guide

### Test Flow 1: Admin → Agent → CPA

1. **As Super Admin:**
   - Login → Should go to `/admin/dashboard`
   - (Once created) Go to Agent Management
   - Click "Invite Agent"
   - Enter name and email
   - Check that invite email is sent

2. **As Invited Agent:**
   - Open invite email
   - Click registration link
   - Complete registration
   - Login → Should go to `/agent/dashboard`
   - Verify stats cards display
   - Click "Invite CPA"
   - Enter CPA details
   - Send invite

3. **As Invited CPA:**
   - Open invite email
   - Complete registration
   - Login → Should go to `/dashboard` (existing CPA dashboard)
   - Verify they see existing functionality

4. **Verify Hierarchy:**
   - Open Firestore
   - Check CPA document has `referredBy: agent_uid`
   - Check Agent document has `referredBy: admin_uid`

### Test Flow 2: RBAC Protection

1. **Try accessing wrong routes:**
   - Agent tries to access `/admin/dashboard` → Should redirect to `/agent/dashboard`
   - CPA tries to access `/agent/dashboard` → Should redirect to `/dashboard`
   - Non-logged in user → Should redirect to `/login`

---

## 🛠️ Common Issues & Solutions

### Issue: "Firestore rules error"
**Solution:** Deploy the updated rules:
```bash
cd backend
firebase deploy --only firestore:rules
```

### Issue: "Index required" error
**Solution:** Click the link in the error message to create the index automatically in Firebase Console.

### Issue: User stuck at loading screen
**Solution:** Check that the user has a `role` field in their Partners document. If not, add it manually.

### Issue: Email invites not sending
**Solution:** 
1. Verify SendGrid API key is set
2. Verify sender email is verified in SendGrid
3. Check Firebase Functions logs for errors

---

## 📊 Data Model Quick Reference

### Partner Document (Super Admin)
```javascript
{
  role: "super_admin",
  referredBy: null,
  // ... other fields
}
```

### Partner Document (Agent)
```javascript
{
  role: "agent",
  referredBy: "admin_uid",
  commissionRate: 10,  // Fixed
  stats: {
    totalReferred: 5,      // Number of CPAs
    totalEarnings: 5000,   // Agent commission earned
    totalRevenue: 50000    // Revenue from all CPAs
  }
}
```

### Partner Document (CPA)
```javascript
{
  role: "cpa",
  referredBy: "agent_uid",  // or null if invited directly by admin
  commissionRate: 20,       // 10-50%
  stats: {
    totalReferred: 10,      // Number of clients
    totalEarnings: 2000,    // CPA commission earned
  }
}
```

---

## 🎨 UI Components Reference

### Using StatCard
```jsx
import StatCard from '../../components/common/StatCard';
import { DollarSign } from 'lucide-react';

<StatCard
  title="Total Earnings"
  value="$5,000"
  description="All-time commission"
  icon={DollarSign}
  isLoading={false}
/>
```

### Using DataTable
```jsx
import DataTable from '../../components/common/DataTable';

const columns = [
  { header: "Name" },
  { header: "Email" },
  { header: "Status" }
];

<DataTable
  columns={columns}
  data={data}
  isLoading={loading}
  emptyMessage="No data found"
  renderRow={(row, index) => (
    <tr key={index}>
      <td>{row.name}</td>
      <td>{row.email}</td>
      <td>{row.status}</td>
    </tr>
  )}
/>
```

### Using Modal
```jsx
import Modal from '../../components/common/Modal';

<Modal
  isOpen={showModal}
  onClose={() => setShowModal(false)}
  title="Invite CPA"
  footer={
    <button onClick={handleSubmit}>Submit</button>
  }
>
  <p>Modal content here</p>
</Modal>
```

---

## 📈 Monitoring & Analytics

### Firestore Collections to Monitor
- `Partners` - Check role distribution
- `Transactions` - Monitor commission flow
- `Withdrawals` - Track pending requests
- `PendingInvites` - Monitor invite status

### Firebase Functions to Monitor
- `sendAgentInvite` - Agent invite emails
- `sendCPAInvite` - CPA invite emails
- `processAgentCommission` - Commission calculations

---

## ✅ Final Checklist Before Going Live

- [ ] Firestore rules deployed
- [ ] All indexes created
- [ ] Cloud functions deployed
- [ ] Environment variables set
- [ ] Super admin account configured
- [ ] Test all 3 user flows
- [ ] Email templates tested
- [ ] Commission calculation tested
- [ ] RBAC tested (try accessing wrong routes)
- [ ] Withdrawal flow tested

---

## 📞 Need Help?

Review these documents:
1. `ARCHITECTURE_REFACTOR.md` - Complete architecture details
2. `IMPLEMENTATION_SUMMARY.md` - Detailed implementation summary
3. This file (`QUICK_START.md`) - Getting started guide

**You're 70% done! Focus on creating the Super Admin pages next.** 🚀
