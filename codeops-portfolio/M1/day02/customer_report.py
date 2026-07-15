customers = [
("Almaz", 1500), ("Dawit", 700), ("Tigist", 200),
("Hanna", 1200), ("Samuel", 450),
]
def tier(balance):
    if balance >= 1000:
        return "Premium"
    elif balance >= 500:
        return "Standard"
    return "Basic"

tiers_amount = {}
for name, balance in customers:
    label = tier(balance)
    tiers_amount.setdefault(label, []).append((name))
    print(f"{name}: {tier(balance)}{balance} ETB)")

for label in tiers_amount:
    print(f"{label}: {len(tiers_amount[label])} customers")