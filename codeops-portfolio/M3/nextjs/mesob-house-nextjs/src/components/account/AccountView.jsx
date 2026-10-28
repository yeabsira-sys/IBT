"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FiClipboard,
  FiHeart,
  FiLogOut,
  FiShield,
  FiTool,
  FiX,
} from "react-icons/fi";
import { useSWRConfig } from "swr";
import Button from "../ui/Button";
import { Card } from "../ui/Surface";
import { Avatar } from "../ui/Primitives";
import { dietaryOptions } from "@/data/content";
import { useStore } from "@/store/appStore";
import { useToast } from "@/store/toastStore";
import { signOutAction } from "@/actions/auth";
import { SESSION_KEY } from "@/hooks/useSession";

const preferenceLabel = (value) =>
  dietaryOptions.find((o) => o.value === value)?.label ?? value;
const roleLabel = {
  customer: "Customer",
  employee: "Kitchen employee",
  admin: "Administrator",
};

/** AccountView — server-provided profile plus client-side favorites and sign-out. */
export default function AccountView({ user }) {
  const router = useRouter();
  const toast = useToast();
  const { mutate } = useSWRConfig();
  const favorites = useStore((s) => s.favorites);
  const toggleFavorite = useStore((s) => s.toggleFavorite);
  const isStaff = user.role === "employee" || user.role === "admin";

  const handleSignOut = async () => {
    await signOutAction();
    await mutate(SESSION_KEY);
    toast("Signed out", "info");
    router.push("/");
    router.refresh();
  };

  return (
    <div className="account-layout">
      <Card variant="raised" className="account-card">
        <div className="account-card__head">
          <Avatar name={user.fullName} size={56} />
          <div>
            <h1>{user.fullName}</h1>
            <p>Welcome back to Mesob House</p>
          </div>
        </div>

        <dl className="account-details">
          <div>
            <dt>Email</dt>
            <dd>{user.email}</dd>
          </div>
          {user.phone && (
            <div>
              <dt>Mobile</dt>
              <dd>+251 {user.phone}</dd>
            </div>
          )}
          <div>
            <dt>Account type</dt>
            <dd>{roleLabel[user.role] ?? user.role}</dd>
          </div>
          {user.preference && (
            <div>
              <dt>Dining Preference</dt>
              <dd>{preferenceLabel(user.preference)}</dd>
            </div>
          )}
          {user.provider && (
            <div>
              <dt>Signed In Via</dt>
              <dd>{user.provider}</dd>
            </div>
          )}
        </dl>

        <div className="account-actions">
          {!isStaff && (
            <Button
              as={Link}
              href="/orders"
              variant="primary"
              leftIcon={<FiClipboard />}
            >
              Your Orders
            </Button>
          )}
          {isStaff && (
            <Button
              as={Link}
              href="/kitchen"
              variant="outline"
              leftIcon={<FiTool />}
            >
              Kitchen
            </Button>
          )}
          {user.role === "admin" && (
            <Button
              as={Link}
              href="/admin"
              variant="outline"
              leftIcon={<FiShield />}
            >
              Admin
            </Button>
          )}
          <Button
            variant="ghost"
            leftIcon={<FiLogOut />}
            onClick={handleSignOut}
          >
            Sign Out
          </Button>
        </div>
      </Card>

      {!isStaff && (
        <Card variant="panel" className="account-favorites">
          <h2>
            <FiHeart aria-hidden="true" /> Your Favorites ({favorites.length})
          </h2>
          {favorites.length === 0 ? (
            <p className="account-favorites__empty">
              Dishes you save from the menu will show up here — look for
              &quot;Save to Favorites&quot; on any dish.
            </p>
          ) : (
            <ul className="account-favorites__list">
              {favorites.map((dish) => (
                <li key={dish.id}>
                  <Link href={`/dish/${dish.id}`}>{dish.name}</Link>
                  <button
                    type="button"
                    aria-label={`Remove ${dish.name} from favorites`}
                    onClick={() => toggleFavorite(dish)}
                  >
                    <FiX aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </div>
  );
}
