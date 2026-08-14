setTimeout(() => {
  console.log("first");
}, 3000);

let promise = new Promise((resolve, reject) => {
  resolve("second");
});

promise.then((value) => {
  console.log(value);
});

console.log("third");

function callBack(val, fun) {
  return fun(val);
}

function fun(val) {
  return val * 2;
}
console.log(callBack(10, fun));
