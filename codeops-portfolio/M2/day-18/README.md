# TeleBirr Transaction Report

## Project Description

This mini-project processes TeleBirr transactions for an Addis Ababa shop.

It demonstrates modern JavaScript features including:

- map()
- filter()
- reduce()
- destructuring
- object spread
- ES modules

## Project Structure

### transactions.js

Contains the transaction data.

Each transaction has:

- id
- customer
- amount
- type

The type can be either:

- credit
- debit

### report.js

Contains reusable functions for processing transactions.

It provides functions to:

- calculate totals by transaction type
- filter transactions by type
- create formatted receipts
- generate a transaction summary

### app.js

Imports the transaction data and report functions.

It:

- calculates credit totals
- calculates debit totals
- separates credits and debits
- creates receipt strings
- demonstrates object spread
- prints the final summary

## JavaScript Concepts

### filter()

Used to separate credit and debit transactions.

### reduce()

Used to calculate the total amount.

### map()

Used to create formatted receipt strings.

### Destructuring

Used when accessing transaction properties.

Example:

```js
({ customer, amount });
```
