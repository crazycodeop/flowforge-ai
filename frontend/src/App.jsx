import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Shell from "./components/Shell";
import Overview from "./pages/Overview";
import Workflows from "./pages/Workflows";
import Builder from "./pages/Builder";
import Executions from "./pages/Executions";
import Approvals from "./pages/Approvals";
import Evaluations from "./pages/Evaluations";
import SystemStatus from "./pages/SystemStatus";

export default function App() {
  return (
    <BrowserRouter>
      <Shell>
        <Routes>
          <Route path="/" element={<Overview />} />
          <Route path="/workflows" element={<Workflows />} />
          <Route path="/workflows/:id" element={<Builder />} />
          <Route path="/executions" element={<Executions />} />
          <Route path="/approvals" element={<Approvals />} />
          <Route path="/evaluations" element={<Evaluations />} />
          <Route path="/system" element={<SystemStatus />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Shell>
    </BrowserRouter>
  );
}
