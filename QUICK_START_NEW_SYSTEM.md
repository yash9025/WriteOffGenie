# Quick Start Guide - New Commission System

## 🚀 Quick Setup & Testing

### 1. Backend Setup
No additional setup needed! The backend changes are already in place.

### 2. Invite a New Agent

1. Navigate to **Admin Dashboard** → **Agent Management**
2. Click **"Invite Agent"** button
3. Fill in the form:
   - **Name**: John Doe
   - **Email**: john@example.com
   - **Commission Rate (%)**: 15 (or your desired rate)
   - **Maintenance Cost ($)**: 6.00 (or your desired cost)
4. Click **"Send Invite"**
5. Agent will receive an email with the invite link

### 3. Agent Registration

1. Agent opens invite email and clicks the registration link
2. Fills in:
   - Password
   - Phone number
3. Clicks **"Complete Registration"**
4. Automatically logged in and redirected to dashboard

### 4. View Agent Details

1. Go back to **Agent Management**
2. Click **"View"** on the agent you just invited
3. You'll see:
   - ✅ Commission settings section (with Edit button)
   - ✅ Earnings breakdown with formula
   - ❌ No bank accounts section
   - ❌ No withdrawal history

### 5. Edit Agent Settings

1. On Agent Detail page, click **"Edit Settings"**
2. Adjust:
   - Commission Rate (%)
   - Maintenance Cost ($)
3. See formula preview update in real-time
4. Click **"Update Settings"**
5. Earnings recalculate automatically

---

## 📊 Testing Commission Calculations

### Scenario 1: Basic Test
**Setup:**
- Create 1 Agent (15% commission, $6 maintenance)
- Agent invites 1 CPA (10% commission)
- CPA refers 2 clients with active $100/month subscriptions

**Expected Calculation:**
```
Total Revenue: 2 × $100 = $200
CPA Commission: $200 × 10% = $20
Net Revenue: $200 - $20 = $180
Maintenance: 2 × $6 = $12
Net Profit: $180 - $12 = $168
Agent Commission: $168 × 15% = $25.20
```

### Scenario 2: Multiple CPAs
**Setup:**
- 1 Agent (20% commission, $5 maintenance)
- 3 CPAs (each with 10% commission)
- Each CPA has 5 active clients at $150/month

**Expected Calculation:**
```
Total Revenue: 15 × $150 = $2,250
CPA Commissions: $2,250 × 10% = $225
Net Revenue: $2,250 - $225 = $2,025
Maintenance: 15 × $5 = $75
Net Profit: $2,025 - $75 = $1,950
Agent Commission: $1,950 × 20% = $390.00
```

---

## 🔍 What to Look For

### Admin Panel (Agent Management)
✅ **Should See:**
- Commission Rate column in agent table
- Net Profit stat card
- Agent Commissions stat card (formula-based)
- Active Subscriptions count

❌ **Should NOT See:**
- Pending Withdrawals stat
- Wallet Balance references
- Withdrawal management links

### Admin Panel (Agent Detail)
✅ **Should See:**
- Commission Settings section with Edit button
- Earnings Breakdown with step-by-step calculation
- Formula tooltip on hover
- Real-time recalculation on edit

❌ **Should NOT See:**
- Bank Accounts section/cards
- Withdrawal History table
- "Add Bank Account" buttons
- Wallet Balance cards

### Agent Dashboard
✅ **Should See:**
- Commission Rate stat card
- Total Earnings
- CPA stats

❌ **Should NOT See:**
- Available Balance / Wallet Balance card
- Withdrawal buttons
- Bank account links

---

## 🎨 UI Changes Summary

### Before & After Comparison

#### Agent Management Page
**Before:**
```
[Revenue] [Agent Commissions] [Pending Withdrawals] [Active Subs]
                 ^                     ^
              Old stats          Now removed!
```

**After:**
```
[Revenue] [Net Profit] [Agent Commissions] [Active Subs]
              ^              ^
        New formula!    Formula-based!
```

#### Agent Detail Page
**Before:**
```
┌─────────────────────────────────┐
│ Profile Info                    │
├─────────────────────────────────┤
│ Commission: 10% (fixed)         │
├─────────────────────────────────┤
│ Earnings: Total | Wallet | Paid │
├─────────────────────────────────┤
│ Bank Accounts (cards with       │
│ routing/account numbers)        │
├─────────────────────────────────┤
│ Withdrawal History (table)      │
└─────────────────────────────────┘
```

**After:**
```
┌─────────────────────────────────┐
│ Profile Info                    │
├─────────────────────────────────┤
│ Commission Settings (editable)  │
│ [15%] [Edit Settings Button]   │
├─────────────────────────────────┤
│ Earnings Breakdown:             │
│ • Revenue: $X                   │
│ • - CPA Commissions: $Y         │
│ • - Maintenance: $Z             │
│ • = Net Profit: $N              │
│ • Commission: $C (15% of Net)   │
└─────────────────────────────────┘
```

---

## 🐛 Troubleshooting

### Issue: Agent earnings show $0
**Solution:** 
- Ensure the agent has CPAs who referred clients
- Check that clients have `subscription.status === 'active'`
- Verify `subscription.amountPaid` is set

### Issue: Formula shows negative net profit
**Expected:** Agent commission will be $0 (floored)
- This happens when: `(Revenue - CPA Commissions - Maintenance) < 0`
- Adjust maintenance cost or commission rates

### Issue: Old agents missing commission settings
**Solution:** 
- Default values (15%, $6.00) are used automatically
- Edit the agent to set custom values

### Issue: Invite email not received
**Check:**
- SendGrid API key is configured
- Email is in pending invites with correct token
- Spam folder

---

## 🔐 Security Notes

1. **Only Super Admins** can:
   - Invite agents
   - Edit agent commission settings
   - View all agent details

2. **Token Encryption:**
   - Invite tokens are encrypted with AES-256
   - Tokens expire after 7 days
   - One-time use only

3. **Validation:**
   - Commission rate: 0-100%
   - Maintenance cost: >= $0
   - All inputs sanitized

---

## 📈 Monitoring

### Key Metrics to Track

1. **Net Profit Margin:**
   ```
   (Total Net Profit / Total Revenue) × 100
   ```

2. **Effective Agent Cost:**
   ```
   Total Agent Commissions / Total Revenue
   ```

3. **Maintenance Coverage:**
   ```
   Total Maintenance Costs / Total Revenue
   ```

### Sample Dashboard Query (Firestore)
```javascript
// Get all agents with their settings
const agentsRef = db.collection('Partners').where('role', '==', 'agent');
const snapshot = await agentsRef.get();

snapshot.forEach(doc => {
  const agent = doc.data();
  console.log({
    name: agent.displayName,
    commission: agent.commissionPercentage,
    maintenance: agent.maintenanceCostPerUser,
    earnings: agent.stats?.totalEarnings || 0
  });
});
```

---

## 🎯 Success Criteria

### System is working correctly if:

- ✅ Agents can be invited with custom commission rates
- ✅ Registration saves commission settings correctly
- ✅ Agent detail page shows earnings breakdown
- ✅ Edit settings updates commission in real-time
- ✅ No bank/wallet UI elements exist anywhere
- ✅ Calculations match the formula exactly
- ✅ Old agents default to 15% and $6.00

---

## 📞 Support

If you encounter issues:

1. Check browser console for errors
2. Verify Firebase Functions logs
3. Check Firestore data structure
4. Review [REFACTORING_SUMMARY.md](./REFACTORING_SUMMARY.md) for details

---

**Ready to test!** 🎉

Start by inviting a new agent and watch the new commission system in action!
