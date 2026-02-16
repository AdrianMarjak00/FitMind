# Stats Service - Výpočet štatistík a dát pre grafy
# Tento súbor obsahuje funkcie na výpočet štatistík z dát používateľa

from typing import Dict, List

from firebase_databaza import FirebaseService

class StatsService:
    """
    Service pre výpočet štatistík
    Obsahuje funkcie na výpočet súhrnov a trendov z dát používateľa
    """
    
    def __init__(self, firebase_service=None):
        """Inicializuje FirebaseService pre prístup k dátam (podporuje dependency injection)"""
        self.firebase = firebase_service or FirebaseService()
    
    def get_calories_summary(self, user_id: str, days: int = 7) -> Dict:
        """
        Vypočíta súhrn kalórií za obdobie
        
        Args:
            user_id: ID používateľa
            days: Počet dní späť (default 7)
        """
        entries = self.firebase.get_entries(user_id, 'food', days)
        print(f"[DEBUG] Found {len(entries)} food entries for {user_id} in last {days} days")
        
        if not entries:
            return {"total": 0, "average": 0, "by_meal": {}, "by_category": {"food": 0, "drink": 0}, "count": 0}
        
        # Vypočítaj celkové kalórie (všetko pretypujeme na float pre istotu)
        total = 0
        by_meal = {}
        by_category = {"food": 0, "drink": 0}
        
        for entry in entries:
            try:
                calories = float(entry.get('calories', 0))
            except:
                calories = 0
                
            total += calories
            
            # Zoskup kalórie podľa typu jedla
            meal = entry.get('mealType', 'other')
            by_meal[meal] = by_meal.get(meal, 0) + calories
            
            # Kategória (food/drink)
            cat = entry.get('category', 'food')
            if cat not in by_category: by_category[cat] = 0
            by_category[cat] = by_category.get(cat, 0) + calories
        
        return {
            "total": total,
            "average": total / days if days > 0 else 0,
            "by_meal": by_meal,
            "by_category": by_category,
            "count": len(entries)
        }
    
    def get_exercise_summary(self, user_id: str, days: int = 7) -> Dict:
        """
        Vypočíta súhrn cvičenia za obdobie
        
        Args:
            user_id: ID používateľa
            days: Počet dní späť (default 7)
        """
        entries = self.firebase.get_entries(user_id, 'exercise', days)
        print(f"[DEBUG] Found {len(entries)} exercise entries for {user_id} in last {days} days")
        if not entries:
            return {"total_minutes": 0, "total_calories": 0, "by_type": {}, "count": 0}
        
        # Vypočítaj celkový čas a spálené kalórie
        total_minutes = 0
        total_calories = 0
        by_type = {}
        
        for entry in entries:
            try:
                duration = float(entry.get('duration', 0))
                kcal = float(entry.get('caloriesBurned', 0))
            except:
                duration = 0
                kcal = 0
                
            total_minutes += duration
            total_calories += kcal
            
            ex_type = entry.get('type', 'other')
            by_type[ex_type] = by_type.get(ex_type, 0) + duration
        
        return {
            "total_minutes": total_minutes,
            "total_calories": total_calories,
            "by_type": by_type,
            "count": len(entries)
        }
    
    def get_mood_trend(self, user_id: str, days: int = 30) -> List[Dict]:
        """
        Získa trend nálady (záznamy zoradené podľa času)
        
        Args:
            user_id: ID používateľa
            days: Počet dní späť (default 30)
        """
        entries = self.firebase.get_entries(user_id, 'mood', days)
        # Zoraď záznamy podľa timestampu a vráť ako zoznam slovníkov
        return [
            {
                "date": e.get('timestamp'),
                "score": e.get('score', 0),
                "note": e.get('note', '')
            }
            for e in sorted(entries, key=lambda x: x.get('timestamp', 0))
        ]
    
    def get_stress_trend(self, user_id: str, days: int = 30) -> List[Dict]:
        """
        Získa trend stresu (záznamy zoradené podľa času)
        
        Args:
            user_id: ID používateľa
            days: Počet dní späť (default 30)
        """
        entries = self.firebase.get_entries(user_id, 'stress', days)
        return [
            {
                "date": e.get('timestamp'),
                "level": e.get('level', 0),
                "source": e.get('source', '')
            }
            for e in sorted(entries, key=lambda x: x.get('timestamp', 0))
        ]
    
    def get_sleep_summary(self, user_id: str, days: int = 7) -> Dict:
        """
        Vypočíta súhrn spánku za obdobie
        
        Args:
            user_id: ID používateľa
            days: Počet dní späť (default 7)
        """
        entries = self.firebase.get_entries(user_id, 'sleep', days)
        if not entries:
            return {"average_hours": 0, "total_hours": 0, "by_quality": {}, "count": 0}
        
        # Vypočítaj celkový počet hodín
        total_hours = 0
        by_quality = {}
        for entry in entries:
            try:
                h = float(entry.get('hours', 0))
            except:
                h = 0
            total_hours += h
            
            quality = entry.get('quality', 'unknown')
            by_quality[quality] = by_quality.get(quality, 0) + 1
        
        return {
            "average_hours": total_hours / len(entries) if entries else 0,
            "total_hours": total_hours,
            "by_quality": by_quality,
            "count": len(entries)
        }
    
    def get_weight_trend(self, user_id: str, days: int = 90) -> List[Dict]:
        """
        Získa trend váhy (záznamy zoradené podľa času)
        
        Args:
            user_id: ID používateľa
            days: Počet dní späť (default 90)
        """
        entries = self.firebase.get_entries(user_id, 'weight', days)
        results = []
        for e in sorted(entries, key=lambda x: x.get('timestamp', 0)):
            try:
                val = float(e.get('weight', 0))
            except:
                val = 0
                
            results.append({
                "date": e.get('timestamp'),
                "weight": val
            })
        return results
    
    def get_chart_data(self, user_id: str, chart_type: str, days: int = 30) -> Dict:
        """
        Získa dáta pre konkrétny typ grafu
        
        Args:
            user_id: ID používateľa
            chart_type: Typ grafu ('calories', 'exercise', 'mood', 'stress', 'sleep', 'weight')
            days: Počet dní späť (default 30)
        """
        # Mapovanie typov grafov na funkcie
        chart_map = {
            'calories': lambda: self.get_calories_summary(user_id, days),
            'exercise': lambda: self.get_exercise_summary(user_id, days),
            'mood': lambda: {"trend": self.get_mood_trend(user_id, days)},
            'stress': lambda: {"trend": self.get_stress_trend(user_id, days)},
            'sleep': lambda: self.get_sleep_summary(user_id, days),
            'weight': lambda: {"trend": self.get_weight_trend(user_id, days)}
        }
        
        # Zavolaj príslušnú funkciu alebo vráť prázdny slovník
        func = chart_map.get(chart_type)
        return func() if func else {}
