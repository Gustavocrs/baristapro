/**
 * @file useAuth.jsx
 * @description Hook customizado para gerenciar o ciclo de vida da autenticação do Firebase.
 */

"use client";

import {useState, useEffect} from "react";
import {auth, googleProvider} from "../firebase";
import {onAuthStateChanged, signInWithPopup, signOut} from "firebase/auth";

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    if (!auth) return alert("Firebase Auth não inicializado.");
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Erro na autenticação:", error);
    }
  };

  const logout = async () => {
    if (!auth) return;
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Erro ao deslogar:", error);
    }
  };

  return {user, loading, loginWithGoogle, logout};
};
