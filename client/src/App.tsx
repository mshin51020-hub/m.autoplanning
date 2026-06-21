import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";
import Home from "./pages/Home";
import AuthPage from "./pages/AuthPage";
import ProfileForm from "./pages/ProfileForm";
import PlanResult from "./pages/PlanResult";
import MenuResult from "./pages/MenuResult";
import History from "./pages/History";
import AdminExerciseWeights from "./pages/AdminExerciseWeights";
import AdminUsers from "./pages/AdminUsers";
import Privacy from "./pages/Privacy";
import AdminSetupPassword from "./pages/AdminSetupPassword";
import Terms from "./pages/Terms";
import Contact from "./pages/Contact";
import AdminContacts from "@/pages/AdminContacts";
import About from "@/pages/About";
import WorkoutTracker from "@/pages/WorkoutTracker";
import CalendarView from "@/pages/CalendarView";
import AccountSettings from "@/pages/AccountSettings";
import ProgressPage from "@/pages/ProgressPage";
import PricingPage from "@/pages/PricingPage";
import StatsPage from "@/pages/StatsPage";
import ChallengePage from "@/pages/ChallengePage";

function Router() {
  return (
    <Switch>
      {/* 認証・公開ページ（DashboardLayout不要） */}
      <Route path={"/"} component={Home} />
      <Route path={"/login"} component={AuthPage} />
      <Route path={"/admin/setup-password"} component={AdminSetupPassword} />
      <Route path={"/privacy"} component={Privacy} />
      <Route path={"/terms"} component={Terms} />
      <Route path={"/contact"} component={Contact} />
      <Route path={"/about"} component={About} />
      <Route path={"/404"} component={NotFound} />

      {/* ダッシュボードレイアウト内のページ */}
      <Route>
        <DashboardLayout>
          <Switch>
            <Route path={"/plan"} component={ProfileForm} />
            <Route path={"/profile"} component={ProfileForm} />
            <Route path={"/plan/:id"} component={PlanResult} />
            <Route path={"/workout/:id"} component={WorkoutTracker} />
            <Route path={"/calendar"} component={CalendarView} />
            <Route path={"/menu/:id"} component={MenuResult} />
            <Route path={"/history"} component={History} />
            <Route path={"/admin/users"} component={AdminUsers} />
            <Route path={"/admin/exercise-weights"} component={AdminExerciseWeights} />
            <Route path={"/admin/contacts"} component={AdminContacts} />
            <Route path={"/account"} component={AccountSettings} />
            <Route path={"/progress"} component={ProgressPage} />
            <Route path={"/stats"} component={StatsPage} />
            <Route path={"/challenges"} component={ChallengePage} />
            <Route path={"/pricing"} component={PricingPage} />
            <Route component={NotFound} />
          </Switch>
        </DashboardLayout>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
