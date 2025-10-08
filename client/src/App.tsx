import { lazy, Suspense } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as HotToaster } from "react-hot-toast";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "./hooks/use-auth";
import { Loader2 } from "lucide-react";

// Lazy load pages for code splitting
const Dashboard = lazy(() => import("./pages/dashboard"));
const Login = lazy(() => import("./pages/login"));
const BankPage = lazy(() => import("./pages/bank"));
const TradingPage = lazy(() => import("./pages/trading"));
const StockTradingPage = lazy(() => import("./pages/stock-trading"));
const AuctionsPage = lazy(() => import("./pages/auctions"));
const NewsPage = lazy(() => import("./pages/news"));
const NotFound = lazy(() => import("@/pages/not-found"));

// Loading component
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <p className="text-gray-400 text-sm">로딩 중...</p>
      </div>
    </div>
  );
}

function AppRouter() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/login" component={Login} />
        <Route path="/b" component={BankPage} />
        <Route path="/s" component={TradingPage} />
        <Route path="/stock" component={StockTradingPage} />
        <Route path="/a" component={AuctionsPage} />
        <Route path="/n" component={NewsPage} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <div className="dark min-h-screen">
            <Toaster />
            <HotToaster
              position="top-right"
              reverseOrder={false}
              gutter={8}
              toastOptions={{
                // Default options
                duration: 4000,
                style: {
                  background: '#1f2937',
                  color: '#f9fafb',
                  border: '1px solid #374151',
                },
                // Success
                success: {
                  duration: 3000,
                  iconTheme: {
                    primary: '#10b981',
                    secondary: '#f9fafb',
                  },
                },
                // Error
                error: {
                  duration: 5000,
                  iconTheme: {
                    primary: '#ef4444',
                    secondary: '#f9fafb',
                  },
                },
                // Loading
                loading: {
                  iconTheme: {
                    primary: '#3b82f6',
                    secondary: '#f9fafb',
                  },
                },
              }}
            />
            <AppRouter />
          </div>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
