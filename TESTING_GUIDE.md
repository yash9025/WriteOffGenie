# Complete Testing Guide - 3-Tier Partner System

## Overview
This guide walks through testing the complete flow: **Super Admin → Agent → CPA → Client**

---

## ⚠️ Prerequisites

Before testing, ensure:

1. ✅ All backend Cloud Functions are deployed (see BACKEND_FUNCTIONS_NEEDED.md)
2. ✅ Firestore security rules are updated
3. ✅ Firebase composite indexes are created
4. ✅ You have a Super Admin account set up

---

## 🧪 Test Flow 1: Super Admin → Agent → CPA → Client

### Step 1: Login as Super Admin

**URL**: https://writeoffgenie.ai/login

**Credentials**: Your Super Admin account

**Expected**:
- ✅ Redirects to `/admin/dashboard`
- ✅ Shows Super Admin dashboard with stats
- ✅ Sidebar shows: Dashboard, Agents, CPAs, Earnings, Withdrawals

---

### Step 2: Invite An Agent

**Navigation**: Click "Agents" in sidebar → `/admin/agents`

**Actions**:
1. Click "Invite Agent" button
2. Fill form:
   - Name: "John Agent"
   - Email: "john.agent@test.com"
3. Click "Send Invite"

**Expected**:
- ✅ Success toast: "Invitation sent successfully!"
- ✅ Email sent to john.agent@test.com with invite link
- ✅ Invite link format: `https://writeoffgenie.ai/register?token=ABC123`

**Check Database**:
- Collection: `PendingInvites`
- Document ID: (random token)
- Fields:
  ```javascript
  {
    name: "John Agent",
    email: "john.agent@test.com",
    inviteType: "agent",
    referredBy: "<your super_admin uid>",
    createdAt: Timestamp,
    expiresAt: Timestamp (+7 days)
  }
  ```

---

### Step 3: Agent Registration

**URL**: Click invite link from email (or copy token manually)

`https://writeoffgenie.ai/register?token=ABC123`

**Expected UI**:
- ✅ Header: "Become an Agent Partner"
- ✅ Subtitle: "Join as an Agent and earn 10% commission on all referrals"
- ✅ Commission badge: "Your commission rate: 10% (Fixed for Agents)"
- ✅ Fields shown: Name (prefilled), Email (prefilled), Phone, Password
- ✅ CA Reg Number field NOT shown (only for CPAs)
- ✅ Button text: "Join as Agent"

**Actions**:
1. Fill Phone: "+1234567890"
2. Fill Password: "password123"
3. Click "Join as Agent"

**Expected**:
- ✅ Success registration
- ✅ Auto-login
- ✅ Redirect to `/agent/dashboard`

**Check Database**:
- Collection: `Partners`
- Document ID: (new agent uid)
- Fields:
  ```javascript
  {
    displayName: "John Agent",
    email: "john.agent@test.com",
    phoneNumber: "+1234567890",
    role: "agent",
    commissionRate: 10,
    referredBy: "<super_admin uid>",
    referralCode: "AG-XXXXX",
    walletBalance: 0,
    status: "active",
    createdAt: Timestamp,
    stats: { totalEarnings: 0, totalReferred: 0, totalRevenue: 0 }
  }
  ```

- Collection: `PendingInvites`
- Token document should be DELETED

---

### Step 4: Agent Dashboard View

**URL**: `/agent/dashboard` (auto-redirected after registration)

**Expected UI**:
- ✅ Stats cards show:
  - Total CPAs Referred: 0
  - Total Earnings: $0.00
  - Wallet Balance: $0.00
  - Active Subscriptions: 0
- ✅ CPA Referrals chart (empty state)
- ✅ Earnings Trend chart (empty)
- ✅ Invite CPA button visible
- ✅ Sidebar menu:
  - Dashboard
  - CPA Management
  - Earnings
  - Wallet
  - Profile

---

### Step 5: Agent Invites CPA

**Navigation**: Click "CPA Management" → `/agent/cpas`

**Actions**:
1. Click "Invite CPA Partner" button
2. Fill form:
   - Name: "Sarah CPA"
   - Email: "sarah.cpa@test.com"
   - Commission Rate: 25%
3. Click "Send Invite"

**Expected**:
- ✅ Success toast
- ✅ Email sent to sarah.cpa@test.com
- ✅ Invite link format: `https://writeoffgenie.ai/register?token=XYZ789`

**Check Database**:
- Collection: `PendingInvites`
- Fields:
  ```javascript
  {
    name: "Sarah CPA",
    email: "sarah.cpa@test.com",
    commissionRate: 25,
    inviteType: "cpa",
    referredBy: "<agent uid>", // NOT super_admin uid!
    createdAt: Timestamp,
    expiresAt: Timestamp
  }
  ```

---

### Step 6: CPA Registration

**URL**: Click CPA invite link

`https://writeoffgenie.ai/register?token=XYZ789`

**Expected UI**:
- ✅ Header: "Become a CPA Partner"
- ✅ Subtitle: "Sign up to start earning commissions today"
- ✅ Commission badge: "Your commission rate: 25%"
- ✅ Fields shown: Name, Email, Phone, CA Reg Number (optional), Password
- ✅ Button: "Create CPA Account"

**Actions**:
1. Fill Phone: "+1987654321"
2. Fill CA Reg Number: "CAL123456" (optional)
3. Fill Password: "password456"
4. Click "Create CPA Account"

**Expected**:
- ✅ Success registration
- ✅ Auto-login
- ✅ Redirect to `/dashboard` (CPA dashboard)

**Check Database**:
- Collection: `Partners`
- Document ID: (new CPA uid)
- Fields:
  ```javascript
  {
    displayName: "Sarah CPA",
    email: "sarah.cpa@test.com",
    phoneNumber: "+1987654321",
    caRegNumber: "CAL123456",
    role: "cpa",
    commissionRate: 25,
    referredBy: "<agent uid>", // IMPORTANT: Should be Agent's ID
    referralCode: "CPA-XXXXX",
    walletBalance: 0,
    status: "active",
    createdAt: Timestamp,
    stats: { totalEarnings: 0, totalReferred: 0, totalRevenue: 0 }
  }
  ```

---

### Step 7: Verify Agent Can See CPA

**Logout and login as Agent**

**Navigation**: `/agent/cpas`

**Expected**:
- ✅ Table shows 1 CPA:
  - Name: "Sarah CPA"
  - Email: sarah.cpa@test.com
  - Commission Rate: 25%
  - Total Earnings: $0.00
  - Referred Clients: 0
  - Status: Active
  - Actions: View button

---

### Step 8: Verify Super Admin Can See Both

**Logout and login as Super Admin**

**Check 1 - Agents Page**: `/admin/agents`
- ✅ Shows 1 agent: "John Agent"
- ✅ CPAs Referred column shows: 1
- ✅ Total Earnings: $0.00
- ✅ Click "View" opens `/admin/agents/<agent-id>`

**Check 2 - Agent Detail Page**: `/admin/agents/<agent-id>`
- ✅ Shows Agent profile with stats
- ✅ Hierarchy Tree View shows:
  - Agent: John Agent
    - CPA: Sarah CPA (expandable)
      - Clients: (empty - no clients yet)

**Check 3 - CPAs Page**: `/admin/cpas`
- ✅ Shows 1 CPA: "Sarah CPA"
- ✅ Referred By column shows: "John Agent" (in blue #4D7CFE color)
- ✅ If CPA was invited by admin directly, shows "Direct"

**Check 4 - Earnings Page**: `/admin/earnings`
- ✅ Shows 6 stat cards:
  - Total Agent Revenue: $0
  - Total Agent Commission: $0
  - Net Agent Revenue: $0
  - Total CPA Revenue: $0
  - Total CPA Commission: $0
  - Net CPA Revenue: $0
- ✅ Table has columns: Date, CPA Name, Agent, User, Amount, CPA Comm, Agent Comm, Net Revenue, Status

**Check 5 - Withdrawals Page**: `/admin/withdrawals`
- ✅ Shows 3 tabs: All Withdrawals | Agent Withdrawals | CPA Withdrawals
- ✅ Table has "Role" column (badge showing "Agent" in blue or "CPA" in green)

---

## 🧪 Test Flow 2: CPA Refers Client → Commission Calculation

### Step 9: CPA Invites Client

**Login as CPA** (Sarah CPA)

**Navigation**: `/my-referrals` or Dashboard

**Actions**:
1. Get referral link from dashboard
2. Share link: `https://writeoffgenie.ai/join?code=CPA-XXXXX`

### Step 10: Client Registers

**URL**: Use CPA's referral link

**Expected**:
- ✅ Client registration form
- ✅ Upon completion, Client document created with:
  ```javascript
  {
    referredBy: "<cpa uid>",
    ...other fields
  }
  ```

### Step 11: Client Subscribes

**Simulate subscription** (via Stripe webhook or manual Firestore update):

Create Firestore document:
- Collection: `Clients/<client-uid>`
- Update fields:
  ```javascript
  {
    subscription: {
      status: "active",
      amountPaid: 100, // $100
      planType: "Premium"
    }
  }
  ```

### Step 12: Verify Commission Calculations

**Expected Calculations** (for $100 subscription):
- CPA Commission (25%): $25
- Agent Commission (10%): $10
- Net Platform Revenue: $65

**Login as CPA**:
- `/dashboard` should show:
  - Total Earnings: $25
  - Wallet Balance: $25

**Login as Agent**:
- `/agent/dashboard` should show:
  - Total Earnings: $10
  - Wallet Balance: $10
  - Total CPAs Referred: 1
  - Active Subscriptions: 1

**Login as Super Admin**:
- `/admin/earnings` should show:
  - Total Agent Revenue: $100
  - Total Agent Commission: $10
  - Total CPA Revenue: $100
  - Total CPA Commission: $25
  - Table row shows:
    - CPA Name: Sarah CPA (green)
    - Agent: John Agent (blue)
    - Amount: $100
    - CPA Comm: $25
    - Agent Comm: $10
    - Net Revenue: $65

---

## 🧪 Test Flow 3: Withdrawal Requests

### Step 13: CPA Requests Withdrawal

**Login as CPA**

**Navigation**: `/payouts`

**Actions**:
1. Enter withdrawal amount: $25
2. Fill bank details
3. Submit

**Check Database**:
- Collection: `Payouts`
- Fields:
  ```javascript
  {
    partner_id: "<cpa uid>",
    amount: 25,
    status: "pending",
    requestedAt: Timestamp,
    bankSnapshot: {...}
  }
  ```

### Step 14: Agent Requests Withdrawal

**Login as Agent**

**Navigation**: `/agent/wallet`

**Actions**:
1. Enter amount: $10
2. Fill bank details
3. Submit

### Step 15: Super Admin Reviews Withdrawals

**Login as Super Admin**

**Navigation**: `/admin/withdrawals`

**Expected**:
- ✅ Default tab: "All Withdrawals" shows both
- ✅ Click "CPA Withdrawals" tab: Shows only Sarah's $25 request
- ✅ Click "Agent Withdrawals" tab: Shows only John's $10 request
- ✅ Role column shows color-coded badges:
  - Agent: Blue (#4D7CFE) badge
  - CPA: Green (#00C853) badge

**Actions**:
1. Click "View Details" on CPA withdrawal
2. Click "Approve"
3. Click "Mark as Paid"

**Expected**:
- ✅ Withdrawal status changes
- ✅ CPA wallet balance updates

---

## 🧪 Test Flow 4: Hierarchy Validation

### Step 16: Agent Detail Tree View

**Login as Super Admin**

**Navigation**: `/admin/agents` → Click "View" on John Agent

**Expected UI**:
- ✅ Gradient header with agent profile
- ✅ 4 stat cards
- ✅ Hierarchy Tree View section with:

```
🟦 John Agent (Agent • 1 CPAs)
    Commission Earned: $10
    └── 🟢 Sarah CPA (CPA • 1 Clients • 25% rate)
            CPA Earnings: $25
            └── 🔴 Client Name
                    [active badge]
```

- ✅ Click chevron to expand/collapse CPA → Clients
- ✅ Color coding:
  - Agent: Blue (#4D7CFE)
  - CPA: Green (#00C853)
  - Client: Red (#FF6B6B)

---

## ✅ Validation Checklist

After completing all test flows, verify:

### Data Model
- [ ] Agent has `role: 'agent'`, `commissionRate: 10`, `referredBy: <super_admin_uid>`
- [ ] CPA has `role: 'cpa'`, `commissionRate: 25`, `referredBy: <agent_uid>`
- [ ] Client has `referredBy: <cpa_uid>`

### Permissions (Firestore Rules)
- [ ] Agents can only read their own CPAs
- [ ] CPAs can only read their own clients
- [ ] Super Admin can read everything
- [ ] Agent cannot modify CPA's commission rate

### Commission Logic
- [ ] Agent always gets 10% of subscription amount
- [ ] CPA gets their specific rate (10-50%)
- [ ] Both commissions are calculated independently (not nested)

### UI/UX
- [ ] Agent invite shows "10% Fixed" badge
- [ ] CPA invite shows custom percentage
- [ ] Registration pages have different messaging
- [ ] Withdrawals page filters correctly by role
- [ ] Earnings page shows breakdown

### Email Invites
- [ ] Agent invite email has correct subject/content
- [ ] CPA invite email has correct subject/content
- [ ] Invite links work and expire after 7 days
- [ ] Used invite tokens are deleted

---

## 🐛 Common Issues & Solutions

### Issue: "Invalid invite token"
**Solution**: Check PendingInvites collection, ensure token exists and hasn't expired

### Issue: CPA shows "Direct" instead of Agent name
**Solution**: Verify CPA's `referredBy` field points to Agent UID, not super_admin

### Issue: Agent commission is 0
**Solution**: Check commission calculation logic in backend processAgentCommission function

### Issue: Can't login after registration
**Solution**: Verify role field is set correctly ('agent', 'cpa', or 'super_admin')

### Issue: Registration page shows wrong invite type
**Solution**: Check PendingInvites document has correct `inviteType` field

---

## 📊 Test Data Summary

After completing all tests, your database should have:

**Partners Collection**:
1. Super Admin (you)
2. Agent: John Agent
3. CPA: Sarah CPA

**Clients Collection**:
1. Client referred by Sarah CPA

**Payouts Collection**:
1. Agent withdrawal: $10
2. CPA withdrawal: $25

**Hierarchy**:
```
Super Admin
└── Agent (John)
    └── CPA (Sarah)
        └── Client
```

**Expected Commissions** (for 1 $100 subscription):
- CPA (Sarah): $25 (25%)
- Agent (John): $10 (10%)
- Platform Net: $65

---

## 🎯 Success Criteria

✅ All 16 test steps completed without errors
✅ Hierarchy correctly shows 3 tiers
✅ Commissions calculated accurately
✅ Withdrawals filtered by role
✅ Invites sent with correct type
✅ Registration UI adapts to invite type
✅ No permission errors in console

---

## 📝 Notes

- Test with real emails to verify SendGrid integration
- Use test Stripe account for subscription testing
- Check browser console for any JavaScript errors
- Monitor Firebase Functions logs for backend errors
- Validate Firestore security rules in Firebase Console

**Good luck with testing! 🚀**
