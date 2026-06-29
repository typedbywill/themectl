import { HashRouter as Router, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { AppShell } from "./components/layout/AppShell";
import { Dashboard } from "./pages/Dashboard";
import { Themes } from "./pages/Themes";
import { Installed } from "./pages/Installed";
import { ThemeDetails } from "./pages/ThemeDetails";
import { Repositories } from "./pages/Repositories";
import { Backups } from "./pages/Backups";
import { Doctor } from "./pages/Doctor";
import { Settings } from "./pages/Settings";
import { useThemeUIStore } from "./stores/themeStore";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});

function App() {
  const { darkMode } = useThemeUIStore();
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/themes" element={<Themes />} />
            <Route path="/installed" element={<Installed />} />
            <Route path="/installed/:name" element={<ThemeDetails />} />
            <Route path="/repositories" element={<Repositories />} />
            <Route path="/backups" element={<Backups />} />
            <Route path="/doctor" element={<Doctor />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
        </Routes>
      </Router>
      <Toaster theme={darkMode ? "dark" : "light"} position="bottom-right" closeButton richColors />
    </QueryClientProvider>
  );
}

export default App;
