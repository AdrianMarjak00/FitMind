# Firebase Service - Komunikácia s Firebase databázou
# Tento súbor obsahuje všetky funkcie na prácu s Firebase Firestore

from typing import Optional, Dict, List
from datetime import datetime, timedelta
import os
import firebase_admin
from firebase_admin import credentials, firestore

class FirebaseService:
    """
    Singleton trieda pre Firebase operácie
    Singleton znamená, že existuje len jedna inštancia tejto triedy
    """
    _instance = None
    _db = None
    
    def __new__(cls):
        """Vytvorí novú inštanciu len ak ešte neexistuje"""
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._init_firebase()
        return cls._instance
    
    @classmethod
    def _init_firebase(cls):
        """Inicializuje Firebase pripojenie"""
        try:
            # Skús nájsť Service Account Key v rôznych súboroch
            key_files = [
                "serviceAccountKey.json",
                "firebase-service-account.json",
                # Hľadaj aj súbory začínajúce na fitmind-
                *[f for f in os.listdir('.') if f.startswith('fitmind-') and f.endswith('.json')]
            ]
            
            cred = None
            used_file = None
            
            for key_file in key_files:
                if os.path.exists(key_file):
                    try:
                        cred = credentials.Certificate(key_file)
                        used_file = key_file
                        break
                    except:
                        continue
            
            if cred:
                firebase_admin.initialize_app(cred)
                cls._db = firestore.client()
                print(f"[OK] Firebase pripojene! (pouzity subor: {used_file})")
            else:
                print("[WARNING] Firebase credentials nenajdene! (skontrolovane: serviceAccountKey.json, firebase-service-account.json a fitmind-*.json)")
                cls._db = None

        except Exception as e:
            print(f"[WARNING] Firebase chyba: {e}")
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
            # Získaj dokument používateľa z kolekcie 'userFitnessProfiles'
            doc = self._db.collection('userFitnessProfiles').document(user_id).get()
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
        
        # Mapovanie typov záznamov na názvy kolekcií v databáze
        collection_map = {
            'food': 'foodEntries',
            'exercise': 'exerciseEntries',
            'stress': 'stressEntries',
            'mood': 'moodEntries',
            'sleep': 'sleepEntries',
            'weight': 'weightEntries'
        }
        
        coll_name = collection_map.get(entry_type)
        if not coll_name:
            return []
        
        try:
            # Získaj kolekciu záznamov pre používateľa
            coll_ref = self._db.collection('userFitnessProfiles').document(user_id).collection(coll_name)
            # Zoraď podľa timestampu zostupne a obmedz počet
            query = coll_ref.order_by('timestamp', direction=firestore.Query.DESCENDING).limit(limit)
            docs = list(query.stream())
            
            # Filtruj záznamy podľa počtu dní
            cutoff_date = datetime.now() - timedelta(days=days)
            results = []
            for doc in docs:
                data = doc.to_dict()
                if 'timestamp' in data:
                    ts = data['timestamp']
                    # Konvertuj timestamp na datetime
                    if hasattr(ts, 'timestamp'):
                        doc_date = datetime.fromtimestamp(ts.timestamp())
                    elif isinstance(ts, datetime):
                        doc_date = ts
                    else:
                        continue
                    # Pridaj len záznamy z posledných 'days' dní
                    if doc_date >= cutoff_date:
                        results.append(data)
                else:
                    results.append(data)
            return results[:limit]
        except Exception as e:
            print(f"[WARNING] Chyba pri nacitani {entry_type}: {e}")
            return []
    
    def save_entry(self, user_id: str, entry_type: str, data: Dict) -> bool:
        """
        Uloží záznam do databázy
        
        Args:
            user_id: ID používateľa
            entry_type: Typ záznamu ('food', 'exercise', atď.)
            data: Dáta záznamu (slovník)
        """
        if not self.is_connected():
            return False
        
        # Mapovanie typov záznamov na názvy kolekcií
        collection_map = {
            'food': 'foodEntries',
            'exercise': 'exerciseEntries',
            'stress': 'stressEntries',
            'mood': 'moodEntries',
            'sleep': 'sleepEntries',
            'weight': 'weightEntries'
        }
        
        coll_name = collection_map.get(entry_type)
        if not coll_name:
            return False
        
        try:
            # Zabezpeč, že profil používateľa existuje
            user_ref = self._db.collection('userFitnessProfiles').document(user_id)
            if not user_ref.get().exists:
                # Ak profil neexistuje, vytvor ho
                user_ref.set({
                    'userId': user_id,
                    'createdAt': firestore.SERVER_TIMESTAMP,
                    'updatedAt': firestore.SERVER_TIMESTAMP
                })
            
            # Pridaj timestamp ak chýba
            if 'timestamp' not in data:
                data['timestamp'] = firestore.SERVER_TIMESTAMP
            
            # Pridaj záznam do kolekcie
            user_ref.collection(coll_name).add(data)
            return True
        except Exception as e:
            print(f"[ERROR] Chyba pri ukladani {entry_type}: {e}")
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
            self._db.collection('userFitnessProfiles').document(user_id).update(updates)
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
            self._db.collection('userFitnessProfiles').document(user_id).collection('chatHistory').add(message_data)
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
            chat_ref = self._db.collection('userFitnessProfiles').document(user_id).collection('chatHistory')
            # Zoraď podľa timestampu zostupne a obmedz počet
            query = chat_ref.order_by('timestamp', direction=firestore.Query.DESCENDING).limit(limit)
            docs = list(query.stream())
            
            # Reverzuj poradie (chceme chronologické poradie)
            messages = []
            for doc in reversed(docs):
                data = doc.to_dict()
                # Vráť len role a content pre API
                messages.append({
                    'role': data.get('role', 'user'),
                    'content': data.get('content', '')
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
            chat_ref = self._db.collection('userFitnessProfiles').document(user_id).collection('chatHistory')
            docs = chat_ref.stream()
            
            for doc in docs:
                doc.reference.delete()
            
            return True
        except Exception as e:
            print(f"[ERROR] Chyba pri mazani chat historie: {e}")
            return False