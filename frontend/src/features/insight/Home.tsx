import { Link } from "react-router-dom";
import { useAuth } from "../../auth/AuthProvider";

const BLURB = {
<<<<<<< HEAD
<<<<<<< HEAD
  admin: "Manage staff accounts and the product catalog (products, plans, taxes, payment terms). Discounts, billing and the finance dashboard arrive in the next phases.",
  staff: "Browse the product catalog now; subscriptions, billing and payments will appear here as they are built. Staff accounts are created by an admin.",
=======
  admin: "You can manage staff accounts now. Catalog, discounts, billing and the finance dashboard arrive in the next phases.",
  staff: "Subscriptions, billing and payments will appear here as they are built. Staff accounts are created by an admin.",
>>>>>>> other-repo/phase-5-discounts
=======
  admin: "Manage staff accounts and the product catalog (products, plans, taxes, payment terms). Discounts, billing and the finance dashboard arrive in the next phases.",
  staff: "Browse the product catalog now; subscriptions, billing and payments will appear here as they are built. Staff accounts are created by an admin.",
>>>>>>> other-repo/phase-8a
  customer: "Your subscriptions and invoices will appear here. You only ever see your own data.",
} as const;

export default function Home() {
  const { user } = useAuth();
  if (!user) return null;
  return (
    <div className="space-y-3">
      <h1 className="text-xl font-semibold">Welcome{user.name ? `, ${user.name}` : ""}</h1>
      <p className="text-slate-600">{BLURB[user.role]}</p>
      <p className="flex gap-4 text-sm">
<<<<<<< HEAD
<<<<<<< HEAD
        {user.role !== "customer" && <Link className="text-indigo-700" to="/catalog">Catalog</Link>}
=======
>>>>>>> other-repo/phase-5-discounts
=======
        {user.role !== "customer" && <Link className="text-indigo-700" to="/catalog">Catalog</Link>}
>>>>>>> other-repo/phase-8a
        {user.role === "admin" && <Link className="text-indigo-700" to="/staff">Manage staff</Link>}
        <Link className="text-indigo-700" to="/profile">Edit profile</Link>
      </p>
    </div>
  );
}
