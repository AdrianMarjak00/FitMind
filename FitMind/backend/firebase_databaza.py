# Firebase Service - Komunikácia s Firebase databázou
# Tento súbor obsahuje všetky funkcie na prácu s Firebase Firestore

from typing import Optional, Dict, List
from datetime import datetime, timedelta
import os
import firebase_admin
from firebase_admin import credentials, firestore
import json
import traceback

class FirebaseService:
    """
    Singleton trieda pre Firebase operácie
    Singleton znamená, že existuje len jedna inštancia tejto triedy
    """
    _instance = None
    _db = None
    
    COLLECTION_MAP = {
        'food': 'foodEntries',
        'exercise': 'workoutEntries',
        'stress': 'stressEntries',
        'mood': 'moodEntries',
        'sleep': 'sleepEntries',
        'weight': 'weightEntries'
    }
    
    def __new__(cls):
        """Vytvorí novú inštanciu len ak ešte neexistuje"""
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._init_firebase()
        return cls._instance
    
    @classmethod
    def _init_firebase(cls):
        """Inicializuje Firebase pripojenie cez premenné prostredia alebo lokálny súbor"""
        try:
            # 1. Skús načítať z environment premenných (pre cloud hosting)
            # Skús obidva možné názvy premenných
            env_creds = os.getenv("FIREBASE_CREDENTIALS") or os.getenv("FIREBASE_SERVICE_ACCOUNT")
            cred = None
            
            if env_creds:
                print(f"[INFO] Firebase: Found env credentials (length: {len(env_creds)})")
                try:
                    # Skús či je to JSON reťazec
                    cred_dict = json.loads(env_creds)
                    cred = credentials.Certificate(cred_dict)
                    print(f"[INFO] Firebase: Parsed JSON from env for project: {cred_dict.get('project_id')}")
                except Exception as e:
                    print(f"[ERROR] Failed to parse FIREBASE_CREDENTIALS as JSON: {e}")
                    # Ak to nie je JSON, skús či je to cesta k súboru
                    if os.path.exists(env_creds):
                        cred = credentials.Certificate(env_creds)
                        print(f"[INFO] Firebase: Using credentials file from path in env: {env_creds}")
                    else:
                        print(f"[ERROR] FIREBASE_CREDENTIALS in env is NOT a valid JSON nor a valid file path!")
            
            # 2. Ak stále nič, skús lokálny súbor (pre vývoj)
            if not cred:
                # Cesty ktoré skúsime
                possible_paths = [
                    "serviceAccountKey.json",
                    "backend/serviceAccountKey.json",
                    os.path.join(os.path.dirname(__file__), "serviceAccountKey.json"),
                    "SecurityAngular.json",
                    "backend/SecurityAngular.json",
                    os.path.join(os.path.dirname(__file__), "SecurityAngular.json"),
                    "local/serviceAccountKey.json",
                    os.path.join(os.path.dirname(__file__), "local", "serviceAccountKey.json")
                ]
                
                # Kľúčová cesta k lokálnemu certifikátu
                local_key = os.path.join(os.path.dirname(os.path.abspath(__file__)), "SecurityAngular.json")
                if os.path.exists(local_key):
                    try:
                        cred = credentials.Certificate(local_key)
                    except Exception as e:
                        print(f"[ERROR] Firebase: Failed to load SecurityAngular.json: {e}")

                if not cred:
                    for path in possible_paths:
                        abs_path = os.path.abspath(path) if not os.path.isabs(path) else path
                        if os.path.exists(abs_path):
                            try:
                                cred = credentials.Certificate(abs_path)
                                break
                            except Exception:
                                continue

            # 3. Inicializácia (na rovnakej úrovni ako hľadanie kľúčov)
            if cred:
                try:
                    # Skús či už nie je inicializovaný
                    app = firebase_admin.get_app()
                except ValueError:
                    # Ak nie, inicializuj
                    app = firebase_admin.initialize_app(cred)
                
                cls._db = firestore.client()
                print(f"[OK] Firebase úspešne pripojené! Project ID: {app.project_id}")
            else:
                print("[CRITICAL] Firebase credentials nenájdené!")
                cls._db = None

        except Exception as e:
            print(f"[CRITICAL] Firebase initialization failed: {str(e)}")
            import traceback
            print(traceback.format_exc())
            cls._db = None
    
    @property
    def db(self):
        """Vráti Firestore databázový klient"""
        return self._db
    
    def is_connected(self) -> bool:
        """Kontroluje, či je Firebase pripojený"""
        return self._db is not None
    
    def get_user_profile(self, user_id: str) -> Optional[Dict]:
        """Získa profil používateľa z databázy"""
        if not self.is_connected():
            return None
        try:
            # Získaj dokument používateľa z kolekcie 'users'
            doc = self._db.collection('users').document(user_id).get()
            # Ak dokument existuje, vráť jeho dáta, inak None
            return doc.to_dict() if doc.exists else None
        except Exception as e:
            print(f"[ERROR] Chyba pri nacitani profilu: {e}")
            return None
    
    def get_entries(self, user_id: str, entry_type: str, days: int = 30, limit: int = 100) -> List[Dict]:
        """
        Získa záznamy pre používateľa (jedlo, cvičenie, nálada, atď.)
        
        Args:
            user_id: ID používateľa
            entry_type: Typ záznamu ('food', 'exercise', 'mood', 'stress', 'sleep', 'weight')
            days: Počet dní späť (default 30)
            limit: Maximálny počet záznamov (default 100)
        """
        if not self.is_connected():
            return []
        
        coll_name = self.COLLECTION_MAP.get(entry_type)
        if not coll_name:
            return []
        
        try:
            # Získaj kolekciu záznamov pre používateľa
            coll_ref = self._db.collection('users').document(user_id).collection(coll_name)
            # Zoraď podľa timestampu zostupne a obmedz počet (berieme viac aby sme mohli filtrovať)
            query = coll_ref.order_by('timestamp', direction=firestore.Query.DESCENDING).limit(limit * 2)
            docs = list(query.stream())
            print(f"[FIREBASE] {entry_type}: Found {len(docs)} raw docs in {coll_name}")
            
            # Použijeme offset-aware UTC čas pre porovnanie s Firestore
            from datetime import timezone
            now = datetime.now(timezone.utc)
            
            # Ak je days=1, chceme aspoň od začiatku dneška.
            # Ak je days=2, chceme od začiatku včerajška atď.
            cutoff_date = (now - timedelta(days=days)).replace(hour=0, minute=0, second=0, microsecond=0)
            
            print(f"[FIREBASE] Filter {entry_type}: days={days}, cutoff={cutoff_date} (now: {now})")
            
            results = []
            for i, doc in enumerate(docs):
                data = doc.to_dict()
                data['id'] = doc.id
                
                if 'timestamp' in data:
                    ts = data['timestamp']
                    try:
                        if hasattr(ts, 'to_datetime'):
                            doc_date = ts.to_datetime()
                        elif hasattr(ts, 'timestamp'):
                            doc_date = datetime.fromtimestamp(ts.timestamp(), tz=timezone.utc)
                        elif isinstance(ts, datetime):
                            doc_date = ts if ts.tzinfo else ts.replace(tzinfo=timezone.utc)
                        else:
                            results.append(data)
                            continue

                        if doc_date >= cutoff_date:
                            results.append(data)
                    except Exception as e:
                        print(f"[DEBUG] Timestamp parse error for {entry_type} {doc.id}: {e}")
                        results.append(data) # Lepšie vrátiť niečo ako nič
                else:
                    results.append(data)
            
            print(f"[FIREBASE] Returning {len(results)} filtered results out of {len(docs)}")
            return results[:limit]
        except Exception as e:
            print(f"[WARNING] Chyba pri nacitani {entry_type}: {e}")
            import traceback
            print(traceback.format_exc())
            return []
    
    def save_entry(self, user_id: str, entry_type: str, data: Dict) -> bool:
        print(f"[FIREBASE] Saving {entry_type} for user {user_id}")
        if not self.is_connected():
            print("[FIREBASE] NOT CONNECTED!")
            return False
        
        coll_name = self.COLLECTION_MAP.get(entry_type)
        if not coll_name:
            return False
        
        try:
            # Zabezpeč, že profil používateľa existuje
            user_ref = self._db.collection('users').document(user_id)
            if not user_ref.get().exists:
                # Ak profil neexistuje, vytvor ho
                user_ref.set({
                    'userId': user_id,
                    'createdAt': firestore.SERVER_TIMESTAMP,
                    'updatedAt': firestore.SERVER_TIMESTAMP
                })
            
            # Spracovanie dátumu (ak AI poslalo 'date')
            if 'date' in data and data['date']:
                try:
                    # Skús parsovať ISO formát
                    dt = datetime.fromisoformat(data['date'].replace('Z', '+00:00'))
                    # Skonvertuj na Firestore Timestamp alebo nechaj datetime (Firestore klient to zväčša zvládne)
                    data['timestamp'] = dt
                except Exception as e:
                    print(f"[WARNING] Invalid date format: {data['date']}, using NOW. Error: {e}")
                    data['timestamp'] = firestore.SERVER_TIMESTAMP
            
            # Pridaj timestamp ak chýba
            if 'timestamp' not in data:
                data['timestamp'] = firestore.SERVER_TIMESTAMP
            
            # Pridaj záznam do kolekcie
            _, doc_ref = user_ref.collection(coll_name).add(data)
            print(f"[FIREBASE SUCCESS] {entry_type} saved as {doc_ref.id} with timestamp {data.get('timestamp')}")
            return True
        except Exception as e:
            print(f"[FIREBASE ERROR] Chyba pri ukladani {entry_type}: {e}")
            import traceback
            traceback.print_exc()
            return False
    
    def delete_entry(self, user_id: str, entry_type: str, entry_id: str) -> bool:
        """Vymaže záznam podľa ID."""
        if not self.is_connected():
            return False
        
        coll_name = self.COLLECTION_MAP.get(entry_type)
        if not coll_name:
            print(f"[FIREBASE] Unknown entry type for delete: {entry_type}")
            return False
        
        try:
            doc_ref = self._db.collection('users').document(user_id).collection(coll_name).document(entry_id)
            doc_ref.delete()
            print(f"[FIREBASE SUCCESS] Deleted {entry_type} {entry_id}")
            return True
        except Exception as e:
            print(f"[FIREBASE ERROR] Chyba pri mazani {entry_type} {entry_id}: {e}")
            import traceback
            traceback.print_exc()
            return False
    
    def update_profile(self, user_id: str, updates: Dict) -> bool:
        """
        Aktualizuje profil používateľa
        
        Args:
            user_id: ID používateľa
            updates: Slovník s dátami na aktualizáciu
        """
        if not self.is_connected():
            return False
        try:
            # Pridaj timestamp aktualizácie
            updates['updatedAt'] = firestore.SERVER_TIMESTAMP
            # Aktualizuj dokument v databáze
            self._db.collection('users').document(user_id).update(updates)
            return True
        except Exception as e:
            print(f"[ERROR] Chyba pri aktualizacii profilu: {e}")
            return False
    
    def is_admin(self, user_id: str) -> bool:
        """Kontroluje, či je používateľ admin"""
        if not self.is_connected():
            return False
        try:
            # Získaj admin dokument
            admin_doc = self._db.collection('admins').document(user_id).get()
            if admin_doc.exists:
                admin_data = admin_doc.to_dict()
                # Vráť True ak je isAdmin == True
                return admin_data.get('isAdmin', False) if admin_data else False
            return False
        except Exception as e:
            print(f"[ERROR] Chyba pri kontrole admin statusu: {e}")
            return False
    
    def is_admin_by_email(self, email: str) -> bool:
        """Kontroluje, či je email admin (pomocná metóda pre frontend)"""
        if not self.is_connected():
            return False
        try:
            # Hľadaj admina podľa emailu
            admins_ref = self._db.collection('admins')
            query = admins_ref.where('email', '==', email).where('isAdmin', '==', True).limit(1)
            results = list(query.stream())
            return len(results) > 0
        except Exception as e:
            print(f"[ERROR] Chyba pri kontrole admin statusu podla emailu: {e}")
            return False
    
    def add_admin(self, user_id: str, email: str) -> bool:
        """Pridá admina do databázy"""
        if not self.is_connected():
            return False
        try:
            admin_ref = self._db.collection('admins').document(user_id)
            admin_ref.set({
                'userId': user_id,
                'email': email,
                'isAdmin': True,
                'createdAt': firestore.SERVER_TIMESTAMP,
                'updatedAt': firestore.SERVER_TIMESTAMP
            })
            return True
        except Exception as e:
            print(f"[ERROR] Chyba pri pridavani admina: {e}")
            return False
    
    def remove_admin(self, user_id: str) -> bool:
        """Odstráni admina z databázy"""
        if not self.is_connected():
            return False
        try:
            self._db.collection('admins').document(user_id).delete()
            return True
        except Exception as e:
            print(f"[ERROR] Chyba pri odstraňovaní admina: {e}")
            return False
    
    def get_all_admins(self) -> List[Dict]:
        """Získa zoznam všetkých adminov"""
        if not self.is_connected():
            return []
        try:
            admins_ref = self._db.collection('admins')
            query = admins_ref.where('isAdmin', '==', True)
            # Vráť zoznam všetkých admin dokumentov ako slovníky
            return [doc.to_dict() for doc in query.stream()]
        except Exception as e:
            print(f"[ERROR] Chyba pri nacitani adminov: {e}")
            return []
    
    # === CHAT HISTÓRIA ===
    
    def save_chat_message(self, user_id: str, role: str, content: str, metadata: Optional[Dict] = None) -> bool:
        """
        Uloží správu do konverzačnej histórie
        
        Args:
            user_id: ID používateľa
            role: Rola ('user' alebo 'assistant')
            content: Obsah správy
            metadata: Dodatočné metadáta (napr. function_call, saved_entries)
            
        Returns:
            True ak sa podarilo uložiť
        """
        if not self.is_connected():
            return False
        try:
            message_data = {
                'role': role,
                'content': content,
                'timestamp': firestore.SERVER_TIMESTAMP
            }
            
            if metadata:
                message_data['metadata'] = metadata
            
            # Ulož do subkolekcie chatHistory
            self._db.collection('users').document(user_id).collection('chatHistory').add(message_data)
            return True
        except Exception as e:
            print(f"[ERROR] Chyba pri ukladani chat spravy: {e}")
            return False
    
    def get_chat_history(self, user_id: str, limit: int = 20) -> List[Dict]:
        """
        Získa konverzačnú históriu používateľa
        
        Args:
            user_id: ID používateľa
            limit: Maximálny počet správ (default: 20)
            
        Returns:
            Zoznam správ
        """
        if not self.is_connected():
            return []
        try:
            chat_ref = self._db.collection('users').document(user_id).collection('chatHistory')
            # Zoraď podľa timestampu zostupne a obmedz počet
            query = chat_ref.order_by('timestamp', direction=firestore.Query.DESCENDING).limit(limit)
            docs = list(query.stream())
            
            # Reverzuj poradie (chceme chronologické poradie)
            messages = []
            for doc in reversed(docs):
                data = doc.to_dict()
                # Konvertuj Firestore timestamp na ISO string
                timestamp = None
                if 'timestamp' in data and data['timestamp']:
                    ts = data['timestamp']
                    try:
                        if hasattr(ts, 'isoformat'):
                            timestamp = ts.isoformat()
                        elif hasattr(ts, 'timestamp'):
                            from datetime import datetime, timezone
                            timestamp = datetime.fromtimestamp(ts.timestamp(), tz=timezone.utc).isoformat()
                    except Exception:
                        timestamp = None

                messages.append({
                    'role': data.get('role', 'user'),
                    'content': data.get('content', ''),
                    'timestamp': timestamp
                })

            return messages
        except Exception as e:
            print(f"[ERROR] Chyba pri nacitani chat historie: {e}")
            return []
    
    def clear_chat_history(self, user_id: str) -> bool:
        """
        Vymaže konverzačnú históriu používateľa

        Args:
            user_id: ID používateľa

        Returns:
            True ak sa podarilo vymazať
        """
        if not self.is_connected():
            return False
        try:
            chat_ref = self._db.collection('users').document(user_id).collection('chatHistory')
            docs = chat_ref.stream()

            for doc in docs:
                doc.reference.delete()

            return True
        except Exception as e:
            print(f"[ERROR] Chyba pri mazani chat historie: {e}")
            return False

    # === RATE LIMITING ===

    def check_daily_message_limit(self, user_id: str, daily_limit: int = 20) -> Dict[str, any]:
        """
        Kontroluje denný limit správ pre používateľa

        Args:
            user_id: ID používateľa
            daily_limit: Maximálny počet správ za deň (default: 20)

        Returns:
            Dict s 'allowed' (bool), 'remaining' (int), 'reset_at' (str)
        """
        if not self.is_connected():
            return {'allowed': False, 'remaining': 0, 'error': 'Firebase not connected'}

        try:
            today = datetime.now().strftime('%Y-%m-%d')
            user_ref = self._db.collection('users').document(user_id)
            doc = user_ref.get()

            if not doc.exists:
                # Nový používateľ - vytvor profil
                user_ref.set({
                    'userId': user_id,
                    'createdAt': firestore.SERVER_TIMESTAMP,
                    'ai_usage': {
                        'date': today,
                        'message_count': 0
                    }
                })
                return {'allowed': True, 'remaining': daily_limit, 'reset_at': 'midnight UTC'}

            data = doc.to_dict()
            ai_usage = data.get('ai_usage', {})
            usage_date = ai_usage.get('date', '')
            message_count = ai_usage.get('message_count', 0)
 
            # Reset ak je nový deň
            if usage_date != today:
                user_ref.update({
                    'ai_usage': {
                        'date': today,
                        'message_count': 0
                    }
                })
                return {'allowed': True, 'remaining': daily_limit, 'reset_at': 'midnight UTC'}

            # Kontrola limitu
            remaining = daily_limit - message_count
            allowed = remaining > 0

            return {
                'allowed': allowed,
                'remaining': max(0, remaining),
                'reset_at': 'midnight UTC'
            }

        except Exception as e:
            print(f"[ERROR] Chyba pri kontrole rate limitu: {e}")
            return {'allowed': False, 'remaining': 0, 'error': str(e)}

    def increment_message_count(self, user_id: str) -> bool:
        """
        Zvýši počítadlo správ pre dnešný deň

        Args:
            user_id: ID používateľa

        Returns:
            True ak sa podarilo inkrementovať
        """
        if not self.is_connected():
            return False

        try:
            today = datetime.now().strftime('%Y-%m-%d')
            user_ref = self._db.collection('users').document(user_id)
            doc = user_ref.get()

            if not doc.exists:
                user_ref.set({
                    'userId': user_id,
                    'createdAt': firestore.SERVER_TIMESTAMP,
                    'ai_usage': {
                        'date': today,
                        'message_count': 1
                    }
                })
                return True

            data = doc.to_dict()
            ai_usage = data.get('ai_usage', {})
            usage_date = ai_usage.get('date', '')

            # Reset ak je nový deň
            if usage_date != today:
                user_ref.update({
                    'ai_usage': {
                        'date': today,
                        'message_count': 1
                    }
                })
            else:
                # Atomický inkrement - bezpečné aj pri súbežných requestoch
                user_ref.update({
                    'ai_usage.message_count': firestore.Increment(1)
                })

            return True

        except Exception as e:
            print(f"[ERROR] Chyba pri inkrementovani message count: {e}")
            return False

    # === KONVERZÁCIE ===

    def create_conversation(self, user_id: str, title: str = "Nová konverzácia") -> Optional[str]:
        """
        Vytvorí novú konverzáciu pre používateľa

        Returns:
            ID novej konverzácie alebo None pri chybe
        """
        if not self.is_connected():
            return None
        try:
            conv_ref = self._db.collection('users').document(user_id).collection('conversations')
            doc_ref = conv_ref.add({
                'title': title,
                'createdAt': firestore.SERVER_TIMESTAMP,
                'updatedAt': firestore.SERVER_TIMESTAMP,
                'lastMessage': ''
            })
            return doc_ref[1].id
        except Exception as e:
            print(f"[ERROR] Chyba pri vytváraní konverzácie: {e}")
            return None

    def get_conversations(self, user_id: str, limit: int = 50) -> List[Dict]:
        """
        Získa zoznam konverzácií používateľa
        """
        if not self.is_connected():
            return []
        try:
            conv_ref = self._db.collection('users').document(user_id).collection('conversations')
            query = conv_ref.order_by('updatedAt', direction=firestore.Query.DESCENDING).limit(limit)
            docs = list(query.stream())

            conversations = []
            for doc in docs:
                data = doc.to_dict()
                # Konvertuj timestamps na ISO stringy
                created_at = None
                updated_at = None
                if data.get('createdAt'):
                    ts = data['createdAt']
                    try:
                        if hasattr(ts, 'isoformat'):
                            created_at = ts.isoformat()
                        elif hasattr(ts, 'timestamp'):
                            from datetime import timezone
                            created_at = datetime.fromtimestamp(ts.timestamp(), tz=timezone.utc).isoformat()
                    except Exception:
                        pass
                if data.get('updatedAt'):
                    ts = data['updatedAt']
                    try:
                        if hasattr(ts, 'isoformat'):
                            updated_at = ts.isoformat()
                        elif hasattr(ts, 'timestamp'):
                            from datetime import timezone
                            updated_at = datetime.fromtimestamp(ts.timestamp(), tz=timezone.utc).isoformat()
                    except Exception:
                        pass

                conversations.append({
                    'id': doc.id,
                    'title': data.get('title', 'Bez názvu'),
                    'createdAt': created_at,
                    'updatedAt': updated_at,
                    'lastMessage': data.get('lastMessage', '')
                })

            return conversations
        except Exception as e:
            print(f"[ERROR] Chyba pri načítaní konverzácií: {e}")
            return []

    def delete_conversation(self, user_id: str, conversation_id: str) -> bool:
        """
        Vymaže konverzáciu aj s jej správami
        """
        if not self.is_connected():
            return False
        try:
            conv_ref = self._db.collection('users').document(user_id).collection('conversations').document(conversation_id)

            # Najprv vymaž všetky správy v konverzácii
            messages_ref = conv_ref.collection('messages')
            for msg_doc in messages_ref.stream():
                msg_doc.reference.delete()

            # Potom vymaž konverzáciu
            conv_ref.delete()
            return True
        except Exception as e:
            print(f"[ERROR] Chyba pri mazaní konverzácie: {e}")
            return False

    def get_conversation_messages(self, user_id: str, conversation_id: str, limit: int = 50) -> List[Dict]:
        """
        Získa správy pre konkrétnu konverzáciu
        """
        if not self.is_connected():
            return []
        try:
            messages_ref = self._db.collection('users').document(user_id).collection('conversations').document(conversation_id).collection('messages')
            query = messages_ref.order_by('timestamp', direction=firestore.Query.DESCENDING).limit(limit)
            docs = list(query.stream())

            messages = []
            for doc in reversed(docs):
                data = doc.to_dict()
                timestamp = None
                if 'timestamp' in data and data['timestamp']:
                    ts = data['timestamp']
                    try:
                        if hasattr(ts, 'isoformat'):
                            timestamp = ts.isoformat()
                        elif hasattr(ts, 'timestamp'):
                            from datetime import timezone
                            timestamp = datetime.fromtimestamp(ts.timestamp(), tz=timezone.utc).isoformat()
                    except Exception:
                        pass

                messages.append({
                    'role': data.get('role', 'user'),
                    'content': data.get('content', ''),
                    'timestamp': timestamp
                })

            return messages
        except Exception as e:
            print(f"[ERROR] Chyba pri načítaní správ konverzácie: {e}")
            return []

    def save_conversation_message(self, user_id: str, conversation_id: str, role: str, content: str) -> bool:
        """
        Uloží správu do konverzácie a aktualizuje lastMessage
        """
        if not self.is_connected():
            return False
        try:
            conv_ref = self._db.collection('users').document(user_id).collection('conversations').document(conversation_id)

            # Ulož správu
            conv_ref.collection('messages').add({
                'role': role,
                'content': content,
                'timestamp': firestore.SERVER_TIMESTAMP
            })

            # Aktualizuj konverzáciu
            preview = content[:50] + '...' if len(content) > 50 else content
            conv_ref.update({
                'updatedAt': firestore.SERVER_TIMESTAMP,
                'lastMessage': preview
            })

            return True
        except Exception as e:
            print(f"[ERROR] Chyba pri ukladaní správy do konverzácie: {e}")
            return False

    def get_or_create_default_conversation(self, user_id: str) -> Optional[str]:
        """
        Získa alebo vytvorí predvolenú konverzáciu pre používateľa.
        Migruje existujúcu chatHistory ak existuje.
        """
        if not self.is_connected():
            return None
        try:
            # Skontroluj či existujú konverzácie
            conversations = self.get_conversations(user_id, limit=1)
            if conversations:
                return conversations[0]['id']

            # Vytvor novú konverzáciu
            conv_id = self.create_conversation(user_id, "Môj prvý chat")
            if not conv_id:
                return None

            # Migruj existujúcu chatHistory ak existuje
            old_history = self._db.collection('users').document(user_id).collection('chatHistory')
            old_docs = list(old_history.order_by('timestamp', direction=firestore.Query.ASCENDING).stream())

            if old_docs:
                conv_ref = self._db.collection('users').document(user_id).collection('conversations').document(conv_id)
                for doc in old_docs:
                    data = doc.to_dict()
                    conv_ref.collection('messages').add({
                        'role': data.get('role', 'user'),
                        'content': data.get('content', ''),
                        'timestamp': data.get('timestamp', firestore.SERVER_TIMESTAMP)
                    })

                # Aktualizuj lastMessage
                if old_docs:
                    last_data = old_docs[-1].to_dict()
                    last_content = last_data.get('content', '')
                    preview = last_content[:50] + '...' if len(last_content) > 50 else last_content
                    conv_ref.update({
                        'lastMessage': preview,
                        'title': 'Predošlá konverzácia'
                    })

            return conv_id
        except Exception as e:
            print(f"[ERROR] Chyba pri get_or_create_default_conversation: {e}")
            return None

    # === PLATBY ===

    def save_payment_info(
        self,
        user_id: str,
        stripe_customer_id: Optional[str],
        plan_type: str,
        status: str,
        subscription_id: Optional[str] = None
    ) -> bool:
        """
        Uloží informácie o platbe/subscription do profilu používateľa.

        Args:
            user_id: Firebase UID
            stripe_customer_id: Stripe customer ID
            plan_type: Typ plánu (basic, pro, premium)
            status: Status (active, canceled, past_due)
            subscription_id: Stripe subscription ID (pre premium)

        Returns:
            True ak sa podarilo uložiť
        """
        if not self.is_connected():
            return False

        try:
            user_ref = self._db.collection('users').document(user_id)

            update_data = {
                'stripe_customer_id': stripe_customer_id,
                f'active_plans.{plan_type}': {
                    'status': status,
                    'purchased_at': firestore.SERVER_TIMESTAMP,
                    'updated_at': firestore.SERVER_TIMESTAMP,
                    'subscription_id': subscription_id
                }
            }

            # Pre spätnú kompatibilitu/jednoduchosť stále ukladáme aj do hlavného poľa
            update_data['subscription'] = {
                'plan_type': plan_type,
                'status': status,
                'purchased_at': firestore.SERVER_TIMESTAMP,
                'updated_at': firestore.SERVER_TIMESTAMP,
                'subscription_id': subscription_id
            }

            user_ref.update(update_data)
            print(f"[FIREBASE] Payment info saved for user {user_id}, plan: {plan_type}")
            return True

        except Exception as e:
            print(f"[ERROR] Chyba pri ukladaní payment info: {e}")
            return False

    def get_user_subscription(self, user_id: str) -> Optional[Dict]:
        """
        Získa informácie o subscription používateľa.

        Returns:
            Dict s plan_type, status, stripe_customer_id, atď. alebo None
        """
        if not self.is_connected():
            return None

        try:
            user_ref = self._db.collection('users').document(user_id)
            doc = user_ref.get()

            if not doc.exists:
                return None

            data = doc.to_dict()
            subscription = data.get('subscription', {})
            active_plans = data.get('active_plans', {})

            # Pridaj stripe_customer_id ak existuje
            if data.get('stripe_customer_id'):
                subscription['stripe_customer_id'] = data['stripe_customer_id']
            
            # Pridaj všetky aktívne plány
            subscription['active_plans'] = active_plans

            return subscription if subscription else None

        except Exception as e:
            print(f"[ERROR] Chyba pri načítaní subscription: {e}")
            return None

    def get_user_by_stripe_customer(self, stripe_customer_id: str) -> Optional[str]:
        """
        Nájde používateľa podľa Stripe customer ID.

        Args:
            stripe_customer_id: Stripe customer ID

        Returns:
            User ID alebo None ak sa nenašiel
        """
        if not self.is_connected() or not stripe_customer_id:
            return None

        try:
            users_ref = self._db.collection('users')
            query = users_ref.where('stripe_customer_id', '==', stripe_customer_id).limit(1)
            results = list(query.stream())

            if results:
                return results[0].id

            return None
        except Exception as e:
            print(f"[ERROR] Chyba pri hľadaní používateľa podľa Stripe ID: {e}")
            return None

    def update_subscription_status(
        self,
        user_id: str,
        status: str,
        period_end: Optional[int] = None,
        subscription_id: Optional[str] = None,
        plan_type: Optional[str] = None
    ) -> bool:
        """
        Aktualizuje status subscription pre konkrétny plan.
        """
        if not self.is_connected():
            return False

        try:
            user_ref = self._db.collection('users').document(user_id)
            doc = user_ref.get()
            
            if not doc.exists:
                return False
                
            data = doc.to_dict()
            active_plans = data.get('active_plans', {})
            
            # Ak nemáme plan_type, skúsime ho nájsť podľa subscription_id
            if not plan_type and subscription_id:
                for p_type, p_data in active_plans.items():
                    if p_data.get('subscription_id') == subscription_id:
                        plan_type = p_type
                        break
            
            # Ak stále nevieme plan_type, použijeme ten z hlavného subscription (pre istotu)
            if not plan_type:
                plan_type = data.get('subscription', {}).get('plan_type')

            if not plan_type:
                return False

            update_data = {
                f'active_plans.{plan_type}.status': status,
                f'active_plans.{plan_type}.updated_at': firestore.SERVER_TIMESTAMP
            }

            # Tiež aktualizuj hlavné pole ak je to ten istý plán
            if data.get('subscription', {}).get('plan_type') == plan_type:
                update_data['subscription.status'] = status
                update_data['subscription.updated_at'] = firestore.SERVER_TIMESTAMP

            if period_end:
                update_data[f'active_plans.{plan_type}.current_period_end'] = datetime.fromtimestamp(period_end)
                if data.get('subscription', {}).get('plan_type') == plan_type:
                    update_data['subscription.current_period_end'] = datetime.fromtimestamp(period_end)

            user_ref.update(update_data)
            print(f"[FIREBASE] Subscription status updated for user {user_id}, plan {plan_type}: {status}")
            return True

        except Exception as e:
            print(f"[ERROR] Chyba pri aktualizácii subscription status: {e}")
            return False

    def get_user_by_email(self, email: str) -> Optional[Dict]:
        """Získa ID a dáta používateľa podľa emailu (admin funkcia)."""
        if not self.is_connected():
            return None
        try:
            users = self._db.collection('users').where('email', '==', email.lower()).limit(1).stream()
            for u in users:
                data = u.to_dict()
                data['uid'] = u.id
                return data
            return None
        except Exception as e:
            print(f"[FIREBASE] Search failed: {e}")
            return None

    def delete_user_subscription(self, user_id: str) -> bool:
        """Natvrdo nastaví subscription na 'free' a zruší status v databáze."""
        if not self.is_connected():
            return False
        try:
            user_ref = self._db.collection('users').document(user_id)
            user_ref.update({
                'subscription': {
                    'plan_type': 'free',
                    'status': 'canceled',
                    'updated_at': firestore.SERVER_TIMESTAMP
                },
                'active_plans': {} # Vymaže zoznam aktívnych plánov
            })
            return True
        except Exception as e:
            print(f"[FIREBASE] Cleanup failed: {e}")
            return False
