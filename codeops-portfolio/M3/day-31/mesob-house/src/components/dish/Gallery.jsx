import { useState } from "react";
import { Tag } from "../ui/Primitives";

export default function Gallery({ images, alt, badges = [], caption }) {
  const [active, setActive] = useState(0);

  return (
    <div className="gallery">
      <figure className="gallery__hero">
        <img src={images[active]} alt={alt} />
        <div className="gallery__badges">
          {badges.map((badge) => (
            <Tag key={badge.text} tone={badge.tone}>
              {badge.text}
            </Tag>
          ))}
        </div>
        {caption && (
          <figcaption className="gallery__caption">
            <span>{caption.left}</span>
            <span>{caption.right}</span>
          </figcaption>
        )}
      </figure>

      {images.length > 1 && (
        <div className="gallery__thumbs">
          {images.map((src, i) => (
            <button
              key={src}
              type="button"
              className={`gallery__thumb${i === active ? " gallery__thumb--active" : ""}`}
              onClick={() => setActive(i)}
              aria-label={`Show photo ${i + 1}`}
            >
              <img src={src} alt="" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
