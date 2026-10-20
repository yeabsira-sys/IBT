"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { FiAlertCircle } from "react-icons/fi";
import { refreshMenu } from "@/actions/menu";

/**
 * FallbackNotice — shown when the server couldn't reach the menu backend and
 * rendered the example dishes instead. "Retry" calls a Server Action that
 * expires the cached menu, then refreshes the route's Server Components.
 */
export default function FallbackNotice({ what = "the live menu" }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <p className="async-notice async-notice--error" role="alert">
      <FiAlertCircle />
      Couldn&apos;t load {what} — showing example dishes instead.
      <button
        type="button"
        className="async-notice__retry"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await refreshMenu();
            router.refresh();
          })
        }
      >
        {pending ? "Retrying…" : "Retry"}
      </button>
    </p>
  );
}
