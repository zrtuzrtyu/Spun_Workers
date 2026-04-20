import React, { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
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
const VerifyEmail = lazy(() => import("./pages/VerifyEmail"));

const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-background text-foreground font-sans font-black text-2xl">
    <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
  </div>
);

const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: ("admin" | "worker")[] }) => {
  const { user, loading, firebaseUser } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingFallback />;

  if (!firebaseUser) return <Navigate to="/login" state={{ from: location }} replace />;

  // Email Verification Check
  // Allow the very first login session to bypass email verification (when creationTime equals or is very close to lastSignInTime)
  const creationTime = firebaseUser.metadata.creationTime ? new Date(firebaseUser.metadata.creationTime).getTime() : 0;
  const lastSignInTime = firebaseUser.metadata.lastSignInTime ? new Date(firebaseUser.metadata.lastSignInTime).getTime() : 0;
  const isFirstLoginSession = Math.abs(lastSignInTime - creationTime) < 5000; // Within 5 seconds

  if (!firebaseUser.emailVerified && !isFirstLoginSession && location.pathname !== "/verify-email") {
    return <Navigate to="/verify-email" replace />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    if (!user) {
      // If they are authenticated but have no user document, send them to apply
      return <Navigate to="/apply" replace />;
    }
    if (!allowedRoles.includes(user.role as "admin" | "worker")) {
      return <Navigate to={user.role === "admin" ? "/admin" : "/worker"} replace />;
    }

    // Worker Flow State Machine (Skip for Admins)
    if (user.role === "worker") {
      const path = location.pathname;

      // 1. Onboarding Check
      if (!user.onboardingCompleted) {
        if (path !== "/worker/onboarding") {
          return <Navigate to="/worker/onboarding" replace />;
        }
      } 
      // 2. Quiz Check
      else if (!user.quizCompleted) {
        if (path !== "/worker/quiz") {
          return <Navigate to="/worker/quiz" replace />;
        }
      } 
      // 3. Status Check
      else if (user.status === "pending") {
        if (path !== "/pending-approval") {
          return <Navigate to="/pending-approval" replace />;
        }
      } 
      // 4. Active User - Prevent access to onboarding/quiz/pending
      else if (user.status === "active") {
        if (["/worker/onboarding", "/worker/quiz", "/pending-approval"].includes(path)) {
          return <Navigate to="/worker" replace />;
        }
      }
      
      if (user.status === "inactive") {
        return <Navigate to="/" replace />;
      }
    }
  }

  return <>{children}</>;
};

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
          <Analytics />
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/apply" element={<Apply />} />
              <Route path="/login" element={<Login />} />
              <Route path="/verify-email" element={<VerifyEmail />} />
              
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
                <ProtectedRoute allowedRoles={["admin", "worker"]}>
                  <WorkerDashboard />
                </ProtectedRoute>
              } />
              <Route path="/worker/wallet" element={
                <ProtectedRoute allowedRoles={["admin", "worker"]}>
                  <WorkerWallet />
                </ProtectedRoute>
              } />
              <Route path="/worker/requests" element={
                <ProtectedRoute allowedRoles={["admin", "worker"]}>
                  <WorkerRequests />
                </ProtectedRoute>
              } />
              <Route path="/worker/chat" element={
                <ProtectedRoute allowedRoles={["admin", "worker"]}>
                  <WorkerChat />
                </ProtectedRoute>
              } />
              <Route path="/worker/profile" element={
                <ProtectedRoute allowedRoles={["admin", "worker"]}>
                  <WorkerProfile />
                </ProtectedRoute>
              } />

              <Route path="/worker/quiz" element={
                <ProtectedRoute allowedRoles={["worker"]}>
                  <WorkerQuiz />
                </ProtectedRoute>
              } />

              <Route path="/worker/onboarding" element={
                <ProtectedRoute allowedRoles={["worker"]}>
                  <WorkerOnboarding />
                </ProtectedRoute>
              } />

              <Route path="/pending-approval" element={
                <ProtectedRoute allowedRoles={["worker"]}>
                  <PendingApproval />
                </ProtectedRoute>
              } />
              
              {/* Catch-all 404 route */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
        <Toaster theme="dark" richColors closeButton />
      </AuthProvider>
    </ThemeProvider>
    </ErrorBoundary>
  );
}
