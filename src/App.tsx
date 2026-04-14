import React, { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { Toaster } from "sonner";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Analytics } from "@vercel/analytics/react";
import Landing from "./pages/Landing";

// Lazy load pages for better performance
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
const WorkerChat = lazy(() => import("./pages/worker/Chat"));

const WorkerQuiz = lazy(() => import("./pages/worker/Quiz"));

const WorkerOnboarding = lazy(() => import("./pages/worker/Onboarding"));
const PendingApproval = lazy(() => import("./pages/PendingApproval"));

const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-[#050505] text-white font-sans font-black text-2xl">
    <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
  </div>
);

const ProtectedRoute = ({ children, allowedRoles, requireOnboarding = false }: { children: React.ReactNode, allowedRoles?: ("admin" | "worker")[], requireOnboarding?: boolean }) => {
  const { user, loading, firebaseUser } = useAuth();

  if (loading) return <LoadingFallback />;

  if (!firebaseUser) return <Navigate to="/login" replace />;

  if (allowedRoles && allowedRoles.length > 0) {
    if (!user) {
      // If they are authenticated but have no user document, send them to apply
      return <Navigate to="/apply" replace />;
    }
    if (!allowedRoles.includes(user.role as "admin" | "worker")) {
      return <Navigate to={user.role === "admin" ? "/admin" : "/worker"} replace />;
    }

    // Check for active status
    if (user.role === "worker" && user.status !== "active") {
      return <Navigate to="/pending-approval" replace />;
    }
    
    // Enforce onboarding for workers
    if (user.role === "worker" && requireOnboarding && !user.onboardingCompleted) {
      return <Navigate to="/worker/onboarding" replace />;
    }
    
    // Enforce quiz for workers who completed onboarding but haven't completed quiz
    if (user.role === "worker" && requireOnboarding && user.onboardingCompleted && !user.quizCompleted && window.location.pathname !== "/worker/quiz") {
      return <Navigate to="/worker/quiz" replace />;
    }

    // Prevent workers who completed onboarding from accessing it again
    if (user.role === "worker" && !requireOnboarding && user.onboardingCompleted && window.location.pathname === "/worker/onboarding") {
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
          <Analytics />
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/apply" element={<Apply />} />
              <Route path="/login" element={<Login />} />
              
              <Route path="/admin" element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AdminDashboard />
                </ProtectedRoute>
              } />
              <Route path="/admin/workers" element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AdminWorkers />
                </ProtectedRoute>
              } />
              <Route path="/admin/tasks" element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AdminTasks />
                </ProtectedRoute>
              } />
              <Route path="/admin/withdrawals" element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AdminWithdrawals />
                </ProtectedRoute>
              } />
              <Route path="/admin/settings" element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AdminSettings />
                </ProtectedRoute>
              } />
              <Route path="/admin/ai" element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AdminAI />
                </ProtectedRoute>
              } />
              
              <Route path="/worker" element={
                <ProtectedRoute allowedRoles={["worker"]} requireOnboarding={true}>
                  <WorkerDashboard />
                </ProtectedRoute>
              } />
              <Route path="/worker/wallet" element={
                <ProtectedRoute allowedRoles={["worker"]} requireOnboarding={true}>
                  <WorkerWallet />
                </ProtectedRoute>
              } />
              <Route path="/worker/requests" element={
                <ProtectedRoute allowedRoles={["worker"]} requireOnboarding={true}>
                  <WorkerRequests />
                </ProtectedRoute>
              } />
              <Route path="/worker/chat" element={
                <ProtectedRoute allowedRoles={["admin", "worker"]}>
                  <WorkerChat />
                </ProtectedRoute>
              } />
              <Route path="/worker/profile" element={
                <ProtectedRoute allowedRoles={["worker"]} requireOnboarding={true}>
                  <WorkerProfile />
                </ProtectedRoute>
              } />

              <Route path="/worker/quiz" element={
                <ProtectedRoute allowedRoles={["worker"]} requireOnboarding={true}>
                  <WorkerQuiz />
                </ProtectedRoute>
              } />

              <Route path="/worker/onboarding" element={
                <ProtectedRoute allowedRoles={["worker"]} requireOnboarding={false}>
                  <WorkerOnboarding />
                </ProtectedRoute>
              } />

              <Route path="/pending-approval" element={<PendingApproval />} />
              
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
