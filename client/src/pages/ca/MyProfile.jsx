import React, { useState, useEffect } from "react";
import { doc, onSnapshot, collection, addDoc, updateDoc, deleteDoc, query, orderBy, writeBatch } from "firebase/firestore";
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { db, auth } from "../../services/firebase";
import { useAuth } from "../../context/AuthContext";
import toast, { Toaster } from "react-hot-toast";
import { Loader2, X, Plus, Trash2, Star, Edit2, Camera } from "lucide-react";

// Simple Camera Icon Button
const CameraIcon = () => (
  <div className="w-8 h-8 rounded-full bg-white border border-[#E3E6EA] flex items-center justify-center text-[#011C39] hover:bg-gray-50 transition-colors cursor-pointer shadow-sm">
    <Camera size={16} />
  </div>
);

export default function MyProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal States
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);
  const [editingBank, setEditingBank] = useState(null);

  // Form States
  const [personalForm, setPersonalForm] = useState({ name: "", email: "", phone: "", caRegNumber: "" });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [bankForm, setBankForm] = useState({ companyName: "", routingNumber: "", accountNumber: "", accountType: "checking" });

  const [saving, setSaving] = useState(false);

  // --- 1. DATA FETCHING ---
  useEffect(() => {
    if (!user) return;
    
    // Profile Listener
    const unsubProfile = onSnapshot(doc(db, "Partners", user.uid), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setProfile(data);
        setPersonalForm({
          name: data.name || "",
          email: data.email || "",
          phone: data.phone || "",
          caRegNumber: data.caRegNumber || ""
        });
      }
      setLoading(false);
    });

    // Bank Accounts Listener
    const bankQuery = query(
      collection(db, "Partners", user.uid, "BankAccounts"),
      orderBy("createdAt", "desc")
    );
    const unsubBanks = onSnapshot(bankQuery, (snap) => {
      const accounts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setBankAccounts(accounts);
    });

    return () => {
      unsubProfile();
      unsubBanks();
    };
  }, [user]);

  // --- 2. HANDLERS ---

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await updateDoc(doc(db, "Partners", user.uid), {
        name: personalForm.name,
        phone: personalForm.phone,
      });
      toast.success("Profile updated successfully!");
      setShowEditProfile(false);
    } catch (error) {
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) return toast.error("Passwords do not match");
    setSaving(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, passwordForm.currentPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);
      await updatePassword(auth.currentUser, passwordForm.newPassword);
      toast.success("Password updated successfully!");
      setShowChangePassword(false);
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (error) {
      toast.error(error.code === 'auth/wrong-password' ? "Incorrect current password" : "Failed to change password");
    } finally {
      setSaving(false);
    }
  };

  const handleOpenAddBank = () => {
    setEditingBank(null);
    setBankForm({ companyName: "", routingNumber: "", accountNumber: "", accountType: "checking" });
    setShowBankModal(true);
  };

  const handleOpenEditBank = (account) => {
    setEditingBank(account);
    setBankForm({
      companyName: account.companyName || "",
      routingNumber: account.routingNumber || "",
      accountNumber: account.accountNumber || "",
      accountType: account.accountType || "checking"
    });
    setShowBankModal(true);
  };

  const handleSaveBank = async () => {
    if (!bankForm.companyName || !bankForm.routingNumber || !bankForm.accountNumber || !bankForm.accountType) {
      return toast.error("Please fill all bank details");
    }
    
    if (bankForm.routingNumber.length !== 9 || !/^\d{9}$/.test(bankForm.routingNumber)) {
      return toast.error("Routing number must be exactly 9 digits");
    }
    
    setSaving(true);
    try {
      const bankCollectionRef = collection(db, "Partners", user.uid, "BankAccounts");
      
      if (editingBank) {
        await updateDoc(doc(db, "Partners", user.uid, "BankAccounts", editingBank.id), {
          ...bankForm,
          updatedAt: new Date()
        });
        toast.success("Bank account updated!");
      } else {
        const isFirst = bankAccounts.length === 0;
        await addDoc(bankCollectionRef, {
          ...bankForm,
          isDefault: isFirst,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        toast.success("Bank account added!");
      }
      
      setShowBankModal(false);
      setEditingBank(null);
      setBankForm({ companyName: "", routingNumber: "", accountNumber: "", accountType: "checking" });
    } catch (error) {
      console.error(error);
      toast.error("Failed to save bank details");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBank = async (accountId) => {
    if (!window.confirm("Are you sure you want to delete this bank account?")) return;
    
    try {
      const accountToDelete = bankAccounts.find(a => a.id === accountId);
      await deleteDoc(doc(db, "Partners", user.uid, "BankAccounts", accountId));
      
      if (accountToDelete?.isDefault && bankAccounts.length > 1) {
        const remaining = bankAccounts.filter(a => a.id !== accountId);
        if (remaining.length > 0) {
          await updateDoc(doc(db, "Partners", user.uid, "BankAccounts", remaining[0].id), {
            isDefault: true
          });
        }
      }
      
      toast.success("Bank account deleted");
    } catch (error) {
      toast.error("Failed to delete bank account");
    }
  };

  const handleSetDefault = async (accountId) => {
    try {
      const batch = writeBatch(db);
      bankAccounts.forEach(account => {
        batch.update(doc(db, "Partners", user.uid, "BankAccounts", account.id), {
          isDefault: account.id === accountId
        });
      });
      await batch.commit();
      toast.success("Default account updated");
    } catch (error) {
      toast.error("Failed to update default account");
    }
  };

  if (loading) return <div className="h-[80vh] flex items-center justify-center"><Loader2 className="animate-spin text-[#011C39]" size={40} /></div>;

  return (
    <div className="flex flex-col gap-6 w-full max-w-full animate-in fade-in duration-500 pb-10">
      <Toaster position="top-right" />

      {/* Header */}
      <div>
        <h1 className="text-[#111111] text-2xl font-bold tracking-tight">Profile</h1>
        <p className="text-[#9499A1] text-sm mt-1">View and manage your account information</p>
      </div>

      {/* 1. PERSONAL INFO CARD */}
      <div className="bg-white border border-[#E3E6EA] rounded-2xl p-6 flex flex-col gap-6 shadow-sm">
        <div className="flex justify-between items-start">
          <h2 className="text-[#111111] text-lg font-bold">Personal information</h2>
          <button 
            onClick={() => setShowEditProfile(true)}
            className="px-5 py-2 border border-[#011C39] rounded-lg text-[#011C39] text-sm font-medium hover:bg-[#011C39] hover:text-white transition-all cursor-pointer"
          >
            Edit Profile
          </button>
        </div>

        <div className="flex items-center gap-6">
          {/* Static Avatar Placeholder */}
          <div className="relative w-24 h-24 shrink-0">
            <div className="w-24 h-24 rounded-full bg-[#011C39] flex items-center justify-center text-white text-3xl font-bold border-4 border-white shadow-sm">
              {profile?.name?.[0]?.toUpperCase()}
            </div>
            <div className="absolute bottom-0 right-0">
               <CameraIcon />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 flex-1">
            <div>
              <p className="text-xs font-medium text-[#9499A1] mb-1 uppercase tracking-wide">Full name</p>
              <p className="text-base font-medium text-[#111]">{profile?.name || '-'}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-[#9499A1] mb-1 uppercase tracking-wide">Email address</p>
              <p className="text-base font-medium text-[#111]">{profile?.email || '-'}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-[#9499A1] mb-1 uppercase tracking-wide">Phone number</p>
              <p className="text-base font-medium text-[#111]">{profile?.phone || '-'}</p>
            </div>
            {profile?.caRegNumber && (
               <div>
                 <p className="text-xs font-medium text-[#9499A1] mb-1 uppercase tracking-wide">CA Reg Number</p>
                 <p className="text-base font-medium text-[#111]">{profile.caRegNumber}</p>
               </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. ACCOUNT SECURITY CARD */}
      <div className="bg-white border border-[#E3E6EA] rounded-2xl p-6 flex flex-col gap-6 shadow-sm">
        <div className="flex justify-between items-center">
          <h2 className="text-[#111111] text-lg font-bold">Account security</h2>
          <button 
            onClick={() => setShowChangePassword(true)}
            className="px-5 py-2 border border-[#011C39] rounded-lg text-[#011C39] text-sm font-medium hover:bg-[#011C39] hover:text-white transition-all cursor-pointer"
          >
            Change Password
          </button>
        </div>
        <div>
          <p className="text-xs font-medium text-[#9499A1] mb-1 uppercase tracking-wide">Password</p>
          <p className="text-base font-medium text-[#111] tracking-widest">••••••••••••</p>
        </div>
      </div>

      {/* 3. BANK ACCOUNTS CARD */}
      <div className="bg-white border border-[#E3E6EA] rounded-2xl p-6 flex flex-col gap-6 shadow-sm">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-[#111111] text-lg font-bold">Bank Accounts</h2>
            <p className="text-[#9499A1] text-sm mt-1">Manage your bank accounts for withdrawals</p>
          </div>
          <button 
            onClick={handleOpenAddBank}
            className="px-5 py-2.5 bg-[#011C39] rounded-lg text-white text-sm font-medium hover:bg-[#022a55] transition-all flex items-center gap-2 cursor-pointer shadow-md active:scale-95"
          >
            <Plus size={16} />
            Add Bank Account
          </button>
        </div>

        {bankAccounts.length === 0 ? (
          <div className="text-center py-10 border-2 border-dashed border-[#E3E6EA] rounded-xl bg-slate-50/50">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-white border border-[#E3E6EA] flex items-center justify-center shadow-sm">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9499A1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="5" width="20" height="14" rx="2" />
                <line x1="2" y1="10" x2="22" y2="10" />
              </svg>
            </div>
            <p className="text-[#111111] text-sm font-medium mb-1">No bank accounts linked yet</p>
            <p className="text-[#9499A1] text-xs">Add a bank account to receive your withdrawals</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {bankAccounts.map((account) => (
              <div 
                key={account.id} 
                className={`relative border rounded-xl p-5 transition-all ${
                  account.isDefault 
                    ? 'border-[#00D1A0] bg-[#ECFDF5]/20 shadow-sm' 
                    : 'border-[#E3E6EA] bg-white hover:border-[#011C39]/30 hover:shadow-sm'
                }`}
              >
                {account.isDefault && (
                  <div className="absolute -top-2.5 left-4 px-2.5 py-0.5 bg-[#00D1A0] text-white text-[10px] font-bold uppercase tracking-wide rounded-full flex items-center gap-1 shadow-sm">
                    <Star size={10} fill="white" />
                    Default
                  </div>
                )}

                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-bold text-[#111]">{account.companyName}</h3>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded ${account.accountType === 'checking' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
                        {account.accountType === 'checking' ? 'Checking' : 'Savings'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {!account.isDefault && (
                        <button 
                          onClick={() => handleSetDefault(account.id)}
                          className="p-1.5 text-gray-400 hover:text-[#00D1A0] hover:bg-[#00D1A0]/10 rounded-md transition-all cursor-pointer"
                          title="Set as default"
                        >
                          <Star size={16} />
                        </button>
                      )}
                      <button 
                        onClick={() => handleOpenEditBank(account)}
                        className="p-1.5 text-gray-400 hover:text-[#011C39] hover:bg-gray-100 rounded-md transition-all cursor-pointer"
                        title="Edit"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDeleteBank(account.id)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-all cursor-pointer"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-y-3 gap-x-4 pt-2 border-t border-dashed border-gray-200">
                    <div>
                      <p className="text-[10px] text-[#9499A1] font-bold uppercase mb-0.5">Routing Number</p>
                      <p className="text-sm font-medium text-[#111] font-mono">•••••{account.routingNumber?.slice(-4)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-[#9499A1] font-bold uppercase mb-0.5">Account Number</p>
                      <p className="text-sm font-medium text-[#111] font-mono">•••• {account.accountNumber?.slice(-4)}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* --- MODALS --- */}

      {/* 1. EDIT PROFILE MODAL */}
      {showEditProfile && (
        <Modal title="Update Profile" onClose={() => setShowEditProfile(false)}>
           <div className="flex flex-col gap-4">
              <Input label="Full name" value={personalForm.name} onChange={e => setPersonalForm({...personalForm, name: e.target.value})} />
              <Input label="Email address" value={personalForm.email} disabled />
              <Input label="Phone number" value={personalForm.phone} onChange={e => setPersonalForm({...personalForm, phone: e.target.value})} />
              <div className="flex gap-3 mt-4">
                  <Button variant="outline" onClick={() => setShowEditProfile(false)}>Cancel</Button>
                  <Button onClick={handleSaveProfile} loading={saving}>Save Changes</Button>
              </div>
           </div>
        </Modal>
      )}

      {/* 2. CHANGE PASSWORD MODAL */}
      {showChangePassword && (
        <Modal title="Change password" onClose={() => setShowChangePassword(false)}>
           <div className="flex flex-col gap-4">
              <Input type="password" label="Current password" placeholder="Enter current password" value={passwordForm.currentPassword} onChange={e => setPasswordForm({...passwordForm, currentPassword: e.target.value})} />
              <Input type="password" label="New password" placeholder="Enter new password" value={passwordForm.newPassword} onChange={e => setPasswordForm({...passwordForm, newPassword: e.target.value})} />
              <Input type="password" label="Confirm new password" placeholder="Re-enter new password" value={passwordForm.confirmPassword} onChange={e => setPasswordForm({...passwordForm, confirmPassword: e.target.value})} />
              <div className="flex gap-3 mt-4">
                  <Button variant="outline" onClick={() => setShowChangePassword(false)}>Cancel</Button>
                  <Button onClick={handleChangePassword} loading={saving}>Update password</Button>
              </div>
           </div>
        </Modal>
      )}

      {/* 3. ADD/EDIT BANK MODAL */}
      {showBankModal && (
        <Modal 
          title={editingBank ? "Edit Bank Account" : "Add Bank Account"} 
          onClose={() => { setShowBankModal(false); setEditingBank(null); }}
        >
           <div className="flex flex-col gap-4">
              <Input 
                label="Full Legal Company Name" 
                placeholder="Enter company name as registered with bank"
                value={bankForm.companyName} 
                onChange={e => setBankForm({...bankForm, companyName: e.target.value})} 
              />
              
              <Input 
                label="Routing Number" 
                placeholder="9-digit routing number"
                value={bankForm.routingNumber} 
                onChange={e => setBankForm({...bankForm, routingNumber: e.target.value.replace(/\D/g, '').slice(0, 9)})} 
                maxLength={9}
              />

              <Input 
                label="Bank Account Number" 
                placeholder="Enter account number"
                value={bankForm.accountNumber} 
                onChange={e => setBankForm({...bankForm, accountNumber: e.target.value.replace(/\D/g, '')})} 
              />
              
              {/* Account Type Dropdown */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-[#111]">Account Type</label>
                <select
                  value={bankForm.accountType}
                  onChange={e => setBankForm({...bankForm, accountType: e.target.value})}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-[#111] focus:outline-none focus:border-[#011C39] focus:ring-1 focus:ring-[#011C39] transition-all bg-white cursor-pointer"
                >
                  <option value="checking">Checking</option>
                  <option value="savings">Savings</option>
                </select>
              </div>
              
              <div className="flex gap-3 mt-4">
                  <Button variant="outline" onClick={() => { setShowBankModal(false); setEditingBank(null); }}>Cancel</Button>
                  <Button onClick={handleSaveBank} loading={saving}>
                    {editingBank ? "Update Account" : "Add Account"}
                  </Button>
              </div>
           </div>
        </Modal>
      )}

    </div>
  );
}

// --- REUSABLE COMPONENTS ---

const Modal = ({ title, onClose, children }) => (
  <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
    <div className="bg-white rounded-2xl w-full max-w-110 p-6 shadow-2xl relative scale-100 transition-all">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold text-[#111]">{title}</h3>
        <button onClick={onClose} className="bg-slate-100 text-slate-500 rounded-full p-1.5 hover:bg-slate-200 transition-colors cursor-pointer">
          <X size={16} />
        </button>
      </div>
      {children}
    </div>
  </div>
);

const Input = ({ label, type = "text", value, onChange, placeholder, disabled }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-sm font-medium text-[#111]">{label}</label>
    <input 
      type={type} 
      value={value} 
      onChange={onChange} 
      placeholder={placeholder}
      disabled={disabled}
      className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-[#111] placeholder:text-gray-400 focus:outline-none focus:border-[#011C39] focus:ring-1 focus:ring-[#011C39] disabled:bg-gray-50 disabled:text-gray-500 transition-all"
    />
  </div>
);

const Button = ({ children, variant = "primary", onClick, loading }) => {
  const baseStyle = "flex-1 py-2.5 rounded-lg text-sm font-medium transition-all flex justify-center items-center gap-2 cursor-pointer active:scale-95";
  const styles = variant === "primary" 
    ? "bg-[#011C39] text-white hover:bg-[#022a55] shadow-sm" 
    : "border border-gray-200 text-[#111] hover:bg-gray-50";
  
  return (
    <button onClick={onClick} disabled={loading} className={`${baseStyle} ${styles} disabled:opacity-70 disabled:cursor-not-allowed`}>
      {loading && <Loader2 size={16} className="animate-spin" />}
      {children}
    </button>
  );
};