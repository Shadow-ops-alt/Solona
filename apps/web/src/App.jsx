import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Layout from './layout/Layout'
import ClaimPage from './pages/ClaimPage'
import Dashboard from './pages/Dashboard'
import LandingPage from './pages/LandingPage'
import SendFlow from './pages/SendFlow'
import TransactionDonePage from './pages/TransactionDonePage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/send" element={<SendFlow step={1} />} />
          <Route path="/send/confirm" element={<SendFlow step={3} />} />
          <Route path="/send/done" element={<TransactionDonePage />} />
          <Route path="/claim/:id" element={<ClaimPage />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
