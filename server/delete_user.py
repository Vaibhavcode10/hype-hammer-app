from google.cloud import firestore
import os

os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = '../serviceAccountKey.json'
db = firestore.Client()

email = 'shrutigaikwad876666@gmail.com'
users = list(db.collection('users').where('email', '==', email).stream())

if users:
    for user in users:
        db.collection('users').document(user.id).delete()
        print(f"Deleted user: {user.id}")
    print(f"Successfully deleted {len(users)} user(s) with email {email}")
else:
    print(f"No users found with email {email}")
