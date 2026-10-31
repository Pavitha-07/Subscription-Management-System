import { Route, Routes } from "react-router-dom";
import Landing from "./pages/Landing";

// Route map grows per phase; see docs/FRONTEND.md.
export default function AppRoutes() {
  return (
    <Routes>
      <Route path="*" element={<Landing />} />
    </Routes>
  );
}
