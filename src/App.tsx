import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthContext'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { AppShell } from '@/components/layout/AppShell'
import { LoginPage } from '@/pages/LoginPage'
import { HomePage } from '@/pages/HomePage'
import { EmployeesPage } from '@/pages/EmployeesPage'
import { EmployeeCardPage } from '@/pages/EmployeeCardPage'
import { CertificationsPage } from '@/pages/CertificationsPage'

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
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
