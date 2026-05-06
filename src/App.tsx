import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from 'react-helmet-async';
import { ThemeProvider } from "next-themes";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { CartProvider } from "@/contexts/CartContext";
import Index from "./pages/Index";

// Lazy-loaded routes
const Events = lazy(() => import("./pages/Events"));
const Auth = lazy(() => import("./pages/Auth"));
const Profile = lazy(() => import("./pages/Profile"));
const Vendors = lazy(() => import("./pages/Vendors"));
const VendorProfile = lazy(() => import("./pages/VendorProfile"));
const EnhancedCollection = lazy(() => import("./pages/EnhancedCollection"));
const Subscription = lazy(() => import("./pages/Subscription"));
const SubscriptionSuccess = lazy(() => import("./pages/SubscriptionSuccess"));
const Following = lazy(() => import("./pages/Following"));
const Admin = lazy(() => import("./pages/Admin"));
const EventDetails = lazy(() => import("./pages/EventDetails"));
const LayoutTool = lazy(() => import("./pages/LayoutTool"));
const ManageEvent = lazy(() => import("./pages/ManageEvent"));
const SponsorProfile = lazy(() => import("./pages/SponsorProfile"));
const Settings = lazy(() => import("./pages/Settings"));
const EmployeeDashboard = lazy(() => import("./pages/EmployeeDashboard"));
const TicketSuccess = lazy(() => import("./pages/TicketSuccess"));
const SharedTicket = lazy(() => import("./pages/SharedTicket"));
const Organize = lazy(() => import("./pages/Organize"));
const Vending = lazy(() => import("./pages/Vending"));
const StaffCheckIn = lazy(() => import("./pages/StaffCheckIn"));
const OrganizeVenue = lazy(() => import("./pages/OrganizeVenue"));
const CardScanner = lazy(() => import("./pages/CardScanner"));
const DealList = lazy(() => import("./pages/DealList"));
const Markets = lazy(() => import("./pages/Markets"));
const Demo = lazy(() => import("./pages/Demo"));
const Security = lazy(() => import("./pages/Security"));
const NotFound = lazy(() => import("./pages/NotFound"));

import { DemoBanner } from "@/components/DemoBanner";
import { DemoTourOverlay } from "@/components/demo/DemoTourOverlay";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <HelmetProvider>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <CartProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
          <DemoBanner />
          <DemoTourOverlay />
          <Suspense fallback={<div className="min-h-screen bg-background" />}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/demo" element={<Demo />} />
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
                <EnhancedCollection />
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
            <Route path="/settings" element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            } />
            <Route path="/organize" element={
              <ProtectedRoute>
                <Organize />
              </ProtectedRoute>
            } />
            <Route path="/vending" element={
              <ProtectedRoute>
                <Vending />
              </ProtectedRoute>
            } />
            <Route path="/employee-dashboard" element={
              <ProtectedRoute>
                <EmployeeDashboard />
              </ProtectedRoute>
            } />
            <Route path="/tickets/success" element={
              <ProtectedRoute>
                <TicketSuccess />
              </ProtectedRoute>
            } />
            <Route path="/ticket/:ticketCode" element={<SharedTicket />} />
            <Route path="/staff-checkin/:token" element={<StaffCheckIn />} />
            <Route path="/organize-venue" element={
              <ProtectedRoute>
                <OrganizeVenue />
              </ProtectedRoute>
            } />
            <Route path="/scanner" element={
              <ProtectedRoute>
                <CardScanner />
              </ProtectedRoute>
            } />
            <Route path="/deal-list" element={
              <ProtectedRoute>
                <DealList />
              </ProtectedRoute>
            } />
            <Route path="/markets" element={
              <ProtectedRoute>
                <Markets />
              </ProtectedRoute>
            } />

            <Route path="/security" element={<Security />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
          </BrowserRouter>
          </TooltipProvider>
        </CartProvider>
      </ThemeProvider>
    </HelmetProvider>
  </QueryClientProvider>
);

export default App;
