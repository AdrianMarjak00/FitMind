# Firebase Service - Komunikácia s Firebase databázou
# Tento súbor obsahuje všetky funkcie na prácu s Firebase Firestore

from typing import Optional, Dict, List
from datetime import datetime, timedelta
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
            # Načítaj Firebase credentials zo súboru
            cred = credentials.Certificate("firebase-service-account.json")
            firebase_admin.initialize_app(cred)
            cls._db = firestore.client()
            print("[OK] Firebase pripojene!")
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
