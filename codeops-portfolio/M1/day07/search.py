import math

def linear_search(list, value):
  for l in list:
    if (l == value):
      return True
  return False

def binary_search(list, value):
  lo, hi = 0, len(list)
  print(list)
  mid = math.ceil((lo + hi)/2)
  if list[mid] == value:
    return True
  elif list[mid] < value:
   return binary_search(list[mid:], value)
  elif list[mid] > value:
   return binary_search(list[:mid], value)
  elif len(list) == 1 and list[mid] != value:
    return False
  


list = [1,2,3,4,5,6,7,8,9]

print(linear_search(list, 4))
print(binary_search(list, 19))
print(binary_search(list, 2))