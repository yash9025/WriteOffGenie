import { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "../services/firebase"; 
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => auth.currentUser);
  const [role, setRole] = useState(() => localStorage.getItem("userRole"));
  const [loading, setLoading] = useState(true);
  const [partnerData, setPartnerData] = useState(null); // Full partner profile

  // Logout function
  const logout = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem("userRole");
      setUser(null);
      setRole(null);
      setPartnerData(null);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        setUser(null);
        setRole(null);
        setPartnerData(null);
        localStorage.removeItem("userRole");
        setLoading(false);
        return;
      }

      setUser(currentUser);

      try {
        const docRef = doc(db, "Partners", currentUser.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          const fetchedRole = data.role || "cpa"; // Default to cpa for backward compatibility
          
          setRole(fetchedRole);
          setPartnerData(data);
          localStorage.setItem("userRole", fetchedRole);
        } else {
          setRole("unknown");
          setPartnerData(null);
        }
      } catch (error) {
        console.error("Role fetch error:", error);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Helper functions for role checks
  const isSuperAdmin = () => role === "super_admin";
  const isAgent = () => role === "agent";
  const isCPA = () => role === "cpa";

  return (
    <AuthContext.Provider value={{ 
      user, 
      role, 
      loading, 
      logout, 
      partnerData,
      isSuperAdmin,
      isAgent,
      isCPA
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);