import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./auth/AuthProvider";
<<<<<<< HEAD
=======
import { AuthProvider } from "./auth/AuthProvider";
=======
import { AuthProvider } from "./auth/AuthProvider";
=======
>>>>>>> other-repo/phase-5-discounts
import AppRoutes from "./routes";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
<<<<<<< HEAD
=======
=======
>>>>>>> other-repo/phase-5-discounts
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
<<<<<<< HEAD

=======
>>>>>>> other-repo/phase-5-discounts
    </QueryClientProvider>
  </React.StrictMode>,
);
