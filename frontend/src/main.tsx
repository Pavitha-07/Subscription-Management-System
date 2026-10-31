import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
<<<<<<< HEAD
<<<<<<< HEAD
=======
import { AuthProvider } from "./auth/AuthProvider";
>>>>>>> origin/main
=======
import { AuthProvider } from "./auth/AuthProvider";
>>>>>>> other-repo/phase-2a
import AppRoutes from "./routes";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
<<<<<<< HEAD
<<<<<<< HEAD
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
=======
=======
>>>>>>> other-repo/phase-2a
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
<<<<<<< HEAD
>>>>>>> origin/main
=======
>>>>>>> other-repo/phase-2a
    </QueryClientProvider>
  </React.StrictMode>,
);
