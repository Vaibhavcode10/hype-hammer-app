from google.cloud import firestore
import os

os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = '../serviceAccountKey.json'
db = firestore.Client()

email = 'shrutigaikwad876666@gmail.com'
users = list(db.collection('users').where('email', '==', email).stream())

if users:
    print(f"Found {len(users)} user(s) with email {email}:")
    for user in users:
        data = user.to_dict()
        print(f"  - ID: {user.id}")
        print(f"    Name: {data.get('name')}")
        print(f"    Role: {data.get('role')}")
        print(f"    MatchId: {data.get('matchId')}")
else:
    print(f"No users found with email {email}")
