import math

# a list holds an ordered collection of items, which can be of any type 

cities = ["Addis Ababa", "Adama", "Hawasa", "Bahir Dar", "Gondar"]

totals = []

for price in [100, 250, 400]:
  totals.append(math.ceil(price * 1.15))

# print(totals)  # prints the list of totals with tax included

  # tuples are similar to lists, but they are immutable (cannot be changed after creation) and are defined using parentheses instead of square brackets

  location = (9.0192, 38.7525)
  lat, lon = location
  # location[0] = 10.0  # This will raise an error because tuples are immutable
print(f"Latitude: {lat}, Longitude: {lon}")
