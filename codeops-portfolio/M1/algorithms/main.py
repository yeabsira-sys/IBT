#Given an array of numbers, write a function that prints in the console another arraywhich contains all the even numbers in the original array, which also have even indexes only.
#  ○ Test 1: getOnlyEvens([1, 2, 3, 6, 4, 8]) prints [ 4]
# ○ Test 2: getOnlyEvens([0, 1, 2, 3, 4]) prints [0, 2, 4]

def get_only_evens(lst):

  even = []
  for l in range(0, len(lst), 2):
    if lst[l]%2 == 0:
      even.append(lst[l])

  return even

print(get_only_evens([1, 2, 3, 6, 4, 8]))
print(get_only_evens([0, 1, 2, 3, 4]))


#Question 2 ● Create a function that takes a two-digit number as an parameter and prints "Ok" inthe console if the given string is greater than its reversed digit version. If not, the function will print "Not ok"
    # ○ Test 1: reverseCompare(72) prints "ok" because 72 > 27
    # ○ reverseCompare(23) prints "Not ok", because 23 is not greater than 32

def reverse_compare(num1):
  str_num = str(num1)
  if int(str_num[::-1]) > num1:
    print("OK")
  else:
    print("NOT OK")

reverse_compare(72)
reverse_compare(23)


# Question 3

# ● Write a function that takes a positive integer and returns the factorial of the number. Notes: The factorial of 0 is 1. Ex: factorial seven is : 1 × 2 × 3 × 4 × 5 × 6 × 7. The factorial of any positive integer x is x * (x - 1) * (x - 2) * . . . . . . * 1 (ex: factorial of 4 is 4 * 3 * 2 * 1 = 24)
#     ○ Test 1: returnFactorial(5) outputs 120
#     ○ Test 2: returnFactorial(6) outputs 720
#     ○ Test 3: returnFactorial(0) outputs 1

def return_factorial(num):
  fact = 1
  if num == 0 and fact != None:
    return 1
  fact = None
  return  num * return_factorial(num - 1)
  
print(return_factorial(5))
print(return_factorial(6))
print(return_factorial(0))



# Question 4 (Meera array)
# ● A Meera array is defined to be an array containing only numbers as its elements and forall n values in the array, the value n*2 is not in the array. So [3, 5, -2] is a Meera array because 3*2, 5*2 or 2*2 are not in the array. But [8, 3, 4] is not a Meera array because 2*4=8 and both 4 and 8 are elements found in the array. Write a function that takes an array of numbered elements and prints “I am a Meera array” in the console if its array does NOT contain n and also n*2 as value. Otherwise, the function prints “I am NOT a Meera array”
#       ○ Test 1: checkMeera([10, 4, 0, 5]) outputs “I am NOT a Meera array” because 5 * 2 is 10
#       ○ Test 2: checkMeera([7, 4, 9]) outputs “I am a Meera array”
#       ○ Test 1: checkMeera([1, -6, 4, -3]) outputs “I am NOT a Meera array” because -3 *2 is -6

def meera_array(lst):
  for i in lst:
    for j in lst:
      if 2 * j == i:
        return " I am Not a Meera array"
  return "I am a Meera array"

print(meera_array([10, 4, 0, 5]))
print(meera_array([7, 4, 9]))
print(meera_array([1, -6, 4, -3]))



# Question 5 (Dual array)
# ● Define a Dual array to be an array where every value occurs exactly twice. For example, {1, 2, 1, 3, 3, 2} is a dual array.The following arrays are not Dual arrays {2, 5, 2, 5, 5} (5 occurs three times instead of two times) {3, 1, 1, 2, 2} (3 occurs once instead of two
# times) Write a function named isDual that returns 1 if its array argument is a Dual array.
# Otherwise it returns 0

def is_dual(lst):
  lookup = {}

  for l in lst:
    if l in lookup:
      lookup[l] += 1
    else: 
      lookup[l] = 1
  for i, l in lookup.items():
    if l == 2:
      return 1  
  return -1

print(is_dual([1,2,3,3,2,1]))


# Question 6
# ● Write a function that takes the number of seconds and returns the digital format clock time as a string. Time should be counted from 00:00:00.
#       ○ Examples: digitalClock(5025) as "01:23:45" 5025 seconds is 1 hour, 23 mins, 45secs.
#       ■ digitalClock(61201) as "17:00:01" No AM/PM. 24h format.
#       ■ digitalClock(87000) as "00:10:00" It's 00:10 next day.

import datetime
def digital_clock(seconds):
  # hours, rem = divmod(seconds, 3600)
  # print(hours)
  return(str(datetime.timedelta(seconds=seconds)))


print(digital_clock(87000))