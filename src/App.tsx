import { BrowserRouter, Routes, Route } from "react-router-dom";
import BookingFlow from "./components/BookingFlow";
import Dashboard from "./components/Dashboard";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <div className="min-h-screen w-full bg-zinc-950 flex items-center justify-center p-4">
              <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/10 via-transparent to-transparent pointer-events-none" />
              <BookingFlow />
            </div>
          }
        />
        <Route path="/agendar" element={
          <div className="min-h-screen w-full bg-zinc-950 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/10 via-transparent to-transparent pointer-events-none" />
            <BookingFlow />
          </div>
        } />
        <Route path="/admin" element={<Dashboard />} />
      </Routes>
    </BrowserRouter>
  );
}