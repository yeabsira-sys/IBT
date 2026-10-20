"use client";

import Image from "next/image";
import { useState } from "react";
import { Tag } from "../ui/Primitives";

/**
 * Gallery — main dish photo with its badges, plus a thumbnail strip that
 * swaps the hero image. Fully self-contained; pass `images` (first is hero).
 */
export default function Gallery({ images, alt, badges = [], caption }) {
  const [active, setActive] = useState(0);

  return (
    <div className="gallery">
      <figure className="gallery__hero">
        <Image src={images[active]} alt={alt} width={900} height={760} priority sizes="(max-width: 900px) 100vw, 55vw" />
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
              <Image src={src} alt="" width={300} height={225} sizes="150px" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
