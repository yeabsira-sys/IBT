import "./header.css";

const Header = ({ handleSearchInput }) => {
  return (
    <header className="header-container">
      <h1>Addis Eats</h1>

      <input
        type="search"
        name="search-food"
        id="search-food"
        placeholder="Search food..."
        onChange={(e) => handleSearchInput(e.target.value)}
      />
    </header>
  );
};

export default Header;
