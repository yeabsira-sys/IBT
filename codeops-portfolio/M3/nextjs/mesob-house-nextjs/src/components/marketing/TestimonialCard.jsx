import Image from "next/image";
/**
 * TestimonialCard — thumbnail, eyebrow, quote and attribution.
 */
export default function TestimonialCard({ image, imageAlt = "", eyebrow, quote, source }) {
  return (
    <figure className="testimonial" style={{ margin: 0 }}>
      {image && <Image className="testimonial__thumb" src={image} alt={imageAlt ?? ""} width={132} height={116} />}
      <div>
        {eyebrow && <p className="testimonial__eyebrow">{eyebrow}</p>}
        <blockquote className="testimonial__quote">“{quote}”</blockquote>
        <figcaption className="testimonial__source">— {source}</figcaption>
      </div>
    </figure>
  );
}
