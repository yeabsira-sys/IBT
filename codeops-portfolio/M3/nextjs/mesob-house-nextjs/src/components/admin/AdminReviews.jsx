"use client";

import { useState } from "react";
import useSWR from "swr";
import { FiCheck, FiRefreshCw, FiTrash2, FiX } from "react-icons/fi";
import Button from "../ui/Button";
import Stars from "../reviews/Stars";
import { fetcher } from "@/lib/fetcher";
import { useToast } from "@/store/toastStore";

const STATUS_LABEL = {
  pending: "Pending",
  approved: "Live",
  rejected: "Hidden",
};

const dateLabel = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
};

export default function AdminReviews({ initialReviews = [] }) {
  const toast = useToast();
  const [status, setStatus] = useState("all");
  const key = status === "all" ? "/api/admin/reviews" : `/api/admin/reviews?status=${status}`;
  const { data, error, mutate, isValidating } = useSWR(key, fetcher, {
    fallbackData: status === "all" ? { data: initialReviews } : undefined,
    revalidateOnFocus: false,
  });
  const reviews = data?.data ?? (status === "all" ? initialReviews : []);
  const [busyId, setBusyId] = useState(null);

  const update = async (review, nextStatus) => {
    setBusyId(review.id);
    try {
      const response = await fetch(`/api/admin/reviews/${encodeURIComponent(review.id)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.message ?? "The review could not be updated.");
      toast(`Review marked ${STATUS_LABEL[nextStatus].toLowerCase()}.`, "success");
      await mutate();
    } catch (updateError) {
      toast(updateError.message, "error");
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (review) => {
    if (!window.confirm("Permanently delete this review?")) return;
    setBusyId(review.id);
    try {
      const response = await fetch(`/api/admin/reviews/${encodeURIComponent(review.id)}`, {
        method: "DELETE",
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.message ?? "The review could not be deleted.");
      toast("Review deleted.", "success");
      await mutate();
    } catch (deleteError) {
      toast(deleteError.message, "error");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="admin-reviews">
      <div className="admin-toolbar">
        <div>
          <h2>Guest reviews</h2>
          <p>
            Only customers with a completed order containing the dish can review.
            Approved reviews appear on the dish page.
          </p>
        </div>
        <div className="admin-toolbar__actions">
          <Button variant="outline" size="sm" leftIcon={<FiRefreshCw />} onClick={() => mutate()} disabled={isValidating}>
            Refresh
          </Button>
        </div>
      </div>

      <div className="admin-tabs" role="group" aria-label="Filter reviews">
        {[
          ["all", "All"],
          ["pending", "Pending"],
          ["approved", "Live"],
          ["rejected", "Hidden"],
        ].map(([value, label]) => (
          <Button
            key={value}
            size="sm"
            variant={status === value ? "primary" : "outline"}
            onClick={() => setStatus(value)}
          >
            {label}
          </Button>
        ))}
      </div>

      {error && <p className="admin-notice admin-notice--error">{error.message}</p>}

      {reviews.length === 0 ? (
        <p className="admin-empty">No reviews in this view yet.</p>
      ) : (
        <div className="admin-review-list">
          {reviews.map((review) => (
            <article className="admin-review" key={review.id}>
              <header>
                <div>
                  <strong>{review.author}</strong>
                  <span>{review.dishName || "Dish"}</span>
                  <span>{dateLabel(review.createdAt)}</span>
                </div>
                <div className="admin-review__meta">
                  <Stars value={review.rating} showValue />
                  <span className={`admin-flag admin-flag--${review.status}`}>
                    {STATUS_LABEL[review.status] ?? review.status}
                  </span>
                  {review.verified && <span className="admin-flag">Verified</span>}
                </div>
              </header>
              <p>{review.message}</p>
              <div className="admin-row-actions">
                {review.status !== "approved" && (
                  <Button size="sm" leftIcon={<FiCheck />} onClick={() => update(review, "approved")} disabled={busyId === review.id}>
                    Approve
                  </Button>
                )}
                {review.status !== "rejected" && (
                  <Button variant="outline" size="sm" leftIcon={<FiX />} onClick={() => update(review, "rejected")} disabled={busyId === review.id}>
                    Hide
                  </Button>
                )}
                {review.status !== "pending" && (
                  <Button variant="outline" size="sm" onClick={() => update(review, "pending")} disabled={busyId === review.id}>
                    Return to pending
                  </Button>
                )}
                <Button variant="ghost" size="sm" leftIcon={<FiTrash2 />} onClick={() => remove(review)} disabled={busyId === review.id}>
                  Delete
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
