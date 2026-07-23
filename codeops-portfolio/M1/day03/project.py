
stock = {}

def load_stock():
  try:
    with open("stock.txt", "r") as f:
      for line in f:
        item, quantity = line.strip().split(",")
        stock[item] = int(quantity)
  except FileNotFoundError:
    print("Stock file not found.")
    exit()
  except ValueError:
    print("Invalid data in stock file.")
    exit()


def add_stock(item, quantity):
    if quantity <= 0 or not isinstance(quantity, int):
      raise ValueError("Quantity must be a positive integer.")
    with open("stock.txt", "w") as f:
      if item in stock:
          stock[item] += quantity
          for item, quantity in stock.items():
              f.write(f"{item},{quantity}\n")
      else:
        stock[item] = quantity
def deduct_stock(item, quantity):
  if quantity <= 0 or not isinstance(quantity, int):
    raise ValueError("Quantity must be a positive integer.")
  with open("stock.txt", "w") as f:
    if item in stock:
        if stock[item] < quantity:
            raise ValueError("Not enough stock to deduct.")
        stock[item] -= quantity
        for item, quantity in stock.items():
            f.write(f"{item},{quantity}\n")
    else:
        stock[item] = quantity
def report():
  low_stock_items = [item for item, quantity in stock.items() if quantity < 10]
  if len(low_stock_items) > 0:
    print("Low stock items:")
    for item in low_stock_items:
      print(f"{item}: {stock[item]}")

def worker():
  load_stock()
  while True:
    print("\nCurrent stock:")
    for item, quantity in stock.items():
      print(f"{item}: {quantity}")
    print("\nOptions:")
    print("1. buy stock")
    print("2. sell stock")
    print("3. Generate report")
    print("4. Exit")
    choice = input("Enter your choice: ")
    if choice == "1":
      item = input("Enter item name: ")
      quantity = int(input("Enter quantity to update: "))
      add_stock(item, quantity)
    elif choice == "2":
      item = input("Enter item name: ")
      quantity = int(input("Enter quantity to deduct: "))
      deduct_stock(item, quantity)
    elif choice == "3":
      report()
    elif choice == "4":
      break
    else:
      print("Invalid choice. Please try again.")

worker()