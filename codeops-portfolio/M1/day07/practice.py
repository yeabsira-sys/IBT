# 1. List Index
numbers = [10, 20, 30, 40, 50]
print(numbers[3])

# Big-O: O(1)
# Explanation:
# Accessing an element by index takes constant time because Python
# directly computes its memory address.


# 2. Single Loop
for i in range(10):
    print(i)

# Big-O: O(n)
# Explanation:
# The loop visits every element exactly once.


# 3. Nested Loop
for i in range(5):
    for j in range(5):
        print(i, j)

# Big-O: O(n²)
# Explanation:
# For every iteration of the outer loop, the inner loop runs completely.


# 4. Dictionary Lookup
accounts = {
    101: "Almaz",
    102: "Abebe",
    103: "Ahmed"
}

print(accounts[102])

# Big-O: O(1)
# Explanation:
# Dictionaries use hash tables, giving average constant-time lookup.


# 5. Binary Search
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


numbers = list(range(100))

print(binary_search(numbers, 75))

# Big-O: O(log n)
# Explanation:
# Each iteration cuts the search space in half.


import time

accounts_list = []
accounts_dict = {}

for i in range(100000):
    acc = f"ACC{i}"
    accounts_list.append(acc)
    accounts_dict[acc] = i

target = "ACC99999"

# List lookup
start = time.perf_counter()

found = target in accounts_list

end = time.perf_counter()

print("List lookup:", end - start)


# Dictionary lookup
start = time.perf_counter()

found = target in accounts_dict

end = time.perf_counter()

print("Dictionary lookup:", end - start)


class Stack:

    def __init__(self):
        self.items = []

    def push(self, item):
        self.items.append(item)

    def pop(self):
        return self.items.pop()

    def peek(self):
        return self.items[-1]


names = ["Almaz", "Abebe", "Ahmed", "Kebede"]

stack = Stack()

for name in names:
    stack.push(name)

print("Reversed:")

while stack.items:
    print(stack.pop())


from collections import deque

queue = deque()

queue.append("Almaz")
queue.append("Abebe")
queue.append("Ahmed")
queue.append("Kebede")
queue.append("Tigist")

print("Serving customers:")

while queue:
    customer = queue.popleft()
    print(customer)

class Node:

    def __init__(self, data):
        self.data = data
        self.next = None


class LinkedList:

    def __init__(self):
        self.head = None

    def push_front(self, data):

        new_node = Node(data)

        new_node.next = self.head

        self.head = new_node

    def print_all(self):

        current = self.head

        while current:

            print(current.data)

            current = current.next


ll = LinkedList()

ll.push_front("Ahmed")
ll.push_front("Abebe")
ll.push_front("Almaz")

ll.print_all()

