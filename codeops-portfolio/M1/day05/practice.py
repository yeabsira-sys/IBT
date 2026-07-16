# Vehicle hierarchy
from abc import ABC, abstractmethod

class Vehicle(ABC):
  def __init__(self, make, model, wheels):
    self.make = make
    self.model = model
    self.wheels = wheels
  def describe(self):
    return f"make: {self.make} \t model: {self.model}"
  @abstractmethod
  def wheel(self):
    return f"{self.wheels}"

class Car(Vehicle):
  def wheel(self):
    return f"{self.wheels}"

class Truck(Vehicle):
  def __init__(self, make, model, wheels, capacity):
    super().__init__(make, model, wheels)
    self.capacity = capacity
  
  def describe(self):
    return f"make: {self.make} \t model {self.model} \t capacity = {self.capacity}"
  
  def wheel(self):
    return f"{self.wheels}"

vehicles = [
  Car("toyota", "vitz", 4),
  Truck("sino", "sino truck", 10, "4000 kg"),
  Car("toyota", "corolla", 4),
  Truck("euro tracker", "380", 22, "6000 kg"),
]

for vehicle in vehicles:
  print(vehicle.describe())
  print(vehicle.wheel())

