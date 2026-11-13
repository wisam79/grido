import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import { FeedbackProvider } from './components/common/FeedbackProvider';

// Lazy load the admin dashboard so it doesn't slow down the landing page
const AdminDashboard = React.lazy(() => import('./pages/AdminDashboard'));
const PrivacyPolicy = React.lazy(() => import('./pages/PrivacyPolicy'));
const TermsOfService = React.lazy(() => import('./pages/TermsOfService'));
const PhoneCameraPage = React.lazy(() => import('./pages/PhoneCameraPage'));

function NotFoundPage() {
  return (
    <main
      dir="rtl"
      className="min-h-screen bg-workspace text-text-primary flex flex-col items-center justify-center p-6 text-center gap-4"
    >
      <p className="text-sm font-mono text-text-secondary">404</p>
      <h1 className="text-2xl font-bold">الصفحة غير موجودة</h1>
      <p className="text-sm text-text-secondary max-w-md">
        الرابط الذي تحاول الوصول إليه غير متاح أو ربما تم نقله.
      </p>
      <Link
        to="/"
        className="px-4 py-2 rounded-xl bg-brand-primary hover:bg-brand-hover text-white text-sm font-medium transition-colors"
      >
        العودة إلى الصفحة الرئيسية
      </Link>
    </main>
  );
}

export default function App() {
  return (
    <FeedbackProvider>
      <BrowserRouter>
        <Suspense
          fallback={
            <div className="min-h-screen flex items-center justify-center bg-neutral-950 text-white">
              <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full"></div>
            </div>
          }
        >
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/admin/*" element={<AdminDashboard />} />
            <Route path="/cam" element={<PhoneCameraPage />} />
            <Route path="/camera" element={<PhoneCameraPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </FeedbackProvider>
  );
}
