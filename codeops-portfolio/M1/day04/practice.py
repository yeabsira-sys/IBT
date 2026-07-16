# Book class

# class Book:
#   def __init__(self, title, author, pages):
#     self.title = title
#     self.author = author
#     self.pages = pages

#   def describe(self):
#     return f"{self.title} by {self.author}, {self.pages} pages"

# book1 = Book("Fikr Eske Mekabir", "Hadis Alemayew", 340)
# book2 = Book("Merbeb", "Alemayew Wasei", 300)

# print(book1.describe())
# print(book2.describe())


# 2 Product class

# class Product:
#   def __init__(self, name, price, quantity):
#     self.name = name
#     self.price = price
#     self.quantity = quantity

#   def restock(n):
#     self.quantity += quantity
#   def restock(n):
#     self.quantity -= quantity

# p1 = Product("amoxixillin", 100, 23 )

# print(f"name: {p1.name}\t price: {p1.price}\t quantity: {p1.quantity}")

# # 3 Make it private

# class Product:
#   def __init__(self, name, price, quantity):
#     self.name = name
#     self.price = price
#     self.__quantity = quantity
  
#   @property
#   def quantity(self):
#     return self.__quantity

# p1 = Product("amoxixillin", 100, 23 )
# print(f"name: {p1.name}\t price: {p1.price}\t quantity: {p1.quantity}")

# 4 Validate

# class Product:
#   def __init__(self, name, price, quantity):
#     self.name = name
#     self.price = price
#     self.__quantity = quantity
  
#   @property
#   def quantity(self):
#     return self.__quantity
#   @quantity.setter
#   def quantity(self, amount):
#     if amount > self.__quantity:
#       raise ValueError("No Enough Stock")
#     self.__Quantity -= amount

# p1 = Product("amoxixillin", 100, 23 )
# print(f"name: {p1.name}\t price: {p1.price}\ quantity: {p1.quantity}")

# p1.quantity = 100


class Product:
  def __init__(self, name, price, quantity):
    self.name = name
    self.price = price
    self.__quantity = quantity
  
  @property
  def quantity(self):
    return self.__quantity
  @quantity.setter
  def quantity(self, amount):
    if amount > self.__quantity:
      raise ValueError("No Enough Stock")
    self.__quantity -= amount

p1 = Product("amoxixillin", 100, 23 )
p2 = Product("ibuprofen", 100, 23 )
p3 = Product("tramadol", 100, 23 )

p2.quantity = 21

print(f"product: {p1.name}\t price: {p1.price}\t quantity: {p1.quantity}")

print(f"product: {p2.name}\t price: {p2.price}\t quantity: {p2.quantity}")

print(f"product: {p3.name}\t price: {p3.price}\t quantity: {p3.quantity}")  