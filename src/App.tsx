import React, { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { Toaster } from "sonner";
import { ErrorBoundary } from "./components/ErrorBoundary";

// Lazy load pages for better performance
const Landing = lazy(() => import("./pages/Landing"));
const Apply = lazy(() => import("./pages/Apply"));
const Login = lazy(() => import("./pages/Login"));
const AdminDashboard = lazy(() => import("./pages/admin/Dashboard"));
const AdminWorkers = lazy(() => import("./pages/admin/Workers"));
const AdminTasks = lazy(() => import("./pages/admin/Tasks"));
const AdminWithdrawals = lazy(() => import("./pages/admin/Withdrawals"));
const AdminSettings = lazy(() => import("./pages/admin/Settings"));
const AdminAI = lazy(() => import("./pages/admin/AI"));
const WorkerDashboard = lazy(() => import("./pages/worker/Dashboard"));
const WorkerWallet = lazy(() => import("./pages/worker/Wallet"));
const WorkerProfile = lazy(() => import("./pages/worker/Profile"));
const WorkerRequests = lazy(() => import("./pages/worker/Requests"));

const WorkerQuiz = lazy(() => import("./pages/worker/Quiz"));

const WorkerOnboarding = lazy(() => import("./pages/worker/Onboarding"));

const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-[#050505] text-white font-sans font-black text-2xl">
    <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
  </div>
);

const ProtectedRoute = ({ children, allowedRole, requireOnboarding = false }: { children: React.ReactNode, allowedRole?: "admin" | "worker", requireOnboarding?: boolean }) => {
  const { user, loading, firebaseUser } = useAuth();

  if (loading) return <LoadingFallback />;

  if (!firebaseUser) return <Navigate to="/login" replace />;

  if (allowedRole) {
    if (!user) {
      // If they are authenticated but have no user document, send them to apply
      return <Navigate to="/apply" replace />;
    }
    if (user.role !== allowedRole) {
      return <Navigate to={user.role === "admin" ? "/admin" : "/worker"} replace />;
    }
    
    // Enforce onboarding for workers
    if (allowedRole === "worker" && requireOnboarding && !user.onboardingCompleted) {
      return <Navigate to="/worker/onboarding" replace />;
    }
    
    // Prevent workers who completed onboarding from accessing it again
    if (allowedRole === "worker" && !requireOnboarding && user.onboardingCompleted && window.location.pathname === "/worker/onboarding") {
      return <Navigate to="/worker" replace />;
    }
  }

  return <>{children}</>;
};

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/apply" element={<Apply />} />
              <Route path="/login" element={<Login />} />
              
              <Route path="/admin" element={
                <ProtectedRoute allowedRole="admin">
                  <AdminDashboard />
                </ProtectedRoute>
              } />
              <Route path="/admin/workers" element={
                <ProtectedRoute allowedRole="admin">
                  <AdminWorkers />
                </ProtectedRoute>
              } />
              <Route path="/admin/tasks" element={
                <ProtectedRoute allowedRole="admin">
                  <AdminTasks />
                </ProtectedRoute>
              } />
              <Route path="/admin/withdrawals" element={
                <ProtectedRoute allowedRole="admin">
                  <AdminWithdrawals />
                </ProtectedRoute>
              } />
              <Route path="/admin/settings" element={
                <ProtectedRoute allowedRole="admin">
                  <AdminSettings />
                </ProtectedRoute>
              } />
              <Route path="/admin/ai" element={
                <ProtectedRoute allowedRole="admin">
                  <AdminAI />
                </ProtectedRoute>
              } />
              
              <Route path="/worker" element={
                <ProtectedRoute allowedRole="worker" requireOnboarding={true}>
                  <WorkerDashboard />
                </ProtectedRoute>
              } />
              <Route path="/worker/wallet" element={
                <ProtectedRoute allowedRole="worker" requireOnboarding={true}>
                  <WorkerWallet />
                </ProtectedRoute>
              } />
              <Route path="/worker/requests" element={
                <ProtectedRoute allowedRole="worker" requireOnboarding={true}>
                  <WorkerRequests />
                </ProtectedRoute>
              } />
              <Route path="/worker/profile" element={
                <ProtectedRoute allowedRole="worker" requireOnboarding={true}>
                  <WorkerProfile />
                </ProtectedRoute>
              } />

              <Route path="/worker/quiz" element={
                <ProtectedRoute allowedRole="worker" requireOnboarding={true}>
                  <WorkerQuiz />
                </ProtectedRoute>
              } />

              <Route path="/worker/onboarding" element={
                <ProtectedRoute allowedRole="worker" requireOnboarding={false}>
                  <WorkerOnboarding />
                </ProtectedRoute>
              } />
              
              {/* Catch-all 404 route */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
        <Toaster theme="dark" richColors closeButton />
      </AuthProvider>
    </ErrorBoundary>
  );
}
