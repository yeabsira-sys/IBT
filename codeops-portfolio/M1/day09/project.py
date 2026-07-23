from collections import deque


class BankConfig:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance.interest_rate = 0.05
            cls._instance.overdraft_limit = 1000
        return cls._instance


class SMSAlert:
    def update(self, message):
        print(f"SMS ALERT: {message}")


class AuditLog:
    def update(self, message):
        print(f"AUDIT LOG: {message}")


class Account:

    def __init__(self, name, account_number, balance=0):
        self.name = name
        self.account_number = account_number
        self._balance = balance
        self.history = []
        self._observers = []

    @property
    def balance(self):
        return self._balance

    @balance.setter
    def balance(self, amount):
        if amount < 0:
            raise ValueError("Balance cannot be negative")
        self._balance = amount

    def subscribe(self, observer):
        self._observers.append(observer)

    def _notify(self, message):
        for observer in self._observers:
            observer.update(message)

    def deposit(self, amount):
        if amount <= 0:
            raise ValueError("Amount must be positive")

        self.balance += amount
        self.history.append(("deposit", amount))
        self._notify(f"{self.name} deposited {amount} ETB")

    def withdraw(self, amount):
        if amount > self.balance:
            raise ValueError("Insufficient funds")

        self.balance -= amount
        self.history.append(("withdraw", amount))
        self._notify(f"{self.name} withdrew {amount} ETB")

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

    def statement(self):
        return (
            f"{self.name} "
            f"({self.account_number}) "
            f"Balance = {self.balance}"
        )


class SavingsAccount(Account):

    def __init__(self, name, account_number, balance=0):
        super().__init__(name, account_number, balance)
        self.rate = BankConfig().interest_rate

    def add_interest(self):
        interest = self.balance * self.rate
        self.deposit(interest)


class CurrentAccount(Account):

    def __init__(self, name, account_number, balance=0):
        super().__init__(name, account_number, balance)
        self.overdraft = BankConfig().overdraft_limit

    def withdraw(self, amount):

        if amount > self.balance + self.overdraft:
            raise ValueError("Overdraft limit exceeded")

        self._balance -= amount
        self.history.append(("withdraw", amount))
        self._notify(f"{self.name} withdrew {amount} ETB")


class AccountFactory:

    @staticmethod
    def create(kind, owner, number, balance=0):

        if kind.lower() == "savings":
            return SavingsAccount(owner, number, balance)

        elif kind.lower() == "current":
            return CurrentAccount(owner, number, balance)

        else:
            raise ValueError("Invalid account type")


def binary_search(arr, target):

    left = 0
    right = len(arr) - 1

    while left <= right:

        mid = (left + right) // 2

        if arr[mid] == target:
            return mid

        elif arr[mid] < target:
            left = mid + 1

        else:
            right = mid - 1

    return -1


def recursive_sum(history, index=0):

    if index == len(history):
        return 0

    return history[index][1] + recursive_sum(history, index + 1)



class AccountRegistry:

    def __init__(self):
        self.by_number = {}
        self.in_order = []

    def add(self, account):
        self.by_number[account.account_number] = account
        self.in_order.append(account)

    def find(self, number):
        return self.by_number.get(number)

    def list_all(self):
        return self.in_order

    def top_by_balance(self, n=5):

        accounts = sorted(
            self.by_number.values(),
            key=lambda account: account.balance,
            reverse=True
        )

        return accounts[:n]

    def find_by_number(self, number):

        numbers = sorted(self.by_number.keys())

        index = binary_search(numbers, number)

        if index == -1:
            return None

        return self.by_number[numbers[index]]

    def total_transactions(self, number):

        account = self.find_by_number(number)

        if account is None:
            return 0

        return recursive_sum(account.history)


class Branch:

    def __init__(self, name):
        self.name = name
        self.children = []
        self.accounts = []

    def add_child(self, branch):
        self.children.append(branch)

    def add_account(self, account):
        self.accounts.append(account)

    def total_balance(self):

        total = sum(account.balance for account in self.accounts)

        for child in self.children:
            total += child.total_balance()

        return total


# -----------------------------
# Breadth First Search
# -----------------------------
def bfs(transfers, start):

    visited = set()

    queue = deque([start])

    reachable = []

    while queue:

        current = queue.popleft()

        if current not in visited:

            visited.add(current)

            reachable.append(current)

            for neighbour in transfers.get(current, []):
                queue.append(neighbour)

    return reachable




sms = SMSAlert()
log = AuditLog()

registry = AccountRegistry()

a1 = AccountFactory.create("savings", "Almaz", 1001, 5000)
a2 = AccountFactory.create("current", "Abebe", 1002, 3000)
a3 = AccountFactory.create("savings", "Ahmed", 1003, 7000)
a4 = AccountFactory.create("current", "Kebede", 1004, 2500)

for account in [a1, a2, a3, a4]:
    account.subscribe(sms)
    account.subscribe(log)
    registry.add(account)

a1.deposit(500)
a1.withdraw(200)
a1.add_interest()

print("\nTransaction Total:")
print(registry.total_transactions(1001))

print("\nTop Accounts")
for account in registry.top_by_balance(3):
    print(account.statement())

print("\nBinary Search")
print(registry.find_by_number(1003).statement())

head = Branch("Head Office")

north = Branch("North Region")
south = Branch("South Region")

addis = Branch("Addis")
bahirdar = Branch("Bahir Dar")
hawassa = Branch("Hawassa")

head.add_child(north)
head.add_child(south)

north.add_child(addis)
north.add_child(bahirdar)

south.add_child(hawassa)

addis.add_account(a1)
addis.add_account(a2)

bahirdar.add_account(a3)

hawassa.add_account(a4)

print("\nTotal Branch Balance")
print(head.total_balance())

transfers = {
    1001: [1002, 1003],
    1002: [1004],
    1003: [1004],
    1004: [1005],
    1005: []
}

print("\nBFS Traversal")
print(bfs(transfers, 1001))