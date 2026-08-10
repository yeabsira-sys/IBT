// normal function declaration

function greet(name = "Guest") {
  console.log(`welcome ${name}`);
}

// greet("Yeab");

// arrow function declaration
// prevents hoisting

const greetArrow = (name = "Guest") => {
  console.log(`welcome ${name}`);
};

// greetArrow("Yeab");
// console.log(typeof greet);

// Scope and Closure
function makeGreeter(greeting) {
  return function (name) {
    return `${greeting}, ${name}!`;
  };
}
const selam = makeGreeter("Selam");
// console.log(selam("Almaz"));

function makeMultiply(x) {
  return function (y) {
    return x * y;
  };
}

// const multiply = makeMultiply(2);
// console.log(multiply(4));

// callback function

const callback = (num1, num2) => {
  return num1 + num2;
};

function calculate(num1, num2, callback) {
  return callback(num1, num2);
}

const addition = calculate(5, 10, callback);
const substraction = calculate(10, 5, (num1, num2) => num1 - num2);
console.log(addition);
console.log(substraction);
