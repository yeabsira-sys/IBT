/** Tiny Ethiopian flag used by the phone prefix. */
export default function FlagET({ size = 20 }) {
  return (
    <span
      className="flag-et"
      role="img"
      aria-label="Ethiopia"
      style={{
        width: size,
        height: size * 0.7,
        background:
          "linear-gradient(#078930 0 33.33%, #fcdd09 33.33% 66.66%, #da121a 66.66%)",
      }}
    />
  );
}
