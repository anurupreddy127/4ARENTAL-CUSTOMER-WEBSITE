// src/hooks/useAuth.ts
import { useContext } from "react";
import AuthContext from "@/context/AuthContext";
import type { AuthContextType } from "@/types/auth.types";

/**
 * Hook to access authentication context
 * Must be used within an AuthProvider
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
