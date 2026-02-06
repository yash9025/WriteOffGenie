import { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "../services/firebase"; 
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => auth.currentUser);
  const [role, setRole] = useState(() => localStorage.getItem("userRole"));
  const [loading, setLoading] = useState(true);

  // Added Logout function
  const logout = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem("userRole");
      setUser(null);
      setRole(null);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        setUser(null);
        setRole(null);
        localStorage.removeItem("userRole");
        setLoading(false);
        return;
      }

      setUser(currentUser);

      try {
        const docRef = doc(db, "Partners", currentUser.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const fetchedRole = docSnap.data().role || "ca";
          setRole(fetchedRole);
          localStorage.setItem("userRole", fetchedRole);
        } else {
          setRole("unknown");
        }
      } catch (error) {
        console.error("Role fetch error:", error);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Pass logout into the value object
  return (
    <AuthContext.Provider value={{ user, role, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);