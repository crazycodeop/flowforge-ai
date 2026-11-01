import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Shell from "./components/Shell";
import ProtectedRoute from "./components/ProtectedRoute";
import { ModalProvider } from "./context/ModalContext";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Overview from "./pages/Overview";
import Workflows from "./pages/Workflows";
import Builder from "./pages/Builder";
import Executions from "./pages/Executions";
import Approvals from "./pages/Approvals";
import Evaluations from "./pages/Evaluations";
import SystemStatus from "./pages/SystemStatus";
import UseCases from "./pages/UseCases";
import Settings from "./pages/Settings";

export default function App() {
  return (
    <BrowserRouter>
      <ModalProvider>
        <Routes>
          {/* Public Authentication Pages */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Authenticated Workspace Application */}
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <Shell>
                  <Routes>
                    <Route path="/" element={<Overview />} />
                    <Route path="/workflows" element={<Workflows />} />
                    <Route path="/workflows/:id" element={<Builder />} />
                    <Route path="/executions" element={<Executions />} />
                    <Route path="/approvals" element={<Approvals />} />
                    <Route path="/evaluations" element={<Evaluations />} />
                    <Route path="/system" element={<SystemStatus />} />
                    <Route path="/use-cases" element={<UseCases />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </Shell>
              </ProtectedRoute>
            }
          />
        </Routes>
      </ModalProvider>
    </BrowserRouter>
  );
}
