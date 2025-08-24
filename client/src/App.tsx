import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "./hooks/use-auth";
import Dashboard from "./pages/dashboard";
import DashboardMinimal from "./pages/dashboard-minimal";
import Login from "./pages/login";
import BankPage from "./pages/bank";
import TradingPage from "./pages/trading";
import AuctionsPage from "./pages/auctions";
import NewsPage from "./pages/news";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/login" component={Login} />
      <Route path="/b" component={BankPage} />
      <Route path="/s" component={TradingPage} />
      <Route path="/a" component={AuctionsPage} />
      <Route path="/n" component={NewsPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <div className="dark min-h-screen">
            <Toaster />
            <Router />
          </div>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
