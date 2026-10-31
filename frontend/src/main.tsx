import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./auth/AuthProvider";
<<<<<<< HEAD
=======
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
=======
import { AuthProvider } from "./auth/AuthProvider";
=======
import { AuthProvider } from "./auth/AuthProvider";
=======
>>>>>>> other-repo/phase-5-discounts
=======
>>>>>>> other-repo/phase-8a
=======
>>>>>>> other-repo/phase-8b
>>>>>>> recovery-old-main
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
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
=======
=======
>>>>>>> other-repo/phase-5-discounts
=======
>>>>>>> other-repo/phase-8a
=======
>>>>>>> other-repo/phase-8b
>>>>>>> recovery-old-main
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
<<<<<<< HEAD
=======
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD

=======
>>>>>>> other-repo/phase-5-discounts
=======
>>>>>>> other-repo/phase-8a
=======
>>>>>>> other-repo/phase-8b
>>>>>>> recovery-old-main
    </QueryClientProvider>
  </React.StrictMode>,
);
