import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Shell from "./components/Shell";
import ProtectedRoute from "./components/ProtectedRoute";
import { ModalProvider } from "./context/ModalContext";
import { ThemeProvider } from "./context/ThemeContext";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Overview from "./pages/Overview";
import Workflows from "./pages/Workflows";
import Builder from "./pages/Builder";
import Executions from "./pages/Executions";
import Approvals from "./pages/Approvals";
import Evaluations from "./pages/Evaluations";
import Knowledge from "./pages/Knowledge";
import SystemStatus from "./pages/SystemStatus";
import UseCases from "./pages/UseCases";
import Settings from "./pages/Settings";

// FlowForge Portal (Application B — Client Application)
import PortalShell from "./portal/PortalShell";
import PortalDashboard from "./portal/PortalDashboard";
import PortalNewRequest from "./portal/PortalNewRequest";
import PortalRequests from "./portal/PortalRequests";
import PortalRequestDetail from "./portal/PortalRequestDetail";
import PortalApprovals from "./portal/PortalApprovals";
import PortalLogin from "./portal/PortalLogin";
import PortalProtectedRoute from "./portal/PortalProtectedRoute";

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <ModalProvider>
        <Routes>
          {/* FlowForge Studio Authentication */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* FlowForge Client Portal Authentication */}
          <Route path="/portal/login" element={<PortalLogin />} />

          {/* FlowForge Portal (Client-Facing Application B) */}
          <Route
            path="/portal"
            element={
              <PortalProtectedRoute>
                <PortalShell />
              </PortalProtectedRoute>
            }
          >
            <Route index element={<PortalDashboard />} />
            <Route path="new" element={<PortalNewRequest />} />
            <Route path="new/:workflowId" element={<PortalNewRequest />} />
            <Route path="requests" element={<PortalRequests />} />
            <Route path="requests/:id" element={<PortalRequestDetail />} />
            <Route path="approvals" element={<PortalApprovals />} />
          </Route>

          {/* FlowForge Studio (Developer/Admin Application A) */}
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
                    <Route path="/knowledge" element={<Knowledge />} />
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
      </ThemeProvider>
    </BrowserRouter>
  );
}
