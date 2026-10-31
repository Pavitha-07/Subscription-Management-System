import { Route } from "react-router-dom";
import type { NavItem } from "../../components/nav";
import RoleGuard from "../../components/RoleGuard";
<<<<<<< HEAD
import Home from "./Home";
import MySubscriptions from "./MySubscriptions";

// INSIGHT (person D): home, customer portal, and later dashboard, discounts, notifications screens.
export const insightNav: NavItem[] = [
  { to: "/", label: "Home", roles: ["admin", "staff", "customer"], end: true }, // label is per-role in Layout
  { to: "/my-subscriptions", label: "My subscriptions", roles: ["customer"] },
=======
import { DiscountsPage } from "./Discounts";
import DiscountRedemptions from "./DiscountRedemptions";
import Home from "./Home";

// INSIGHT (person D): home, discounts, and later dashboard, customer portal, notifications screens.
export const insightNav: NavItem[] = [
  { to: "/", label: "Home", roles: ["admin", "staff", "customer"], end: true }, // label is per-role in Layout
  { to: "/discounts", label: "Discounts", roles: ["admin", "staff"] },
>>>>>>> other-repo/phase-5-discounts
];

// Called (not rendered) inside <Routes> in src/routes.tsx, so each element needs a key.
export const insightRoutes = () => [
  <Route key="home" index element={<Home />} />,
<<<<<<< HEAD
  <Route key="my-subs" path="my-subscriptions" element={<RoleGuard allow={["customer"]}><MySubscriptions /></RoleGuard>} />,
=======
  <Route key="discounts" path="discounts" element={<RoleGuard allow={["admin", "staff"]}><DiscountsPage /></RoleGuard>} />,
  <Route key="discount-redemptions" path="discounts/:id/redemptions" element={<RoleGuard allow={["admin", "staff"]}><DiscountRedemptions /></RoleGuard>} />,
>>>>>>> other-repo/phase-5-discounts
];
