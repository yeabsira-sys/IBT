
class AddisBank:
  def __init__(self, name, account_number, balance = 0):
    self.name = name
    self.account_number = account_number
    self.__balance = balance
  @property
  def balance(self):
    return self.__balance
  # @balance.setter
  # def balance(self, amount):
  #   if amount <= 0:
  #     raise ValueError("Amount cannot be negative or zero")
  #   self.__balance += amount
  def deposit(self, amount):
    if amount <= 0:
      raise ValueError("Amount cannot be negative or zero")
    self.__balance += amount
    return f"Deposit of {amount} successful. New balance is {self.__balance}"
  def withdraw(self, amount):
    if amount > self.__balance:
      raise ValueError("Insufficient funds")
    self.__balance -= amount
    return f"Withdrawal of {amount} successful. New balance is {self.__balance}"

  def statement(self):
    return f"Account Statement for {self.name}:\nAccount Number: {self.account_number}\nBalance: {self.__balance}"

ac1 = AddisBank("Abebe", "123456", 1000)

print(ac1.balance)
ac1.deposit(500)
print(ac1.balance)
ac1.withdraw(200)
# ac1.deposit(-100)
print(ac1.statement())
# ac1.withdraw(2000)