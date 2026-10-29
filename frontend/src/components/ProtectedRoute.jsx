import React from "react";
import { Navigate } from "react-router-dom";

/**
 * Route guard that ensures the user is authenticated.
 * If unauthenticated, redirects to the /login page.
 * @param {{ children: React.ReactNode }} props
 */
export default function ProtectedRoute({ children }) {
  const token = localStorage.getItem("token");

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
