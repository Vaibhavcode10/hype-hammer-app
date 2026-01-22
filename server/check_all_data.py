from google.cloud import firestore
import os

os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = '../serviceAccountKey.json'
db = firestore.Client()

print("Checking all collections in Firebase:")
print("\n=== USERS ===")
users = list(db.collection('users').stream())
print(f"Total users: {len(users)}")
for user in users[:10]:
    data = user.to_dict()
    print(f"  {user.id}: {data.get('name')} - {data.get('role')} - Match: {data.get('matchId')}")

print("\n=== MATCHES ===")
matches = list(db.collection('matches').stream())
print(f"Total matches: {len(matches)}")
for match in matches[:10]:
    data = match.to_dict()
    print(f"  {match.id}: {data.get('matchName')}")

print("\n=== TEAMS ===")
teams = list(db.collection('teams').stream())
print(f"Total teams: {len(teams)}")

print("\n=== PLAYERS ===")
players = list(db.collection('players').stream())
print(f"Total players: {len(players)}")
