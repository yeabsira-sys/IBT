import math
def total(nums):
  if len(nums) > 0:
    print(nums[1:])
    return nums[0] + total(nums[1:])
  return 0

# print(total([1,2,3,4]))

def count_down(nums):
  if len(nums) > 0:
     print(nums[len(nums) - 1]) 
     return count_down(nums[:len(nums) - 1])
  return exit()

# count_down([1,2,3,4,5])

def binary_search(items, target):
  mid = math.floor(len(items) / 2)
  if(items[mid] == target):
    return True
  elif(items[mid] < target):
    return binary_search(items[mid:], target)
  elif(items[mid] > target):
    return binary_search(items[:mid], target)
  else:
    return False
  
# print(binary_search([1,2,3,4,5,6,7], 5))

def merge_sort(list):
  if len(list) <= 1:
    return list
  mid = len(list) // 2
  left = merge_sort(list[:mid])
  right = merge_sort(list[mid:])
  return merge(left, right)

def merge(left, right):
  sorted = []
  i = j = 0
  while i < len(left) and j < len(right):
    if left[i] <= right[j]:
      sorted.append(left[i])
      i += 1
    else:
      sorted.append(right[j])
      j += 1
  sorted.extend(left[i:])
  sorted.extend(right[j:])
  return sorted

print(merge_sort([2,4,5,1,7,4,2,4,9,2,]))

