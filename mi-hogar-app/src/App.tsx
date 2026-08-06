import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Toaster } from 'sonner'
import { useAppStore } from '@/store/app'
import { AuthScreen } from '@/pages/AuthScreen'
import { HomeSetup } from '@/pages/HomeSetup'
import { AppShell } from '@/components/layout/AppShell'
import { InventoryPage } from '@/pages/InventoryPage'
import { ShoppingPage } from '@/pages/ShoppingPage'
import { AssistantPage } from '@/pages/AssistantPage'
import { ActivityPage } from '@/pages/ActivityPage'
import { ProfilePage } from '@/pages/ProfilePage'
import { ProductDetailPage } from '@/pages/ProductDetailPage'
import { LoadingScreen } from '@/components/LoadingScreen'
import { ApprovalStatusScreen } from '@/pages/ApprovalStatusScreen'

export default function App() {
  const ready = useAppStore((s) => s.ready)
  const user = useAppStore((s) => s.user)
  const profile = useAppStore((s) => s.profile)
  const home = useAppStore((s) => s.home)
  const online = useAppStore((s) => s.online)
  const bootstrap = useAppStore((s) => s.bootstrap)
  const setOnline = useAppStore((s) => s.setOnline)

  useEffect(() => {
    void bootstrap()
  }, [bootstrap])

  useEffect(() => {
    const onOnline = () => setOnline(true)
    const onOffline = () => setOnline(false)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [setOnline])

  if (!ready) return <LoadingScreen label="Cargando..." />

  if (user && profile && profile.status === 'pending') {
    return <ApprovalStatusScreen />
  }
  if (user && profile && profile.status === 'rejected') {
    return <ApprovalStatusScreen />
  }

  return (
    <BrowserRouter>
      <Toaster position="top-center" toastOptions={{ className: '!bg-surface !text-text' }} richColors />
      <Routes>
        <Route path="/auth" element={user ? <Navigate to="/" replace /> : <AuthScreen />} />
        <Route path="/setup" element={!user ? <Navigate to="/auth" replace /> : home ? <Navigate to="/" replace /> : <HomeSetup />} />

        <Route
          element={
            !user ? (
              <Navigate to="/auth" replace />
            ) : !home ? (
              <Navigate to="/setup" replace />
            ) : (
              <AppShell />
            )
          }
        >
          <Route index element={<InventoryPage />} />
          <Route path="/shopping" element={<ShoppingPage />} />
          <Route path="/assistant" element={<AssistantPage />} />
          <Route path="/activity" element={<ActivityPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/product/:id" element={<ProductDetailPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {!online && (
        <div className="fixed inset-x-0 top-0 z-50 bg-amber-500 px-4 py-2 text-center text-sm font-semibold text-amber-950 safe-top">
          Sin conexión · modo consulta
        </div>
      )}
    </BrowserRouter>
  )
}
