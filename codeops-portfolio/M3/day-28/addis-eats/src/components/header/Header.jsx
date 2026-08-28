import "./header.css";

const Header = ({ handleSearchInput }) => {
  const handleSearch = (e) => {
    handleSearchInput(e.target.value);
  };
  return (
    <div className="header-container">
      <h1>Header</h1>
      <input
        type="search"
        name="search-food"
        id="search-food"
        placeholder="search food by category"
        onInput={(e) => handleSearch(e)}
      />
    </div>
  );
};

export default Header;
