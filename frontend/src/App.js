import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "./components/ui/sonner";
import { BottomNav } from "./components/BottomNav";
import { Sidebar } from "./components/Sidebar";
import { Dashboard } from "./pages/Dashboard";
import { Scan } from "./pages/Scan";
import { MyBids } from "./pages/MyBids";
import { Admin } from "./pages/Admin";
import { Pricing } from "./pages/Pricing";
import { SubscriptionSuccess, SubscriptionCancel } from "./pages/SubscriptionPages";

function App() {
  return (
    <div className="app-container">
      <BrowserRouter>
        {/* Desktop Sidebar */}
        <Sidebar />
        
        {/* Main Content */}
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/scan" element={<Scan />} />
            <Route path="/my-bids" element={<MyBids />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/subscription/success" element={<SubscriptionSuccess />} />
            <Route path="/subscription/cancel" element={<SubscriptionCancel />} />
          </Routes>
        </main>
        
        {/* Mobile Bottom Nav */}
        <BottomNav />
        
        {/* Toast notifications */}
        <Toaster 
          position="top-center"
          toastOptions={{
            style: {
              background: '#131B2F',
              border: '1px solid #1E293B',
              color: '#e2e8f0',
            },
          }}
        />
      </BrowserRouter>
    </div>
  );
}

export default App;
