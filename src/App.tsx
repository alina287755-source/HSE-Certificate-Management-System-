import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthContext'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { AppShell } from '@/components/layout/AppShell'
import { LoginPage } from '@/pages/LoginPage'
import { HomePage } from '@/pages/HomePage'
import { EmployeesPage } from '@/pages/EmployeesPage'
import { EmployeeCardPage } from '@/pages/EmployeeCardPage'
import { CertificationsPage } from '@/pages/CertificationsPage'
import { TrainingPage } from '@/pages/TrainingPage'
import { BriefingsPage } from '@/pages/BriefingsPage'
import { KnowledgeChecksPage } from '@/pages/KnowledgeChecksPage'
import { PPEPage } from '@/pages/PPEPage'
import { NotificationsPage } from '@/pages/NotificationsPage'
import { ReportsPage } from '@/pages/ReportsPage'
import { SettingsPage } from '@/pages/SettingsPage'

function Protected({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <AppShell>{children}</AppShell>
    </ProtectedRoute>
  )
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<Protected><HomePage /></Protected>} />
          <Route path="/employees" element={<Protected><EmployeesPage /></Protected>} />
          <Route path="/employees/:id" element={<Protected><EmployeeCardPage /></Protected>} />
          <Route path="/certifications" element={<Protected><CertificationsPage /></Protected>} />
          <Route path="/training" element={<Protected><TrainingPage /></Protected>} />
          <Route path="/briefings" element={<Protected><BriefingsPage /></Protected>} />
          <Route path="/knowledge-checks" element={<Protected><KnowledgeChecksPage /></Protected>} />
          <Route path="/ppe" element={<Protected><PPEPage /></Protected>} />
          <Route path="/notifications" element={<Protected><NotificationsPage /></Protected>} />
          <Route path="/reports" element={<Protected><ReportsPage /></Protected>} />
          <Route path="/settings" element={<Protected><SettingsPage /></Protected>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
