import { HashRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { AppShell } from "./components/layout/AppShell";
import { Themes } from "./pages/Themes";
import { Installed } from "./pages/Installed";
import { ThemeDetails } from "./pages/ThemeDetails";
import { Repositories } from "./pages/Repositories";
import { Settings } from "./pages/Settings";
import { CreateTheme } from "./pages/CreateTheme";
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
            <Route path="/" element={<Navigate to="/installed" replace />} />
            <Route path="/themes" element={<Themes />} />
            <Route path="/installed" element={<Installed />} />
            <Route path="/installed/:name" element={<ThemeDetails />} />
            <Route path="/repositories" element={<Repositories />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/create" element={<CreateTheme />} />
          </Route>
        </Routes>
      </Router>
      <Toaster theme={darkMode ? "dark" : "light"} position="bottom-right" closeButton richColors />
    </QueryClientProvider>
  );
}

export default App;
