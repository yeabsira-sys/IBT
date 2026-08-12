// const node = document.getElementById("page-header");
// console.log(node);
// console.log(document.querySelectorAll("li"));

// node.innerText = "Welcome to the DOM Manipulation Course!";

// node.style.color = "blue";
// node.innerHTML = "<em>Welcome to the DOM Manipulation Course!</em>";
// node.addEventListener("click", function () {
//   alert("You clicked the header!");
// });

const formSubmitHandler = (event) => {
  event.preventDefault();
  const name = document.getElementById("email").value;
  const email = document.getElementById("password").value;

  console.log(`Name: ${name}`);
  console.log(`Email: ${email}`);

  // Clear the form fields after submission
  document.getElementById("login-form").reset();
};

document
  .getElementById("login-form")
  .addEventListener("submit", formSubmitHandler);
