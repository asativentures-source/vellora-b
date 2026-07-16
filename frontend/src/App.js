import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { Suspense, lazy } from "react";
import { Toaster } from "sonner";
import { AuthProvider } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CookieConsent from "@/components/CookieConsent";
import LiveChatWidget from "@/components/LiveChatWidget";
import "@/App.css";

const Landing = lazy(() => import("@/pages/Landing"));
const About = lazy(() => import("@/pages/About"));
const Programs = lazy(() => import("@/pages/Programs"));
const ProgramDetail = lazy(() => import("@/pages/ProgramDetail"));
const Doctors = lazy(() => import("@/pages/Doctors"));
const Pricing = lazy(() => import("@/pages/Pricing"));
const Blog = lazy(() => import("@/pages/Blog"));
const BlogPost = lazy(() => import("@/pages/BlogPost"));
const Support = lazy(() => import("@/pages/Support"));
const Assessment = lazy(() => import("@/pages/Assessment"));
const Onboarding = lazy(() => import("@/pages/Onboarding"));
const Login = lazy(() => import("@/pages/Login"));
const AuthCallback = lazy(() => import("@/pages/AuthCallback"));
const PatientDashboard = lazy(() => import("@/pages/PatientDashboard"));
const PatientLabs = lazy(() => import("@/pages/PatientLabs"));
const Messages = lazy(() => import("@/pages/Messages"));
const DoctorDashboard = lazy(() => import("@/pages/DoctorDashboard"));
const DoctorNotes = lazy(() => import("@/pages/DoctorNotes"));
const AdminDashboard = lazy(() => import("@/pages/AdminDashboard"));
const Settings = lazy(() => import("@/pages/Settings"));

import ProtectedRoute from "@/components/ProtectedRoute";

function AppRouter() {
  const location = useLocation();
  // Handle OAuth session_id in URL fragment BEFORE ProtectedRoute runs
  if (location.hash?.includes("session_id=")) {
    return (
      <Suspense fallback={<div className="min-h-screen" />}>
        <AuthCallback />
      </Suspense>
    );
  }

  const isDashboard = ["/patient", "/doctor", "/admin", "/settings"].some((p) =>
    location.pathname.startsWith(p)
  );

  return (
    <>
      {!isDashboard && <Navbar />}
      <Suspense fallback={<div className="min-h-[60vh]" />}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/about" element={<About />} />
          <Route path="/programs" element={<Programs />} />
          <Route path="/programs/:slug" element={<ProgramDetail />} />
          <Route path="/doctors" element={<Doctors />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/:slug" element={<BlogPost />} />
          <Route path="/support" element={<Support />} />
          <Route path="/assessment" element={<Assessment />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/login" element={<Login />} />
          <Route path="/auth-callback" element={<AuthCallback />} />
          <Route
            path="/patient"
            element={
              <ProtectedRoute>
                <PatientDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/patient/labs"
            element={
              <ProtectedRoute>
                <PatientLabs />
              </ProtectedRoute>
            }
          />
          <Route
            path="/patient/messages"
            element={
              <ProtectedRoute>
                <Messages />
              </ProtectedRoute>
            }
          />
          <Route
            path="/doctor"
            element={
              <ProtectedRoute role="doctor">
                <DoctorDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/doctor/notes"
            element={
              <ProtectedRoute role="doctor">
                <DoctorNotes />
              </ProtectedRoute>
            }
          />
          <Route
            path="/doctor/messages"
            element={
              <ProtectedRoute role="doctor">
                <Messages />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/*"
            element={
              <ProtectedRoute role="admin">
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Suspense>
      {!isDashboard && <Footer />}
      {!isDashboard && <LiveChatWidget />}
      <CookieConsent />
    </>
  );
}

export default function App() {
  return (
    <div className="App min-h-screen">
      <AuthProvider>
        <BrowserRouter>
          <AppRouter />
          <Toaster position="top-right" richColors />
        </BrowserRouter>
      </AuthProvider>
    </div>
  );
}
