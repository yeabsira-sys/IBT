from collections import deque
import heapq

# 1. Binary Search Tree

class Node:
    def __init__(self, value):
        self.value = value
        self.left = None
        self.right = None


def insert(root, value):

    if root is None:
        return Node(value)

    if value < root.value:
        root.left = insert(root.left, value)
    else:
        root.right = insert(root.right, value)

    return root


def inorder(root):

    if root is None:
        return

    inorder(root.left)
    print(root.value, end=" ")
    inorder(root.right)


print("========== Binary Search Tree ==========")

balances = [2500, 4000, 1200, 6000, 3000, 1800, 7000]

root = None

for balance in balances:
    root = insert(root, balance)

print("Balances in sorted order:")
inorder(root)

print("\n")


# 2.

def height(node):

    if node is None:
        return 0

    left_height = height(node.left)
    right_height = height(node.right)

    return 1 + max(left_height, right_height)


print("========== Tree Height ==========")
print("Height:", height(root))
print()


# 3. Breadth First Search

graph = {
    "A": ["B", "C"],
    "B": ["D", "E"],
    "C": ["F"],
    "D": [],
    "E": ["F"],
    "F": []
}


def bfs(graph, start):

    visited = set()

    queue = deque([start])

    while queue:

        vertex = queue.popleft()

        if vertex not in visited:

            visited.add(vertex)

            for neighbour in graph[vertex]:
                queue.append(neighbour)

    return visited


print("========== BFS ==========")
print("Reachable:", bfs(graph, "A"))
print()


# 4. Depth First Search

def dfs(graph, vertex, visited=None):

    if visited is None:
        visited = set()

    visited.add(vertex)

    print(vertex, end=" ")

    for neighbour in graph[vertex]:

        if neighbour not in visited:
            dfs(graph, neighbour, visited)

    return visited


print("========== DFS ==========")
dfs(graph, "A")
print("\n")


# 5. Priority Queue

tasks = []

heapq.heappush(tasks, (3, "Prepare report"))
heapq.heappush(tasks, (1, "Fix server"))
heapq.heappush(tasks, (5, "Drink coffee"))
heapq.heappush(tasks, (2, "Reply emails"))
heapq.heappush(tasks, (4, "Meeting"))

print("========== Priority Queue ==========")

while tasks:
    priority, task = heapq.heappop(tasks)
    print(f"Priority {priority}: {task}")