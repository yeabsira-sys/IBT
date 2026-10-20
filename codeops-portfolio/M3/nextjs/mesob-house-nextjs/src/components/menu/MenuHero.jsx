import { FiSearch } from "react-icons/fi";
import { Badge } from "../ui/Surface";
import { Tag } from "../ui/Primitives";

/** MenuHero — heading, search field and quick dietary badges. */
export default function MenuHero({ eyebrow, title, lede, searchPlaceholder, search, onSearchChange, badges = [] }) {
  return (
    <header className="menu-hero">
      <Badge dots={0} icon={null}>
        {eyebrow}
      </Badge>
      <h1 className="menu-hero__title">{title}</h1>
      <p className="menu-hero__lede">{lede}</p>

      <div className="menu-hero__search">
        <div className="menu-hero__search-box">
          <FiSearch aria-hidden="true" />
          <input
            type="search"
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        <div className="menu-hero__badges">
          {badges.map((badge) => (
            <Tag key={badge.text} tone={badge.tone} icon={badge.icon}>
              {badge.text}
            </Tag>
          ))}
        </div>
      </div>
    </header>
  );
}
