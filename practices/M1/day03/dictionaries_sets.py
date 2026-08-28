# a ictionarie is a collection of key-value pairs. Each key is unique and maps to a value. Dictionaries are mutable, meaning you can change their content without changing their identity.

customer = { 
  "name": "Alamz Bekele",
  "balance": 1500,
  "city": "Addis ababa",
}

for key in customer:
  print(key, ":", customer[key])