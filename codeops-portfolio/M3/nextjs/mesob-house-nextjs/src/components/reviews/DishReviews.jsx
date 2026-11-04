"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FiCheckCircle, FiEdit3, FiLock } from "react-icons/fi";
import Button from "../ui/Button";
import Stars from "./Stars";
import { submitReview } from "@/actions/reviews";
import { useToast } from "@/store/toastStore";

const dateLabel = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
};

function ReviewRow({ review }) {
  return (
    <article className="review-card">
      <header className="review-card__head">
        <div>
          <strong>{review.author}</strong>
          <span className="review-card__date">{dateLabel(review.createdAt)}</span>
        </div>
        <Stars value={review.rating} />
      </header>
      <p>{review.message}</p>
      {review.verified && (
        <span className="review-card__verified">
          <FiCheckCircle aria-hidden="true" /> Verified order
        </span>
      )}
    </article>
  );
}

export default function DishReviews({
  dishId,
  dishName,
  summary,
  reviews = [],
  existingReview = null,
  canReview = false,
  isSignedIn = false,
  signInHref = "/sign-in",
}) {
  const router = useRouter();
  const toast = useToast();
  const [rating, setRating] = useState(existingReview?.rating ?? 0);
  const [hovered, setHovered] = useState(0);
  const [message, setMessage] = useState(existingReview?.message ?? "");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setRating(existingReview?.rating ?? 0);
    setMessage(existingReview?.message ?? "");
  }, [existingReview?.rating, existingReview?.message]);

  const submit = (event) => {
    event.preventDefault();
    startTransition(async () => {
      const result = await submitReview({ menuItemId: dishId, rating, message });
      if (!result.ok) {
        toast(result.message, "error");
        return;
      }
      toast(result.message, "success");
      router.refresh();
    });
  };

  const average = Number(summary?.average ?? 0);
  const count = Number(summary?.count ?? 0);

  return (
    <section className="reviews" id="reviews" aria-labelledby="reviews-title">
      <header className="reviews__head">
        <div>
          <p className="section-heading__eyebrow">From the Mesob table</p>
          <h2 id="reviews-title">Guest reviews for {dishName}</h2>
        </div>
        <div className="reviews__summary">
          <strong>{count ? average.toFixed(1) : "—"}</strong>
          <div>
            <Stars value={average} />
            <span>{count ? `${count} verified review${count === 1 ? "" : "s"}` : "No reviews yet"}</span>
          </div>
        </div>
      </header>

      <div className="reviews__layout">
        <div className="reviews__list">
          {reviews.length ? (
            reviews.map((review) => <ReviewRow key={review.id} review={review} />)
          ) : (
            <p className="reviews__empty">
              This dish is waiting for its first guest review. Order it, then tell
              the next guest what to expect.
            </p>
          )}
        </div>

        <aside className="review-form-card">
          {!isSignedIn ? (
            <div className="review-form-card__message">
              <FiLock aria-hidden="true" />
              <h3>Share your experience</h3>
              <p>Sign in to leave a star rating and a note for other guests.</p>
              <Button as={Link} href={signInHref} size="sm">
                Sign in to review
              </Button>
            </div>
          ) : !canReview ? (
            <div className="review-form-card__message">
              <FiCheckCircle aria-hidden="true" />
              <h3>Verified reviews only</h3>
              <p>
                Reviews open after a completed order containing {dishName}. Your
                table&apos;s feedback keeps the menu honest.
              </p>
              {existingReview && (
                <p className="review-form-card__status">
                  Your current review is {existingReview.status}.
                </p>
              )}
            </div>
          ) : (
            <form className="review-form" onSubmit={submit}>
              <div className="review-form__title">
                <FiEdit3 aria-hidden="true" />
                <h3>{existingReview ? "Update your review" : "Share your experience"}</h3>
              </div>
              <p className="review-form__lede">
                {existingReview
                  ? "Your edit replaces the review already on this page."
                  : `You have a completed order with ${dishName}, so your review is verified.`}
              </p>

              <fieldset className="review-form__rating">
                <legend>Your rating</legend>
                <div className="review-form__stars" onMouseLeave={() => setHovered(0)}>
                  {[1, 2, 3, 4, 5].map((star) => {
                    const active = (hovered || rating) >= star;
                    return (
                      <button
                        key={star}
                        type="button"
                        aria-label={`${star} star${star === 1 ? "" : "s"}`}
                        aria-pressed={rating === star}
                        className={active ? "is-active" : ""}
                        onMouseEnter={() => setHovered(star)}
                        onFocus={() => setHovered(star)}
                        onClick={() => setRating(star)}
                      >
                        ★
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              <label className="review-form__label" htmlFor="review-message">
                Your review
              </label>
              <textarea
                id="review-message"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                maxLength={1200}
                rows={5}
                placeholder="What did you order, and how was it?"
                required
              />
              <div className="review-form__foot">
                <span>{message.trim().length}/1200</span>
                <Button type="submit" size="sm" disabled={pending || rating < 1 || message.trim().length < 3}>
                  {pending ? "Saving…" : existingReview ? "Update review" : "Publish review"}
                </Button>
              </div>
              {existingReview?.status !== "approved" && existingReview && (
                <p className="review-form__status">
                  Your previous review was {existingReview.status}. Publishing
                  submits it for moderation again.
                </p>
              )}
            </form>
          )}
        </aside>
      </div>
    </section>
  );
}
