for (let i = 1; i <= 100; i++) {
  if (i % 3 === 0 && i % 5 === 0) {
    console.log("TeleBirr");
  } else if (i % 3 === 0) {
    console.log("Tele");
  } else if (i % 5 === 0) {
    console.log("Birr");
  } else {
    console.log(i);
  }
}
