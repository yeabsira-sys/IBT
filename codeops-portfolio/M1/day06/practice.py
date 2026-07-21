class Report:
    def build(self):
        print("Building report")


class ReportSaver:
    def save(self, report):
        print("Saving report")


class ReportEmailer:
    def send(self, report):
        print("Sending report by email")


# Usage
report = Report()
report.build()

saver = ReportSaver()
saver.save(report)

emailer = ReportEmailer()
emailer.send(report)


from abc import ABC, abstractmethod
import math


class Shape(ABC):

    @abstractmethod
    def area(self):
        pass


class Circle(Shape):
    def __init__(self, radius):
        self.radius = radius

    def area(self):
        return math.pi * self.radius ** 2


class Square(Shape):
    def __init__(self, side):
        self.side = side

    def area(self):
        return self.side ** 2


class Triangle(Shape):
    def __init__(self, base, height):
        self.base = base
        self.height = height

    def area(self):
        return 0.5 * self.base * self.height


shapes = [
    Circle(5),
    Square(4),
    Triangle(8, 3)
]

for shape in shapes:
    print(shape.area())


class AppSettings:

    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance.currency = "ETB"

        return cls._instance


a = AppSettings()
b = AppSettings()

print(a.currency)
print(a is b)


class Circle:
    def draw(self):
        print("Drawing Circle")


class Square:
    def draw(self):
        print("Drawing Square")


class Triangle:
    def draw(self):
        print("Drawing Triangle")


class ShapeFactory:

    @staticmethod
    def create(kind):

        if kind.lower() == "circle":
            return Circle()

        elif kind.lower() == "square":
            return Square()

        elif kind.lower() == "triangle":
            return Triangle()

        else:
            raise ValueError("Unknown shape")


shape1 = ShapeFactory.create("circle")
shape2 = ShapeFactory.create("square")
shape3 = ShapeFactory.create("triangle")

shape1.draw()
shape2.draw()
shape3.draw()


class NewsAgency:

    def __init__(self):
        self.subscribers = []

    def subscribe(self, subscriber):
        self.subscribers.append(subscriber)

    def notify(self, news):
        for subscriber in self.subscribers:
            subscriber.update(news)


class TVSubscriber:

    def update(self, news):
        print("TV:", news)


class MobileSubscriber:

    def update(self, news):
        print("Mobile:", news)


agency = NewsAgency()

tv = TVSubscriber()
mobile = MobileSubscriber()

agency.subscribe(tv)
agency.subscribe(mobile)

agency.notify("Breaking News: Python 3.15 Released!")