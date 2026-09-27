import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './AuthContext'
import { GuestRoute, ProtectedRoute } from './ProtectedRoute'
import { isFirebaseConfigured, missingFirebaseSettings } from './firebase'
import BusinessLayout from './components/BusinessLayout'
import DashboardLayout from './components/DashboardLayout'
import Login from './pages/Login'
import SettingsPage from './pages/SettingsPage'
import MyBusinessesPage from './pages/MyBusinessesPage'
import DirectoryPage from './pages/directory/DirectoryPage'
import PublicProfilePage from './pages/directory/PublicProfilePage'
import AdminPage from './pages/admin/AdminPage'
import BusinessDashboard from './pages/business/BusinessDashboard'
import ProfilePage from './pages/business/ProfilePage'
import CatalogPage from './pages/business/CatalogPage'
import ProductDetailPage from './pages/business/ProductDetailPage'
import InventoryPage from './pages/business/InventoryPage'
import OrdersPage from './pages/business/OrdersPage'
import OrderDetailPage from './pages/business/OrderDetailPage'
import MessagesPage from './pages/business/MessagesPage'
import NetworkPage from './pages/business/NetworkPage'
import CommercePage from './pages/business/CommercePage'
import TeamPage from './pages/business/TeamPage'
import { cx, ui } from './styles'

function App() {
  if (!isFirebaseConfigured) {
    return (
      <main className="grid min-h-screen place-items-center px-4 py-6">
        <div className={cx(ui.card, 'max-w-100 shadow-xl')}>
          <h1 className={ui.h1}>Almost there</h1>
          <p className={ui.subtitle}>Firebase isn&apos;t configured yet. These settings are missing:</p>
          <ul className="my-3 list-disc pl-5 font-mono text-[0.85rem] text-heading">
            {missingFirebaseSettings.map((name) => (
              <li key={name}>{name}</li>
            ))}
          </ul>
          <p className={ui.hint}>
            <strong>On your computer:</strong> copy <code>.env.example</code> to <code>.env.local</code>, fill them in, and
            restart <code>npm run dev</code>.
            <br />
            <strong>On Vercel:</strong> add them under Settings → Environment Variables, then <strong>redeploy</strong>
            (the values are built into the app, so old deployments never see them).
          </p>
        </div>
      </main>
    )
  }

  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route
            path="/login"
            element={
              <GuestRoute>
                <Login />
              </GuestRoute>
            }
          />

          {/* Account-level pages */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="business" replace />} />
            <Route path="business" element={<MyBusinessesPage />} />
            <Route path="directory" element={<DirectoryPage />} />
            <Route path="directory/:businessId" element={<PublicProfilePage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="admin" element={<AdminPage />} />
          </Route>

          {/* Pages for one business you are a member of */}
          <Route
            path="/business/:id"
            element={
              <ProtectedRoute>
                <BusinessLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<BusinessDashboard />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="products" element={<CatalogPage />} />
            <Route path="products/:productId" element={<ProductDetailPage />} />
            <Route path="inventory" element={<InventoryPage />} />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="orders/:orderId" element={<OrderDetailPage />} />
            <Route path="messages" element={<MessagesPage />} />
            <Route path="network" element={<NetworkPage />} />
            <Route path="commerce" element={<CommercePage />} />
            <Route path="team" element={<TeamPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
