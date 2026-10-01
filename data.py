CATEGORIES = ["Overflowing Bin", "Garbage on Road", "Missed Collection", "Illegal Dumping", "Improper Segregation", "Other"]
STATUSES = ["Submitted", "Under Review", "In Progress", "Resolved", "Rejected"]
PRIORITIES = ["Low", "Medium", "High"]

BADGES = [("Beginner", 0, "0–24"), ("Clean Citizen", 25, "25–49"), ("Eco Contributor", 50, "50–99"),
          ("Waste Warrior", 100, "100–199"), ("Green Champion", 200, "200+")]

EARN = [("Report a valid waste issue", 5), ("Correct quiz answer", 1),
        ("Verified correct segregation", 20), ("Community clean-up activity", 25)]

TIPS = [("Wet waste", "Food scraps, vegetable peels, flowers.", "wet"), ("Dry waste", "Paper, plastic, metal, clean packaging.", "dry"),
        ("E-waste", "Phones, chargers, batteries.", "ewaste"), ("Hazardous waste", "Bulbs, chemicals, medicines.", "haz")]

# Answers stay on the server so the quiz cannot be cheated from the browser.
QUIZ = [
    {"q": "Vegetable peels belong to which category?", "options": ["Wet Waste", "Dry Waste", "E-Waste", "Hazardous Waste"], "answer": 0},
    {"q": "Old newspapers and clean plastic bottles are…", "options": ["Wet Waste", "Dry Waste", "E-Waste", "Hazardous Waste"], "answer": 1},
    {"q": "A broken mobile charger should go to…", "options": ["Wet Waste", "Dry Waste", "E-Waste", "Hazardous Waste"], "answer": 2},
    {"q": "Expired medicines and used CFL bulbs are…", "options": ["Wet Waste", "Dry Waste", "E-Waste", "Hazardous Waste"], "answer": 3},
    {"q": "What is the correct way to use bins?", "options": ["Mix all waste in one bag", "Keep wet and dry waste separate",
                                                              "Put hazardous waste with wet waste", "Burn waste in the open"], "answer": 1},
]


def get_badge(points: int) -> dict:
    i = max(idx for idx, b in enumerate(BADGES) if points >= b[1])
    nxt = BADGES[i + 1] if i + 1 < len(BADGES) else None
    goal = 100 if points < 100 else 200 if points < 200 else points
    return {"name": BADGES[i][0], "next": nxt[0] if nxt else None, "to_next": nxt[1] - points if nxt else 0,
            "goal": goal, "pct": min(100, round(points * 100 / goal))}
