import math

# a comprehention builds a collection in a single, readable line

prices = [100, 250, 400]
dict_prices = {
  "tea": 100,
  "coffee": 250,
  "smothei": 400
}

with_tax = [p * 1.15 for p in prices]

cheap = [p for p in prices if p < 300]

# print(prices)
# print(with_tax)
# print(cheap)


# dict comprehension
discounted = {item: p * 0.9 for item, p in dict_prices.items()}
print(discounted)

# set comprehension

lengths = {len(n) for n in dict_prices}

print(lengths)