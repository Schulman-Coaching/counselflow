import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import { SpeedInsights } from "@vercel/speed-insights/react";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Dashboard from "./pages/Dashboard";
import Clients from "./pages/Clients";
import Matters from "./pages/Matters";
import Intake from "./pages/Intake";
import Documents from "./pages/Documents";
import TimeTracking from "./pages/TimeTracking";
import DocumentGenerator from "./pages/DocumentGenerator";
import Invoices from "./pages/Invoices";
import ClientPortalLogin from "./pages/ClientPortalLogin";
import ClientPortal from "./pages/ClientPortal";
import Activity from "./pages/Activity";
import Tasks from "./pages/Tasks";
import MatterDetail from "./pages/MatterDetail";
import Settings from "./pages/Settings";
import Emails from "./pages/Emails";
import Templates from "./pages/Templates";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/clients" component={Clients} />
      <Route path="/matters" component={Matters} />
      <Route path="/matters/:id" component={MatterDetail} />
      <Route path="/intake" component={Intake} />
      <Route path="/documents" component={Documents} />
      <Route path="/time" component={TimeTracking} />
      <Route path="/documents/generate" component={DocumentGenerator} />
      <Route path="/invoices" component={Invoices} />
      <Route path="/tasks" component={Tasks} />
      <Route path="/client-portal/login" component={ClientPortalLogin} />
      <Route path="/client-portal" component={ClientPortal} />
      <Route path="/activity" component={Activity} />
      <Route path="/emails" component={Emails} />
      <Route path="/templates" component={Templates} />
      <Route path="/settings" component={Settings} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
          <SpeedInsights />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
