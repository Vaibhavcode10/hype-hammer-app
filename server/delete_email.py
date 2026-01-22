from google.cloud import firestore
import os

os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = '../serviceAccountKey.json'
db = firestore.Client()

email = 'shruti8766@gmail.com'
collections = ['auctioneers', 'teams', 'players', 'guests', 'users']

print(f"Searching for email: {email}\n")

for collection_name in collections:
    docs = list(db.collection(collection_name).where('email', '==', email).stream())
    if docs:
        print(f"Found in {collection_name}:")
        for doc in docs:
            data = doc.to_dict()
            print(f"  - ID: {doc.id}")
            print(f"    Name: {data.get('name')}")
            print(f"    Role: {data.get('role')}")
            print(f"    MatchId: {data.get('matchId')}")
            # Delete it
            db.collection(collection_name).document(doc.id).delete()
            print(f"    ✅ DELETED\n")

print("Done!")
