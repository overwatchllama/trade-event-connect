import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from 'react-helmet-async';
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Events from "./pages/Events";
import Auth from "./pages/Auth";
import Profile from "./pages/Profile";
import Vendors from "./pages/Vendors";
import VendorProfile from "./pages/VendorProfile";
import MyCollection from "./pages/MyCollection";
import Subscription from "./pages/Subscription";
import SubscriptionSuccess from "./pages/SubscriptionSuccess";
import Following from "./pages/Following";
import Admin from "./pages/Admin";
import EventDetails from "./pages/EventDetails";
import LayoutTool from "./pages/LayoutTool";
import ManageEvent from "./pages/ManageEvent";
import SponsorProfile from "./pages/SponsorProfile";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <HelmetProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/events" element={<Events />} />
          <Route path="/event/:id" element={<EventDetails />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/vendors" element={<Vendors />} />
          <Route path="/vendor/:id" element={<VendorProfile />} />
          <Route path="/my-vendor-profile" element={<VendorProfile />} />
          <Route path="/following" element={
            <ProtectedRoute>
              <Following />
            </ProtectedRoute>
          } />
          <Route path="/subscription" element={<Subscription />} />
          <Route path="/subscription-success" element={<SubscriptionSuccess />} />
          <Route path="/my-collection" element={
            <ProtectedRoute>
              <MyCollection />
            </ProtectedRoute>
          } />
          <Route path="/admin" element={
            <ProtectedRoute>
              <Admin />
            </ProtectedRoute>
          } />
          <Route path="/layout-tool" element={<LayoutTool />} />
          <Route path="/event/:id/manage" element={<ManageEvent />} />
          <Route path="/my-sponsor-profile" element={<SponsorProfile />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
      </TooltipProvider>
    </HelmetProvider>
  </QueryClientProvider>
);

export default App;
