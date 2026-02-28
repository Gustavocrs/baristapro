/**
 * @file useAuth.jsx
 * @description Hook customizado para gerenciar o ciclo de vida da autenticação do Firebase.
 * Atualizado com tratamento avançado de erros (Error Mapping) para falhas de infraestrutura.
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
    if (!auth) {
      alert(
        "Firebase Auth não inicializado. Verifique as variáveis de ambiente.",
      );
      return;
    }

    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("❌ Erro na autenticação:", error);

      // Mapeamento de erros comuns do Firebase Auth
      if (error.code === "auth/configuration-not-found") {
        alert(
          "Erro de Infraestrutura: O provedor Google não está ativado no Firebase Console (Sign-in method).",
        );
      } else if (error.code === "auth/popup-closed-by-user") {
        console.warn("Usuário cancelou o login.");
      } else if (error.code === "auth/unauthorized-domain") {
        alert(
          "Erro de Domínio: O domínio atual não está autorizado no Firebase Console.",
        );
      } else {
        alert(`Falha no login: ${error.message}`);
      }
    }
  };

  const logout = async () => {
    if (!auth) return;
    try {
      await signOut(auth);
    } catch (error) {
      console.error("❌ Erro ao deslogar:", error);
    }
  };

  return {user, loading, loginWithGoogle, logout};
};
