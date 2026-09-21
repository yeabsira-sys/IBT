import { FaHandsHoldingChild } from "react-icons/fa6";

export function EtiquetteCard({ title, text }) {
  return (
    <div className="etiquette-card">
      <span className="etiquette-card__mark" aria-hidden="true" />
      <div>
        <h4 className="etiquette-card__title">{title}</h4>
        <p className="etiquette-card__text">{text}</p>
      </div>
    </div>
  );
}

export default function EtiquettePanel({
  heading,
  cards = [],
  noteLabel,
  notePlaceholder,
  note,
  onNoteChange,
  meaning,
}) {
  return (
    <section className="etiquette">
      <h3 className="etiquette__heading">
        <FaHandsHoldingChild aria-hidden="true" />
        {heading}
      </h3>

      <div className="etiquette__grid">
        {cards.map((card) => (
          <EtiquetteCard key={card.title} {...card} />
        ))}
      </div>

      <label className="etiquette__note-label" htmlFor="kitchen-note">
        {noteLabel}
        <span>Optional</span>
      </label>
      <textarea
        id="kitchen-note"
        className="etiquette__note"
        placeholder={notePlaceholder}
        value={note}
        onChange={(e) => onNoteChange(e.target.value)}
        rows={2}
      />

      {meaning && (
        <div className="meaning-card">
          <span className="meaning-card__icon" aria-hidden="true">
            ♥
          </span>
          <div>
            <h4 className="meaning-card__title">{meaning.title}</h4>
            <p className="meaning-card__text">{meaning.text}</p>
          </div>
        </div>
      )}
    </section>
  );
}
