

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
    self.history = []

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

    self.history.append(("deposit", amount))
    self._notify(f"{self.name} depositd {amount} ETB")
    return f"Deposit of {amount} successful. New balance is {self.__balance}"

  def withdraw(self, amount):
    if amount > self.balance:
      raise ValueError("Insufficient funds")
    self.balance -= amount

    self.history.append(("withdraw", amount))
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
  
  def undo_last(self):
    if not self.history:
      print("Nothing to undo")
      return
    action, amount = self.history.pop()
    if action == "deposit":
      self.balance -= amount 

    elif action == "withdraw":
      self.balance += amount 

    print(f"Undo {action} of {amount}")

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
      

class AccountRegistry:
  def __init__(self):
    self.accounts = {}
    self.order = []
  def add(self, account):
    self.accounts[account.account_number] = account
    self.order.append(account)
  
  def find(self, number):
    return self.accounts.get(number)
  
  def list_all(self):
    return self.order

  def top_by_balance(self, n=5):
    accounts = sorted(
        self.accounts.values(),
        key=lambda account: account.balance,
        reverse=True
    )

    return accounts[:n]

  def binary_search(self, numbers, target):

    left = 0
    right = len(numbers) - 1

    while left <= right:

        mid = (left + right) // 2

        if numbers[mid] == target:
            return mid

        elif numbers[mid] < target:
            left = mid + 1

        else:
            right = mid - 1

    return -1

  def find_by_number(self, number):

    numbers = sorted(self.accounts.keys())

    index = self.binary_search(numbers, number)

    if index == -1:
     return None

    return self.accounts[numbers[index]]

  
  def total_transactions(self, number):

    account = self.find_by_number(number)

    if account is None:
        return 0

    return self.recursive_sum(account.history, 0)

  def recursive_sum(self, history, index):

    if index == len(history):
        return 0

    transaction = history[index][1]

    return transaction + self.recursive_sum(history, index + 1)

sms = SMSAlert()
log = AuditLog()

a1 = AccountFactory.create("savings", "Almaz", 1001, 3000)
a2 = AccountFactory.create("current", "abebe", 1002, 3000)
a3 = AccountFactory.create("savings", "abeba", 1003, 3000)
a4 = AccountFactory.create("savings", "hamza", 1004, 3000)

a1.subscribe(sms)
a1.subscribe(log)

a1.deposit(50000)

a1.withdraw(200)

a1.add_interest()

print(a1.statement())

config = BankConfig()
config2 = BankConfig()
print(config.interest_rate)
print(config.overdraft_limit)
print(config is config2)

registry = AccountRegistry()

registry.add(a1)
registry.add(a2)
registry.add(a3)
registry.add(a4)
print(registry.total_transactions(1001))
acc = registry.find(1002)
print(acc.statement())

# accs = registry.list_all()
# for acc in accs:
#   print(acc.name)