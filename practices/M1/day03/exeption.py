try:
  amount = int(input("Amount: "))
  result = 1000 / amount
except ValueError:
  print("Please enter a number")
except ZeroDivisionError:
  print("Amount can't be zero")
else:
  print(result)
finally:
  print("Done")