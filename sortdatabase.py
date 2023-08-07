# Sorts the units and constants alphabetically and copies the file to the top level for easier access.

import json
with open("./src/lib/database.json") as f:
    obj = json.loads(f.read())

obj["units"] = sorted(obj["units"], key=lambda x: x["text"].lower())
obj["constants"] = sorted(obj["constants"], key=lambda x: x["text"].lower())
text = json.dumps(obj, indent=2)

with open("./src/lib/database.json", "w") as f:
    f.write(text)

# This one is read-only
with open("./database.json", "w") as f:
    f.write(text)
