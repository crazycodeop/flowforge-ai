import React from "react";
import { Navigate } from "react-router-dom";

/**
 * Route guard for the Client Portal.
 * If unauthenticated, redirects to the /portal/login page.
 * @param {{ children: React.ReactNode }} props
 */
export default function PortalProtectedRoute({ children }) {
  const token = localStorage.getItem("token");

  if (!token) {
    return <Navigate to="/portal/login" replace />;
  }

  return children;
}
