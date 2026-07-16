from abc import ABC, abstractmethod


class Account(ABC):
  def __init__(self, owner, account_number, balance = 0):
    self.owner = owner
    self.account_number = account_number
    self.__balance = balance
  @property
  def balance(self):
    return self.__balance

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
    return f"Account Statement for {self.owner}:\nAccount Number: {self.account_number}\nBalance: {self.__balance}"
  
  def statement(self):
    print(f"{self.owner}: {self.balance} ETB")
  
  @abstractmethod
  def calculate_interest(self):
    print("private")


class SavingAccount(Account):
  def __init__(self, owner, account_number, balance = 0, rate = 0.05):
    super().__init__(owner, account_number, balance)
    self.rate = rate
  def calculate_interest(self):
    return self.balance * 0.05

# s = SavingAccount("Almaz", "123456", 1000)
# s.deposit(500)
# print(s.balance)
# s.add_interest()
# print(s.balance)


class CurrentAccount(Account):
    def statement(self):
        print(f"[Current] {self.owner}: {self.balance} ETB")
    def calculate_interest(self):
      return 0

accounts = [
SavingAccount("Almaz", 12346, 2000),
CurrentAccount("Dawit", 12347, 1500),
]
for acc in accounts:  
  acc.statement() 

