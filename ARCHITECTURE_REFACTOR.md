# WriteOffGenie - 3-Tier Architecture Refactor Plan

## 🏗️ New Hierarchy Structure
```
Super Admin → Agent → CPA → Client
```

---

## 📊 Firestore Data Model

### 1. **Partners Collection** (Unified)
Stores Super Admins, Agents, and CPAs in a single collection.

```javascript
// Document ID: {uid}
{
  // Core Identity
  uid: "string",
  email: "string",
  displayName: "string",
  phoneNumber: "string | null",
  photoURL: "string | null",
  
  // Role & Hierarchy (NEW)
  role: "super_admin" | "agent" | "cpa",  // NEW FIELD
  referredBy: "uid | null",  // NEW: Parent in hierarchy (null for super_admin)
  
  // Business Info
  businessName: "string | null",
  address: "string | null",
  
  // Referral System
  referralCode: "string (8-char unique)",
  
  // Financial
  walletBalance: 0,
  commissionRate: 10,  // For CPAs: 10-50%, For Agents: Fixed 10%
  
  // Stats
  stats: {
    totalReferred: 0,      // For Agents: # of CPAs, For CPAs: # of Clients
    totalSubscribed: 0,    // Active subscriptions from referrals
    totalEarnings: 0,      // All-time commission earned
    totalRevenue: 0,       // For Agents: Revenue from all their CPAs
  },
  
  // Status & Metadata
  status: "active" | "inactive" | "suspended",
  emailVerified: false,
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### 2. **Clients Collection** (No Changes)
```javascript
// Document ID: {uid}
{
  uid: "string",
  email: "string",
  displayName: "string",
  referredBy: "cpa_uid",  // CPA who referred this client
  subscriptionStatus: "active" | "inactive" | "cancelled",
  subscriptionPlan: "basic" | "premium" | "enterprise",
  monthlyRevenue: 0,
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### 3. **Transactions Collection** (Enhanced)
```javascript
// Document ID: auto-generated
{
  id: "auto",
  type: "commission" | "revenue" | "withdrawal",
  amount: 0,
  
  // Hierarchy Tracking (NEW)
  clientId: "uid",
  cpaId: "uid",
  agentId: "uid | null",  // NEW: The agent who gets 10%
  
  // Commission Breakdown (NEW)
  cpaCommission: 0,      // CPA's share (10-50% based on their rate)
  agentCommission: 0,    // NEW: Agent's share (10% of revenue)
  platformRevenue: 0,    // Remaining amount for platform
  
  description: "string",
  status: "completed" | "pending" | "failed",
  createdAt: Timestamp
}
```

### 4. **Withdrawals Collection** (Enhanced)
```javascript
// Document ID: auto-generated
{
  id: "auto",
  partnerId: "uid",     // Can be either Agent or CPA
  partnerRole: "agent" | "cpa",  // NEW: To differentiate easily
  partnerName: "string",
  partnerEmail: "string",
  
  amount: 0,
  bankDetails: {
    accountName: "string",
    accountNumber: "string",
    bankName: "string",
    ifscCode: "string"
  },
  
  status: "pending" | "approved" | "rejected",
  requestedAt: Timestamp,
  processedAt: Timestamp | null,
  processedBy: "admin_uid | null",
  notes: "string | null"
}
```

### 5. **PendingInvites Collection** (Enhanced)
```javascript
// Document ID: auto-generated
{
  id: "auto",
  inviteType: "agent" | "cpa",  // NEW: Distinguish invite type
  
  name: "string",
  email: "string",
  commissionRate: 10,  // For CPAs only (Agents always 10%)
  
  invitedBy: "uid",
  invitedByRole: "super_admin" | "agent",  // NEW: Who sent the invite
  
  status: "pending" | "accepted" | "expired",
  token: "encrypted_string",
  expiresAt: Timestamp,
  createdAt: Timestamp
}
```

---

## 🔐 Firestore Security Rules (Updated)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper Functions
    function isSignedIn() {
      return request.auth != null;
    }
    
    function getUserRole() {
      return get(/databases/$(database)/documents/Partners/$(request.auth.uid)).data.role;
    }
    
    function isSuperAdmin() {
      return isSignedIn() && getUserRole() == 'super_admin';
    }
    
    function isAgent() {
      return isSignedIn() && getUserRole() == 'agent';
    }
    
    function isCPA() {
      return isSignedIn() && getUserRole() == 'cpa';
    }
    
    function isOwner(uid) {
      return isSignedIn() && request.auth.uid == uid;
    }
    
    // Partners Collection
    match /Partners/{partnerId} {
      // Read: Users can read their own document, Super Admins read all, Agents read their CPAs
      allow read: if isOwner(partnerId) 
                  || isSuperAdmin() 
                  || (isAgent() && resource.data.referredBy == request.auth.uid);
      
      // Create: Only through Cloud Functions (invite system)
      allow create: if false;
      
      // Update: Users can update their own profile (restricted fields)
      allow update: if isOwner(partnerId) && !request.resource.data.diff(resource.data).affectedKeys().hasAny(['role', 'walletBalance', 'stats', 'referralCode', 'referredBy', 'createdAt']);
      
      // Delete: Only Super Admin
      allow delete: if isSuperAdmin();
    }
    
    // Clients Collection
    match /Clients/{clientId} {
      // Read: Client can read own, CPA can read their referrals, Agent can read CPAs' referrals, Super Admin reads all
      allow read: if isOwner(clientId) 
                  || isSuperAdmin()
                  || (isCPA() && resource.data.referredBy == request.auth.uid)
                  || (isAgent() && get(/databases/$(database)/documents/Partners/$(resource.data.referredBy)).data.referredBy == request.auth.uid);
      
      // Write: Managed by Cloud Functions
      allow write: if false;
    }
    
    // Transactions Collection
    match /Transactions/{transactionId} {
      // Read: Super Admin, or if user is involved (as agent, cpa, or client)
      allow read: if isSuperAdmin() 
                  || resource.data.agentId == request.auth.uid
                  || resource.data.cpaId == request.auth.uid
                  || resource.data.clientId == request.auth.uid;
      
      // Write: Only Cloud Functions
      allow write: if false;
    }
    
    // Withdrawals Collection
    match /Withdrawals/{withdrawalId} {
      // Read: Own withdrawals or Super Admin
      allow read: if isOwner(resource.data.partnerId) || isSuperAdmin();
      
      // Create: Agents and CPAs can request withdrawals
      allow create: if (isAgent() || isCPA()) && request.resource.data.partnerId == request.auth.uid;
      
      // Update: Only Super Admin (for approval/rejection)
      allow update: if isSuperAdmin();
      
      allow delete: if false;
    }
    
    // PendingInvites Collection
    match /PendingInvites/{inviteId} {
      // Read: Own invites or who sent them
      allow read: if isOwner(resource.data.invitedBy) || isSuperAdmin();
      
      // Create: Super Admin can invite Agents/CPAs, Agents can invite CPAs
      allow create: if (isSuperAdmin() && request.resource.data.inviteType in ['agent', 'cpa'])
                    || (isAgent() && request.resource.data.inviteType == 'cpa' && request.resource.data.invitedBy == request.auth.uid);
      
      // Update/Delete: Only Cloud Functions
      allow update, delete: if false;
    }
  }
}
```

### Required Firestore Indexes
```javascript
// Collection: Partners
// Fields: referredBy (Ascending), createdAt (Descending)

// Collection: Clients  
// Fields: referredBy (Ascending), createdAt (Descending)

// Collection: Transactions
// Fields: agentId (Ascending), createdAt (Descending)
// Fields: cpaId (Ascending), createdAt (Descending)

// Collection: Withdrawals
// Fields: partnerId (Ascending), status (Ascending), requestedAt (Descending)
// Fields: status (Ascending), requestedAt (Descending)
```

---

## 📁 Updated Folder Structure (Clean & Organized)

```
client/src/
├── assets/
│   ├── logo_writeoffgenie.svg
│   └── ... (images, fonts, etc.)
│
├── components/              # Shared Components
│   ├── common/
│   │   ├── StatCard.jsx           # Reusable stats card
│   │   ├── DataTable.jsx          # Reusable table component
│   │   ├── Loader.jsx
│   │   ├── Modal.jsx              # Reusable modal
│   │   └── InputGroup.jsx
│   │
│   ├── navigation/
│   │   ├── Sidebar.jsx            # Universal Sidebar (adapts to role)
│   │   └── Navbar.jsx
│   │
│   └── Icons.jsx                  # All SVG icons
│
├── context/
│   ├── AuthContext.jsx            # Enhanced with role checks
│   └── SearchContext.jsx
│
├── layouts/
│   ├── AuthLayout.jsx             # For login/register pages
│   ├── ProtectedLayout.jsx        # NEW: Universal protected layout
│   └── SidebarLayout.jsx          # NEW: Wrapper for sidebar (used by all roles)
│
├── pages/
│   ├── auth/
│   │   ├── Login.jsx
│   │   ├── Register.jsx           # Enhanced: Detects invite type (agent/cpa)
│   │   └── ForgotPassword.jsx
│   │
│   ├── super-admin/               # RENAMED from admin/
│   │   ├── Dashboard.jsx
│   │   ├── AgentManagement.jsx    # NEW: Manage agents
│   │   ├── AgentDetail.jsx        # NEW: Agent profile + tree view
│   │   ├── CPAManagement.jsx      # Global CPA view
│   │   ├── EarningsTrack.jsx      # Enhanced with agent/cpa breakdown
│   │   └── WithdrawalManagement.jsx  # Global withdrawals (agents + cpas)
│   │
│   ├── agent/                     # NEW: Agent Portal
│   │   ├── Dashboard.jsx          # Agent dashboard
│   │   ├── CPAManagement.jsx      # Agent's referred CPAs
│   │   ├── Earnings.jsx           # Agent's earnings & commission
│   │   ├── CPAWithdrawals.jsx     # Monitor CPA withdrawals
│   │   ├── Wallet.jsx             # Agent's wallet & withdrawal requests
│   │   └── Profile.jsx            # Agent profile settings
│   │
│   ├── cpa/                       # RENAMED from ca/
│   │   ├── Dashboard.jsx
│   │   ├── ClientManagement.jsx   # RENAMED from MyReferrals.jsx
│   │   ├── Earnings.jsx           # RENAMED from Performance.jsx
│   │   ├── Wallet.jsx             # RENAMED from Payouts.jsx
│   │   └── Profile.jsx            # RENAMED from MyProfile.jsx
│   │
│   └── customer/
│       └── ClientRegister.jsx
│
├── services/
│   ├── firebase.js
│   ├── api.js                     # NEW: Centralized API calls
│   └── utils/
│       ├── calculations.js        # Commission calculation helpers
│       ├── formatters.js          # Date, currency formatters
│       └── validators.js          # Input validation
│
├── App.jsx                        # Enhanced routing with RBAC
├── main.jsx
└── index.css
```

### Backend Structure (Firebase Functions)
```
backend/functions/
├── controllers/
│   ├── adminController.js         # Super Admin operations
│   ├── agentController.js         # NEW: Agent operations
│   ├── cpaController.js           # RENAMED from caController.js
│   ├── clientController.js
│   ├── inviteController.js        # Enhanced: Handle agent + cpa invites
│   ├── payoutController.js        # Enhanced: Handle agent + cpa withdrawals
│   └── emailController.js
│
├── utils/
│   ├── validator.js
│   ├── commissionCalculator.js    # NEW: Commission logic
│   └── roleChecker.js             # NEW: RBAC helper
│
├── firebaseConfig.js
├── index.js                       # Main entry point
└── package.json
```

---

## 🔄 Commission Flow Logic

### When a Client Subscribes ($100/month example):
```
Client Payment: $100

↓ (CPA has 20% commission rate)
CPA Commission: $20 (20% of $100)
CPA's wallet += $20

↓ (If CPA was referred by an Agent)
Agent Commission: $10 (Fixed 10% of original $100)
Agent's wallet += $10

↓
Platform Revenue: $70 ($100 - $20 - $10)

Transaction Record:
{
  type: "revenue",
  amount: 100,
  clientId: "client_uid",
  cpaId: "cpa_uid",
  agentId: "agent_uid",
  cpaCommission: 20,
  agentCommission: 10,
  platformRevenue: 70
}
```

### When a CPA is NOT referred by an Agent:
```
Client Payment: $100

CPA Commission: $20 (20% of $100)
Agent Commission: $0 (No agent)
Platform Revenue: $80

Transaction Record:
{
  type: "revenue",
  amount: 100,
  clientId: "client_uid",
  cpaId: "cpa_uid",
  agentId: null,
  cpaCommission: 20,
  agentCommission: 0,
  platformRevenue: 80
}
```

---

## 🎨 Design System Adherence

### Colors (Maintain Existing Figma Design)
```css
Primary Text: #111111
Secondary Text: #9499A1
Border: #E3E6EA
Background: #FFFFFF
Card Background: #F7F9FC
Accent Blue: #4D7CFE
Accent Blue Light: rgba(77, 124, 254, 0.1)
```

### Components to Reuse
- **StatCard**: Same design across all dashboards
- **DataTable**: Same table design for Partners/Clients/Transactions
- **Modal**: Same modal design for invites/withdrawals
- **Sidebar**: Same layout, just different menu items per role

---

## 🚀 Implementation Priority

### Phase 1: Foundation (Database & Auth)
1. Update Firestore collections (add `role` and `referredBy` fields)
2. Deploy new Firestore security rules
3. Create Firestore indexes
4. Update AuthContext for role-based routing

### Phase 2: Super Admin Enhancements
1. Create Agent Management page
2. Create Agent Detail page with tree view
3. Update Earnings page to show Agent vs CPA breakdown
4. Update Withdrawals to handle both Agents and CPAs

### Phase 3: Agent Portal (New)
1. Create Agent layout and routing
2. Build Agent Dashboard
3. Build CPA Management page
4. Build Earnings page
5. Build Wallet & Withdrawals page

### Phase 4: CPA Portal Refactor
1. Rename files and routes
2. Update to work under new hierarchy
3. Ensure proper role checks

### Phase 5: Backend Updates
1. Update invite controller for Agent invites
2. Create commission calculation logic
3. Update withdrawal controller for Agents
4. Create Agent-specific cloud functions

### Phase 6: Testing & Polish
1. Test all role-based access controls
2. Verify commission calculations
3. Test invite flows (Super Admin → Agent → CPA)
4. End-to-end testing

---

## 📝 Next Steps

Would you like me to proceed with:
1. **Updating the database schema and Firestore rules**
2. **Creating the Agent portal pages**
3. **Refactoring the Admin portal**
4. **All of the above** (systematic implementation)

Please confirm, and I'll begin the implementation!
