import { Avatar, SectionHeading, Stars } from "../ui/Primitives";

/** ReviewCard — rating, quote and the guest's attribution. */
export function ReviewCard({ rating = 5, quote, name, role, avatar }) {
  return (
    <article className="review">
      <Stars value={rating} label={`Rated ${rating} out of 5`} />
      <blockquote className="review__quote">“{quote}”</blockquote>
      <footer className="review__author">
        <Avatar name={name} src={avatar} size={32} />
        <span>
          <b>{name}</b>
          <small>{role}</small>
        </span>
      </footer>
    </article>
  );
}

/** ReflectionsSection — centred heading + review grid. */
export default function ReflectionsSection({ eyebrow, title, reviews = [] }) {
  return (
    <section className="section">
      <SectionHeading eyebrow={eyebrow} title={title} align="center" />
      <div className="review-grid">
        {reviews.map((review) => (
          <ReviewCard key={review.name} {...review} />
        ))}
      </div>
    </section>
  );
}
