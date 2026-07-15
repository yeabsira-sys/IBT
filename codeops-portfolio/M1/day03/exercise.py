# Unique cities

cities = ["addis ababa", "hawasa", "mekelle", "addis ababa", "hawasa", "gondar", "dessie", "mekelle", "shashemene"]

unique_cities = set(cities)
print(unique_cities)
print(len(unique_cities))

# 2 Price report

groceries = {
  "banana": 100,
  "cabbage": 120,
  "carrot": 80,
  "potato": 60,
  "tomato": 80
}
for item, price in groceries.items():
    print(f"{item}: {price} birr")

# 3 Tax comprehension

prices = [100, 250, 400, 80]
prices_with_tax = [price * 1.15 for price in prices]
print(prices_with_tax)

# 4 Cheap items

cheap_items = [price for price in prices if price < 200]

print(cheap_items)

# Write & Read

with open("names.txt", "w") as name_file:
    name_file.write(input("Enter your name: ") + "\n")
    name_file.write("Bob\n")
    name_file.write("Charlie\n")
with open("names.txt", "r") as name_file:
    names = name_file.readlines()
    for name in names:
        print(name.strip())

# safe division

def safe_divide():
  try:
    divisor = float(input("Enter the dividend: "))
    return 1000 / divisor
  except ZeroDivisionError:
    return "Error: Division by zero is not allowed."
  except ValueError:
    return "Error: Invalid input. Please enter a numeric value."

print(safe_divide())


    