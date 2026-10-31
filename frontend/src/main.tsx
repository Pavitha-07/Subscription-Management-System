import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
<<<<<<< HEAD
=======
import { AuthProvider } from "./auth/AuthProvider";
>>>>>>> origin/main
import AppRoutes from "./routes";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
<<<<<<< HEAD
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
=======
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
>>>>>>> origin/main
    </QueryClientProvider>
  </React.StrictMode>,
);
