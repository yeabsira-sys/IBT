
# !Bubble Sort
def bubble_sort(arr):
    n = len(arr)
    # Traverse through all elements in the list
    for i in range(n):
        swapped = False
        
        # Last i elements are already in place, so we don't check them
        for j in range(0, n - i - 1):
            # Compare adjacent elements
            if arr[j] > arr[j + 1]:
                # Swap if the element found is greater than the next element
                arr[j], arr[j + 1] = arr[j + 1], arr[j]
                swapped = True
                
        # If no two elements were swapped in the inner loop, the list is sorted
        if not swapped:
            break
            
    return arr

# Example usage:
numbers = [64, 34, 25, 12, 22, 11, 90]
sorted_numbers = bubble_sort(numbers)
print("Sorted array:", sorted_numbers)




# !Selection Sort
def selection_sort(arr):
    n = len(arr)
    
    # Traverse through all array elements
    for i in range(n):
        # Assume the minimum element is the current starting index
        min_idx = i
        
        # Search the rest of the array for a smaller element
        for j in range(i + 1, n):
            if arr[j] < arr[min_idx]:
                min_idx = j
                
        # Swap the found minimum element with the first element
        arr[i], arr[min_idx] = arr[min_idx], arr[i]
        
    return arr

# Example Usage:
numbers = [64, 25, 12, 22, 11]
sorted_numbers = selection_sort(numbers)

print("Sorted array:", sorted_numbers)
# Output: Sorted array: [11, 12, 22, 25, 64]





# !Insertion sort
def insertion_sort(arr):
    # Traverse through 1 to len(arr)
    for i in range(1, len(arr)):
        key = arr[i]
        
        # Move elements of arr[0..i-1], that are greater than key,
        # to one position ahead of their current position
        j = i - 1
        while j >= 0 and arr[j] > key:
            arr[j + 1] = arr[j]
            j -= 1
            
        # Place the key at the correct position
        arr[j + 1] = key
        
    return arr

# Example usage:
numbers = [12, 11, 13, 5, 6]
print(f"Original array: {numbers}")

sorted_numbers = insertion_sort(numbers)
print(f"Sorted array:   {sorted_numbers}")


    





# !Merge Sort
def merge_sort(arr):
    # Base case: if the array has 1 or 0 elements, it's already sorted
    if len(arr) <= 1:
        return arr

    # Find the middle point and divide the array into two halves
    mid = len(arr) // 2
    left_half = arr[:mid]
    right_half = arr[mid:]

    # Recursively sort both halves
    left_sorted = merge_sort(left_half)
    right_sorted = merge_sort(right_half)

    # Merge the sorted halves
    return merge(left_sorted, right_sorted)


def merge(left, right):
    sorted_array = []
    i = j = 0

    # Compare elements from both halves and append the smaller one
    while i < len(left) and j < len(right):
        if left[i] < right[j]:
            sorted_array.append(left[i])
            i += 1
        else:
            sorted_array.append(right[j])
            j += 1

    # If there are remaining elements in left, append them
    sorted_array.extend(left[i:])
    
    # If there are remaining elements in right, append them
    sorted_array.extend(right[j:])

    return sorted_array



numbers = [38, 27, 43, 3, 9, 82, 10]
print(f"Original array: {numbers}")

sorted_numbers = merge_sort(numbers)
print(f"Sorted array:   {sorted_numbers}")





# !Two Pointers Technique
def is_palindrome(s):
    left, right = 0, len(s) - 1

    while left < right:
        # Move left pointer past non-alphanumeric characters
        while left < right and not s[left].isalnum():
            left += 1
        # Move right pointer past non-alphanumeric characters
        while left < right and not s[right].isalnum():
            right -= 1

        # Compare characters case-insensitively
        if s[left].lower() != s[right].lower():
            return False

        left += 1
        right -= 1

    return True

# Example usage:
print(is_palindrome("A man, a plan, a canal: Panama"))  # Output: True




# !Sliding Window Technique
def max_sub_array_of_size_k(k, arr):
    max_sum = 0
    window_sum = 0
    window_start = 0

    for window_end in range(len(arr)):
        window_sum += arr[window_end]  # Add the next element to the window

        # Slide the window once we reach size k
        if window_end >= k - 1:
            max_sum = max(max_sum, window_sum)
            window_sum -= arr[window_start]  # Subtract element going out of window
            window_start += 1  # Slide window ahead

    return max_sum

# Example usage:
print(max_sub_array_of_size_k(3, [2, 1, 5, 1, 3, 2]))  # Output: 9 (subarray [5, 1, 3])
