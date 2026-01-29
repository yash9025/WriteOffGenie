import { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "../services/firebase"; 
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  // Use localStorage to initialize state and avoid the "White Flash"
  const [user, setUser] = useState(() => auth.currentUser);
  const [role, setRole] = useState(() => localStorage.getItem("userRole"));
  const [loading, setLoading] = useState(true);

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
        // Fetch fresh role from Firestore
        const docRef = doc(db, "Partners", currentUser.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const fetchedRole = docSnap.data().role || "ca";
          setRole(fetchedRole);
          // Cache the role for the next page refresh
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

  return (
    <AuthContext.Provider value={{ user, role, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);