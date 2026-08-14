let selectedTheme = localStorage.getItem("theme") || "light";

const themeToggler = document.getElementById("theme");

themeToggler.addEventListener("change", () => {
  selectedTheme = themeToggler.value.toLowerCase();
  localStorage.setItem("theme", selectedTheme);
  document.body.className = selectedTheme;
});

document.body.className = selectedTheme;

const PhonePattern = /^(\+?^251?|0?)(\9|7)\d{8}$/;

// console.log(PhonePattern.test("21121212"));
// console.log(PhonePattern.test("251992112121"));
// console.log(PhonePattern.test("+251792112121"));
// console.log(PhonePattern.test("0792112122"));

const form = document.getElementById("signup-form");
const usernameInput = document.getElementById("username");
const phoneInput = document.getElementById("phone");
const signupCountSpan = document.getElementById("signup-count");
let users = localStorage.getItem("users")
  ? JSON.parse(localStorage.getItem("users"))
  : [];
signupCountSpan.textContent =
  users.length > 1
    ? `${users.length} Users have signedup`
    : `${users.length} User have signedup`;
const handleSubmit = (e) => {
  e.preventDefault();
  const name = document.getElementById("username").value;
  const phone = document.getElementById("phone").value;
  if (!validateName(name) || !validatePhone(phone)) {
    console.log("Enter Proper Name and Phone number");
    return;
  }
  localStorage.setItem("users", JSON.stringify([...users, { name, phone }]));
  let signedupUsers =
    localStorage.getItem("users") &&
    (users = JSON.parse(localStorage.getItem("users")));
  signupCountSpan.textContent = signedupUsers.length;
  e.target.reset();
};

const validateName = (name) => {
  return /^([a-zA-Z\s]+)$/.test(name);
};

const validatePhone = (phone) => {
  // const localPhone = localStorage.getItem(`${phone}`);
  // return PhonePattern.test(phone) && localPhone == phone;
  return PhonePattern.test(phone);
};

const handlePhoneChange = (e) => {
  const phone = document.getElementById("phone").value;
  const isValid = validatePhone(phone);
  const phoneSpan = document.getElementById("phone-span");
  phoneSpan.textContent = isValid ? "" : "Invalid phone format";
  phoneInput.classList.toggle("error", !isValid);
};

const handleNameChange = (e) => {
  const name = document.getElementById("username").value;
  const isValid = validateName(name);
  const nameSpan = document.getElementById("username-span");
  nameSpan.textContent = isValid ? "" : "Invalid name format";
  nameSpan.classList.toggle("error", !isValid);
};

form.addEventListener("submit", (e) => handleSubmit(e));

usernameInput.addEventListener("change", (e) => handleNameChange());

phoneInput.addEventListener("change", (e) => handlePhoneChange());
