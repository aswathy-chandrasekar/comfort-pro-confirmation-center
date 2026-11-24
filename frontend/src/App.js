import "@/App.css";
import { Component } from "react";
import { HashRouter, Routes, Route } from "react-router-dom";
import { AppProvider, useApp } from "@/context/AppContext";
import { AppShell } from "@/layouts/AppShell";
import Overview from "@/pages/Overview";
import Activity from "@/pages/Activity";
import CalendarPage from "@/pages/Calendar";
import Login from "@/pages/Login";
import { Toaster } from "@/components/ui/sonner";

// Catches render errors anywhere below and shows the actual error message
// instead of a silent blank page - if something breaks, this is what
// should be reported back, not "it isn't working".
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    console.error("Confirmation Center crashed:", error, info);
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ maxWidth: 640, margin: "60px auto", padding: 24, border: "1px solid #f0b8b0", borderRadius: 8, fontFamily: "sans-serif", background: "#fff5f4", color: "#8c2119" }}>
          <strong>Something went wrong loading the Confirmation Center.</strong>
          <p style={{ margin: "10px 0" }}>The app crashed with this error:</p>
          <pre style={{ whiteSpace: "pre-wrap", background: "#fff", border: "1px solid #f0b8b0", borderRadius: 6, padding: 10, fontSize: 12, overflow: "auto" }}>
            {String(this.state.error && this.state.error.message ? this.state.error.message : this.state.error)}
          </pre>
          <p style={{ margin: "10px 0 0", fontSize: 13 }}>
            Please share this exact message so it can be fixed.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}

function Gate() {
  const { signedIn } = useApp();
  if (!signedIn) return <Login />;
  return (
    <HashRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<Overview />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/activity" element={<Activity />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <Gate />
        <Toaster position="bottom-right" />
      </AppProvider>
    </ErrorBoundary>
  );
}

export default App;
