# read one line at a time

# with open("customers.txt") as f:
#   for line in f:
#     print(line.strip())

#     # read the whole file in to one string

# with open("customers.txt") as f:
#   text = f.read()

# print(text)


# writing files

# with open("report.txt", "w") as f:
#   f.write("Daily Report\n")
#   f.write("Total: 1500 ETB\n")


with open("log.txt", "a") as f:
  f.write("New entry\n")