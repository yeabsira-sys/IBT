
name = ["yeab", "bety", "fikr", "hile", "kebede"]

def telebirr(amount):
  return (amount + amount * 0.10) / 5

amount = float(input("enter the price: "))

dividen_price = telebirr(amount)

for person in name:
  print(f"{person}: {dividen_price}")