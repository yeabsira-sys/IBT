

class BankConfig:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance.interest_rate = 0.05
            cls._instance.overdraft_limit = 1000
        return cls._instance


class Account:
  def __init__(self, name, account_number, balance = 0):
    self.name = name
    self.account_number = account_number
    self.__balance = balance
    self._observers = []

  def subscribe(self, observer):
    self._observers.append(observer)
    
  def _notify(self, message):
    for observer in self._observers:
      observer.update(message)

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

    self._notify(f"{self.name} depositd {amount} ETB")
    return f"Deposit of {amount} successful. New balance is {self.__balance}"

  def withdraw(self, amount):
    if amount > self._balance:
      raise ValueError("Insufficient funds")
    self.__balance -= amount

    self._notify(f"{self.name} withdrew {amount}")
    return f"Withdrawal of {amount} successful. New balance is {self._balance}"

  def statement(self):
    return f"Account Statement for {self.name}:\nAccount Number: {self.account_number}\nBalance: {self.__balance}"

class SavingsAccount(Account):
  def __init__(self, name, account_number, balance = 0, rate = 0.05):
    super().__init__(name, account_number, balance)
    self.rate = BankConfig().interest_rate

  def add_interest(self):
    self.deposit(self.balance * self.rate)
  
  def withdraw(self, amount):
    if amount > self.balance:
      raise ValueError("NO enough balance")
    self.balance -= amount
  
  def statement(self):
    return f"Account Type: Saving \n Account Statement for {self.name}:\nAccount Number: {self.account_number}\nBalance: {self.balance}"

class CurrentAccount(Account):
  def __init__(self, name, account_number, balance = 0, overdraft = 1000):
    super().__init__(name, account_number, balance)
    self.overdraft = BankConfig().overdraft_limit
  
  def withdraw(self, amount):
    if amount > self.balance or amount > self.overdraft:
      raise ValueError("NO enough balance OR OverDraft")
    self.balance -= amount
  
  def statement(self):
    return f"Account Type: Current Account \n Account Statement for {self.name}:\nAccount Number: {self.account_number}\nBalance: {self.balance}"


class SMSAlert:
    def update(self, message):
        print(f"SMS ALERT: {message}")


class AuditLog:
    def update(self, message):
        print(f"AUDIT LOG: {message}")
  
class AccountFactory:
  @staticmethod
  def create(kind, owner, account_number, balance):
    if kind.lower() == "savings":
      return SavingsAccount(owner, account_number, balance)
    elif kind.lower() == "current":
      return CurrentAccount(owner, account_number, balance)
    else: 
      raise ValueError("Invalid account types")
      

sms = SMSAlert()
log = AuditLog()

a1 = AccountFactory.create("savings", "Almaz", 1001, 3000)

a1.subscribe(sms)
a1.subscribe(log)

a1.deposit(500)

a1.withdraw(200)

a1.add_interest()

print(a1.statement())

config = BankConfig()
config2 = BankConfig()
print(config.interest_rate)
print(config.overdraft_limit)
print(config is config2)