
class Account:
  def __init__(self, balance):
    self.__balance = balance
    
  @property
  def balance(self):
    return self.__balance
  @balance.setter
  def balance(self, value):
    if value < 0:
      raise ValueError("negative number not allowed")
    self.__balance = value
  
a = Account(100)
print(a.balance)


class SavingAccount(Account):
  pass

alazar = SavingAccount(100)