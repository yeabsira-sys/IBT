
class Account:
  def __init__(self, name, account_number, balance = 0):
    self.name = name
    self.account_number = account_number
    self.__balance = balance

  @property
  def balance(self):
    return self.__balance

  @balance.setter
  def balance(self, amount):
    if amount < 0:
      raise ValueError("Amount connot be negatve")
    self.__balance = amount

  def deposit(self, amount):
    if amount <= 0:
      raise ValueError("Amount cannot be negative or zero")
    self.__balance += amount
    return f"Deposit of {amount} successful. New balance is {self.__balance}"

  def withdraw(self, amount):
    if amount > self._balance:
      raise ValueError("Insufficient funds")
    self.__balance -= amount
    return f"Withdrawal of {amount} successful. New balance is {self._balance}"

  def statement(self):
    return f"Account Statement for {self.name}:\nAccount Number: {self.account_number}\nBalance: {self.__balance}"

class SavingsAccount(Account):
  def __init__(self, name, account_number, balance = 0, rate = 0.05):
    super().__init__(name, account_number, balance)
    self.rate = rate

  def add_interest(self):
    self.deposit(self.__balance * self.rate)
  
  def withdraw(self, amount):
    if amount > self.balance:
      raise ValueError("NO enough balance")
    self.balance -= amount
  
  def statement(self):
    return f"Account Type: Saving \n Account Statement for {self.name}:\nAccount Number: {self.account_number}\nBalance: {self.balance}"

class CurrentAccount(Account):
  def __init__(self, name, account_number, balance = 0, overdraft = 1000):
    super().__init__(name, account_number, balance)
    self.overdraft = overdraft
  
  def withdraw(self, amount):
    if amount > self.balance or amount > self.overdraft:
      raise ValueError("NO enough balance OR OverDraft")
    self.balance -= amount
  
  def statement(self):
    return f"Account Type: Current Account \n Account Statement for {self.name}:\nAccount Number: {self.account_number}\nBalance: {self.balance}"




accounts = [
SavingsAccount("almaz", 12345, 1200),
CurrentAccount("abebe", 12346, 1800),
SavingsAccount("kebede", 12345, 1200),
CurrentAccount("ahmed", 12346, 1800)
]

# accounts[0].deposit(500)
# accounts[1].deposit(300)

# accounts[0].withdraw(200)
# print(accounts[0].statement())
# accounts[1].withdraw(1200)
# print(accounts[1].statement())

for account in accounts:
  print(account.statement())
