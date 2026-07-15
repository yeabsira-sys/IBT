# 1 Temprature lable

# try:
#     temprature = float(input("Enter the temprature in celsius: "))

# except ValueError:
#     print("Please enter a valid number for temprature")
# else:
#     if temprature < 15:
#       print("cold")
#     elif temprature < 28:
#       print("warm")
#     else: 
#       print("hot")

# 2 Receipt loop

# for i in range(1, 11):
#   print("Receipt #", i)

# 3 Even numbers:

# for i in range(1, 21): 
#   if i % 2 == 0:
#     print(i)

# 4 Discount function

# def apply_discount(price, discount = 10):
#   return price - (price * discount / 100)

# price = apply_discount(100)
# print(price)

# print(apply_discount(100, 20))

# 5 countdown

i = 5
while i > 0:
    print(i)
    i -= 1
print("Liftoff!")