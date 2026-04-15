from typing import Optional, Dict, List
from datetime import datetime, timedelta, timezone
import os
import firebase_admin
from firebase_admin import credentials, firestore
import json
import traceback


class FirebaseService:
    """Singleton service pre Firebase Firestore operácie."""

    _instance = None
    _db = None

    COLLECTION_MAP = {
        'food':     'foodEntries',
        'exercise': 'workoutEntries',
        'stress':   'stressEntries',
        'mood':     'moodEntries',
        'sleep':    'sleepEntries',
        'weight':   'weightEntries',
    }

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._init_firebase()
        return cls._instance

    @classmethod
    def _init_firebase(cls):
        """
        Inicializuje Firebase. Poradie:
        1. Env premenná FIREBASE_CREDENTIALS (JSON string) – používa sa na Render
        2. Lokálny súbor serviceAccountKey.json – pre lokálny vývoj
        """
        try:
            cred = None

            env_creds = os.getenv("FIREBASE_CREDENTIALS") or os.getenv("FIREBASE_SERVICE_ACCOUNT")
            if env_creds:
                try:
                    cred_dict = json.loads(env_creds)
                    cred = credentials.Certificate(cred_dict)
                    print(f"[Firebase] Credentials z env OK – projekt: {cred_dict.get('project_id')}")
                except Exception as e:
                    print(f"[Firebase] CHYBA: FIREBASE_CREDENTIALS nie je platný JSON: {e}")

            if not cred:
                local_key = os.path.join(os.path.dirname(os.path.abspath(__file__)), "serviceAccountKey.json")
                if os.path.exists(local_key):
                    try:
                        cred = credentials.Certificate(local_key)
                        print(f"[Firebase] Lokálny kľúč načítaný.")
                    except Exception as e:
                        print(f"[Firebase] Chyba pri načítaní lokálneho kľúča: {e}")

            if cred:
                try:
                    firebase_admin.get_app()
                except ValueError:
                    firebase_admin.initialize_app(cred)
                cls._db = firestore.client()
                print(f"[Firebase] Pripojené: {firebase_admin.get_app().project_id}")
            else:
                print("[Firebase] CHYBA: Credentials nenájdené. Nastav FIREBASE_CREDENTIALS.")
                cls._db = None

        except Exception as e:
            print(f"[Firebase] Chyba inicializácie: {e}")
            traceback.print_exc()
            cls._db = None

    @property
    def db(self):
        return self._db

    def is_connected(self) -> bool:
        return self._db is not None

    @staticmethod
    def _ts_to_iso(ts) -> Optional[str]:
        """Skonvertuje Firestore Timestamp na ISO 8601 string."""
        if ts is None:
            return None
        try:
            if hasattr(ts, 'isoformat'):
                return ts.isoformat()
            if hasattr(ts, 'timestamp'):
                return datetime.fromtimestamp(ts.timestamp(), tz=timezone.utc).isoformat()
            if isinstance(ts, str):
                return ts
        except Exception:
            pass
        return None

    @staticmethod
    def _ts_to_float(ts) -> float:
        """Skonvertuje timestamp na float sekúnd – pre zoradenie."""
        if ts is None:
            return 0.0
        try:
            if hasattr(ts, 'timestamp'):
                return ts.timestamp()
            if isinstance(ts, (int, float)):
                return float(ts)
            if isinstance(ts, str):
                return datetime.fromisoformat(ts.replace('Z', '+00:00')).timestamp()
        except Exception:
            pass
        return 0.0

    # -------------------------------------------------------------------------
    # PROFIL
    # -------------------------------------------------------------------------

    def get_user_profile(self, user_id: str) -> Optional[Dict]:
        if not self.is_connected():
            return None
        try:
            doc = self._db.collection('users').document(user_id).get()
            return doc.to_dict() if doc.exists else None
        except Exception as e:
            print(f"[Firebase] get_user_profile chyba: {e}")
            return None

    def update_profile(self, user_id: str, updates: Dict) -> bool:
        if not self.is_connected():
            return False
        try:
            updates['updatedAt'] = firestore.SERVER_TIMESTAMP
            self._db.collection('users').document(user_id).update(updates)
            return True
        except Exception as e:
            print(f"[Firebase] update_profile chyba: {e}")
            return False

    # -------------------------------------------------------------------------
    # ZÁZNAMY
    # -------------------------------------------------------------------------

    def get_entries(self, user_id: str, entry_type: str, days: int = 30, limit: int = 100) -> List[Dict]:
        """Vráti záznamy za posledných N dní, zoradené od najnovšieho."""
        if not self.is_connected():
            return []

        coll_name = self.COLLECTION_MAP.get(entry_type)
        if not coll_name:
            return []

        try:
            coll_ref = self._db.collection('users').document(user_id).collection(coll_name)
            docs = list(
                coll_ref.order_by('timestamp', direction=firestore.Query.DESCENDING)
                        .limit(limit * 3)
                        .stream()
            )

            cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).replace(
                hour=0, minute=0, second=0, microsecond=0
            )

            results = []
            for doc in docs:
                data = doc.to_dict()
                data['id'] = doc.id
                ts = data.get('timestamp')
                if ts is None:
                    results.append(data)
                    continue
                try:
                    if hasattr(ts, 'timestamp'):
                        doc_dt = datetime.fromtimestamp(ts.timestamp(), tz=timezone.utc)
                    elif isinstance(ts, datetime):
                        doc_dt = ts if ts.tzinfo else ts.replace(tzinfo=timezone.utc)
                    else:
                        results.append(data)
                        continue
                    if doc_dt >= cutoff:
                        results.append(data)
                except Exception:
                    results.append(data)

            return results[:limit]

        except Exception as e:
            print(f"[Firebase] get_entries({entry_type}) chyba: {e}")
            traceback.print_exc()
            return []

    def save_entry(self, user_id: str, entry_type: str, data: Dict) -> bool:
        """Uloží nový záznam. Spracuje parameter 'date' z AI na Firestore timestamp."""
        if not self.is_connected():
            return False

        coll_name = self.COLLECTION_MAP.get(entry_type)
        if not coll_name:
            return False

        try:
            user_ref = self._db.collection('users').document(user_id)
            if not user_ref.get().exists:
                user_ref.set({'userId': user_id, 'createdAt': firestore.SERVER_TIMESTAMP})

            if data.get('date'):
                try:
                    data['timestamp'] = datetime.fromisoformat(data.pop('date').replace('Z', '+00:00'))
                except Exception:
                    data['timestamp'] = firestore.SERVER_TIMESTAMP
                    data.pop('date', None)

            if 'timestamp' not in data:
                data['timestamp'] = firestore.SERVER_TIMESTAMP

            _, doc_ref = user_ref.collection(coll_name).add(data)
            print(f"[Firebase] {entry_type} uložený: {doc_ref.id}")
            return True

        except Exception as e:
            print(f"[Firebase] save_entry({entry_type}) chyba: {e}")
            traceback.print_exc()
            return False

    def delete_entry(self, user_id: str, entry_type: str, entry_id: str) -> bool:
        if not self.is_connected():
            return False
        coll_name = self.COLLECTION_MAP.get(entry_type)
        if not coll_name:
            return False
        try:
            self._db.collection('users').document(user_id).collection(coll_name).document(entry_id).delete()
            return True
        except Exception as e:
            print(f"[Firebase] delete_entry chyba: {e}")
            return False

    # -------------------------------------------------------------------------
    # ADMIN
    # -------------------------------------------------------------------------

    def is_admin(self, user_id: str) -> bool:
        if not self.is_connected():
            return False
        try:
            doc = self._db.collection('admins').document(user_id).get()
            return doc.exists and bool(doc.to_dict().get('isAdmin', False))
        except Exception:
            return False

    def get_user_by_email(self, email: str) -> Optional[Dict]:
        if not self.is_connected():
            return None
        try:
            for u in self._db.collection('users').where('email', '==', email.lower()).limit(1).stream():
                data = u.to_dict()
                data['uid'] = u.id
                return data
            return None
        except Exception as e:
            print(f"[Firebase] get_user_by_email chyba: {e}")
            return None

    # -------------------------------------------------------------------------
    # RATE LIMITING
    # -------------------------------------------------------------------------

    def check_daily_message_limit(self, user_id: str, daily_limit: int = 10) -> Dict:
        """Skontroluje denný limit správ AI trénera. Reset každý deň o polnoci UTC."""
        if not self.is_connected():
            return {'allowed': False, 'remaining': 0, 'error': 'Firebase nie je pripojené'}
        try:
            today    = datetime.now().strftime('%Y-%m-%d')
            user_ref = self._db.collection('users').document(user_id)
            doc      = user_ref.get()

            if not doc.exists:
                user_ref.set({'userId': user_id, 'createdAt': firestore.SERVER_TIMESTAMP,
                              'ai_usage': {'date': today, 'message_count': 0}})
                return {'allowed': True, 'remaining': daily_limit, 'reset_at': 'midnight UTC'}

            data          = doc.to_dict()
            ai_usage      = data.get('ai_usage', {})
            usage_date    = ai_usage.get('date', '')
            message_count = ai_usage.get('message_count', 0)

            if usage_date != today:
                user_ref.update({'ai_usage': {'date': today, 'message_count': 0}})
                return {'allowed': True, 'remaining': daily_limit, 'reset_at': 'midnight UTC'}

            remaining = daily_limit - message_count
            return {'allowed': remaining > 0, 'remaining': max(0, remaining), 'reset_at': 'midnight UTC'}

        except Exception as e:
            print(f"[Firebase] check_daily_message_limit chyba: {e}")
            return {'allowed': False, 'remaining': 0, 'error': str(e)}

    def increment_message_count(self, user_id: str) -> bool:
        if not self.is_connected():
            return False
        try:
            today    = datetime.now().strftime('%Y-%m-%d')
            user_ref = self._db.collection('users').document(user_id)
            doc      = user_ref.get()

            if not doc.exists:
                user_ref.set({'userId': user_id, 'createdAt': firestore.SERVER_TIMESTAMP,
                              'ai_usage': {'date': today, 'message_count': 1}})
                return True

            usage_date = doc.to_dict().get('ai_usage', {}).get('date', '')
            if usage_date != today:
                user_ref.update({'ai_usage': {'date': today, 'message_count': 1}})
            else:
                user_ref.update({'ai_usage.message_count': firestore.Increment(1)})
            return True

        except Exception as e:
            print(f"[Firebase] increment_message_count chyba: {e}")
            return False

    # -------------------------------------------------------------------------
    # KONVERZÁCIE
    # -------------------------------------------------------------------------

    def create_conversation(self, user_id: str, title: str = "Nová konverzácia") -> Optional[str]:
        if not self.is_connected():
            return None
        try:
            _, doc = self._db.collection('users').document(user_id).collection('conversations').add({
                'title': title,
                'createdAt': firestore.SERVER_TIMESTAMP,
                'updatedAt': firestore.SERVER_TIMESTAMP,
                'lastMessage': ''
            })
            return doc.id
        except Exception as e:
            print(f"[Firebase] create_conversation chyba: {e}")
            return None

    def get_conversations(self, user_id: str, limit: int = 50) -> List[Dict]:
        if not self.is_connected():
            return []
        try:
            docs = (self._db.collection('users').document(user_id).collection('conversations')
                    .order_by('updatedAt', direction=firestore.Query.DESCENDING)
                    .limit(limit).stream())
            result = []
            for doc in docs:
                d = doc.to_dict()
                result.append({
                    'id':          doc.id,
                    'title':       d.get('title', 'Bez názvu'),
                    'createdAt':   self._ts_to_iso(d.get('createdAt')),
                    'updatedAt':   self._ts_to_iso(d.get('updatedAt')),
                    'lastMessage': d.get('lastMessage', '')
                })
            return result
        except Exception as e:
            print(f"[Firebase] get_conversations chyba: {e}")
            return []

    def delete_conversation(self, user_id: str, conversation_id: str) -> bool:
        if not self.is_connected():
            return False
        try:
            conv_ref = (self._db.collection('users').document(user_id)
                        .collection('conversations').document(conversation_id))
            for msg in conv_ref.collection('messages').stream():
                msg.reference.delete()
            conv_ref.delete()
            return True
        except Exception as e:
            print(f"[Firebase] delete_conversation chyba: {e}")
            return False

    def get_conversation_messages(self, user_id: str, conversation_id: str, limit: int = 50) -> List[Dict]:
        if not self.is_connected():
            return []
        try:
            ref  = (self._db.collection('users').document(user_id)
                    .collection('conversations').document(conversation_id)
                    .collection('messages'))
            docs = list(ref.order_by('timestamp', direction=firestore.Query.DESCENDING).limit(limit).stream())
            return [
                {
                    'role':      d.to_dict().get('role', 'user'),
                    'content':   d.to_dict().get('content', ''),
                    'timestamp': self._ts_to_iso(d.to_dict().get('timestamp'))
                }
                for d in reversed(docs)
            ]
        except Exception as e:
            print(f"[Firebase] get_conversation_messages chyba: {e}")
            return []

    def save_conversation_message(self, user_id: str, conversation_id: str, role: str, content: str) -> bool:
        if not self.is_connected():
            return False
        try:
            conv_ref = (self._db.collection('users').document(user_id)
                        .collection('conversations').document(conversation_id))
            conv_ref.collection('messages').add({
                'role': role, 'content': content,
                'timestamp': firestore.SERVER_TIMESTAMP
            })
            preview = content[:60] + ('...' if len(content) > 60 else '')
            conv_ref.update({'updatedAt': firestore.SERVER_TIMESTAMP, 'lastMessage': preview})
            return True
        except Exception as e:
            print(f"[Firebase] save_conversation_message chyba: {e}")
            return False

    def get_or_create_default_conversation(self, user_id: str) -> Optional[str]:
        """Vráti ID prvej konverzácie alebo vytvorí novú."""
        if not self.is_connected():
            return None
        try:
            conversations = self.get_conversations(user_id, limit=1)
            if conversations:
                return conversations[0]['id']
            return self.create_conversation(user_id, "Môj prvý chat")
        except Exception as e:
            print(f"[Firebase] get_or_create_default_conversation chyba: {e}")
            return None

    # -------------------------------------------------------------------------
    # PLATBY
    # -------------------------------------------------------------------------

    def save_payment_info(self, user_id: str, stripe_customer_id: Optional[str],
                          plan_type: str, status: str, subscription_id: Optional[str] = None) -> bool:
        if not self.is_connected():
            return False
        try:
            self._db.collection('users').document(user_id).update({
                'stripe_customer_id': stripe_customer_id,
                'subscription': {
                    'plan_type':       plan_type,
                    'status':          status,
                    'subscription_id': subscription_id,
                    'purchased_at':    firestore.SERVER_TIMESTAMP,
                    'updated_at':      firestore.SERVER_TIMESTAMP
                }
            })
            print(f"[Firebase] Subscription: user={user_id}, plan={plan_type}, status={status}")
            return True
        except Exception as e:
            print(f"[Firebase] save_payment_info chyba: {e}")
            return False

    def get_user_subscription(self, user_id: str) -> Optional[Dict]:
        if not self.is_connected():
            return None
        try:
            doc = self._db.collection('users').document(user_id).get()
            if not doc.exists:
                return None
            data = doc.to_dict()
            sub  = data.get('subscription', {})
            if data.get('stripe_customer_id'):
                sub['stripe_customer_id'] = data['stripe_customer_id']
            return sub if sub else None
        except Exception as e:
            print(f"[Firebase] get_user_subscription chyba: {e}")
            return None

    def get_user_by_stripe_customer(self, stripe_customer_id: str) -> Optional[str]:
        if not self.is_connected() or not stripe_customer_id:
            return None
        try:
            results = list(self._db.collection('users')
                           .where('stripe_customer_id', '==', stripe_customer_id)
                           .limit(1).stream())
            return results[0].id if results else None
        except Exception as e:
            print(f"[Firebase] get_user_by_stripe_customer chyba: {e}")
            return None

    def update_subscription_status(self, user_id: str, status: str,
                                   period_end: Optional[int] = None,
                                   subscription_id: Optional[str] = None,
                                   plan_type: Optional[str] = None) -> bool:
        if not self.is_connected():
            return False
        try:
            user_ref = self._db.collection('users').document(user_id)
            doc      = user_ref.get()
            if not doc.exists:
                return False

            if not plan_type:
                plan_type = doc.to_dict().get('subscription', {}).get('plan_type')
            if not plan_type:
                return False

            update_data = {
                'subscription.status':     status,
                'subscription.updated_at': firestore.SERVER_TIMESTAMP
            }
            if subscription_id:
                update_data['subscription.subscription_id'] = subscription_id
            if period_end:
                update_data['subscription.current_period_end'] = datetime.fromtimestamp(period_end)

            user_ref.update(update_data)
            print(f"[Firebase] Subscription update: {user_id}, {plan_type}, {status}")
            return True
        except Exception as e:
            print(f"[Firebase] update_subscription_status chyba: {e}")
            return False

    def delete_user_subscription(self, user_id: str) -> bool:
        if not self.is_connected():
            return False
        try:
            self._db.collection('users').document(user_id).update({
                'subscription': {'plan_type': 'free', 'status': 'canceled',
                                 'updated_at': firestore.SERVER_TIMESTAMP}
            })
            return True
        except Exception as e:
            print(f"[Firebase] delete_user_subscription chyba: {e}")
            return False
