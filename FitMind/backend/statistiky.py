from typing import Dict, List, Optional
from firebase_databaza import FirebaseService


class StatsService:
    """Vypočítava štatistiky a trendy z dát používateľa."""

    def __init__(self, firebase_service=None):
        self.firebase = firebase_service or FirebaseService()

    @staticmethod
    def _ts_to_iso(ts) -> Optional[str]:
        """Skonvertuje Firestore Timestamp na ISO 8601 string."""
        if ts is None:
            return None
        try:
            from datetime import datetime, timezone
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
        """Skonvertuje timestamp na float sekúnd pre zoradenie."""
        if ts is None:
            return 0.0
        try:
            from datetime import datetime
            if hasattr(ts, 'timestamp'):
                return ts.timestamp()
            if isinstance(ts, (int, float)):
                return float(ts)
            if isinstance(ts, str):
                return datetime.fromisoformat(ts.replace('Z', '+00:00')).timestamp()
        except Exception:
            pass
        return 0.0

    # --- SÚHRNY ---

    def get_calories_summary(self, user_id: str, days: int = 7) -> Dict:
        """Vypočíta celkový súhrn kalórií za obdobie."""
        entries = self.firebase.get_entries(user_id, 'food', days)

        if not entries:
            return {"total": 0, "average": 0, "by_meal": {}, "by_category": {"food": 0, "drink": 0}, "count": 0}

        total = 0.0
        by_meal = {}
        by_category = {"food": 0.0, "drink": 0.0}

        for entry in entries:
            try:
                calories = float(entry.get('calories', 0) or 0)
            except (TypeError, ValueError):
                calories = 0.0

            total += calories
            meal = entry.get('mealType', 'other')
            by_meal[meal] = by_meal.get(meal, 0.0) + calories
            cat = entry.get('category', 'food')
            by_category[cat] = by_category.get(cat, 0.0) + calories

        return {
            "total": round(total, 1),
            "average": round(total / days, 1) if days > 0 else 0,
            "by_meal": {k: round(v, 1) for k, v in by_meal.items()},
            "by_category": {k: round(v, 1) for k, v in by_category.items()},
            "count": len(entries)
        }

    def get_exercise_summary(self, user_id: str, days: int = 7) -> Dict:
        """Vypočíta súhrn cvičenia za obdobie."""
        entries = self.firebase.get_entries(user_id, 'exercise', days)

        if not entries:
            return {"total_minutes": 0, "total_calories": 0, "by_type": {}, "count": 0}

        total_minutes = 0.0
        total_calories = 0.0
        by_type = {}

        for entry in entries:
            try:
                duration = float(entry.get('duration', 0) or 0)
                kcal = float(entry.get('caloriesBurned', 0) or 0)
            except (TypeError, ValueError):
                duration, kcal = 0.0, 0.0

            total_minutes += duration
            total_calories += kcal
            ex_type = entry.get('type', 'other')
            by_type[ex_type] = by_type.get(ex_type, 0.0) + duration

        return {
            "total_minutes": round(total_minutes, 1),
            "total_calories": round(total_calories, 1),
            "by_type": {k: round(v, 1) for k, v in by_type.items()},
            "count": len(entries)
        }

    # --- GRAFY ---

    def get_chart_data(self, user_id: str, chart_type: str, days: int = 30) -> Dict:
        """Vráti dáta pre konkrétny typ grafu."""
        chart_map = {
            'calories': lambda: self.get_calories_summary(user_id, days),
            'exercise': lambda: self.get_exercise_summary(user_id, days),
            'mood':     lambda: {"trend": self.get_mood_trend(user_id, days)},
            'stress':   lambda: {"trend": self.get_stress_trend(user_id, days)},
            'sleep':    lambda: {"trend": self.get_sleep_trend(user_id, days)},
            'weight':   lambda: {"trend": self.get_weight_trend(user_id, days)},
        }

        try:
            func = chart_map.get(chart_type)
            return func() if func else {}
        except Exception as e:
            print(f"[Stats] Chyba pri získavaní {chart_type} dát: {e}")
            return {}

    def get_mood_trend(self, user_id: str, days: int = 30) -> List[Dict]:
        """Vráti trend nálady zoradený chronologicky."""
        entries = self.firebase.get_entries(user_id, 'mood', days)
        sorted_entries = sorted(entries, key=lambda e: self._ts_to_float(e.get('timestamp')))

        return [
            {
                "date":  self._ts_to_iso(e.get('timestamp')),
                "score": e.get('score', 0),
                "note":  e.get('note', '')
            }
            for e in sorted_entries
        ]

    def get_stress_trend(self, user_id: str, days: int = 30) -> List[Dict]:
        """Vráti trend stresu zoradený chronologicky."""
        entries = self.firebase.get_entries(user_id, 'stress', days)
        sorted_entries = sorted(entries, key=lambda e: self._ts_to_float(e.get('timestamp')))

        return [
            {
                "date":   self._ts_to_iso(e.get('timestamp')),
                "level":  e.get('level', 0),
                "source": e.get('source', '')
            }
            for e in sorted_entries
        ]

    def get_weight_trend(self, user_id: str, days: int = 90) -> List[Dict]:
        """Vráti trend váhy zoradený chronologicky."""
        entries = self.firebase.get_entries(user_id, 'weight', days)
        sorted_entries = sorted(entries, key=lambda e: self._ts_to_float(e.get('timestamp')))

        results = []
        for e in sorted_entries:
            try:
                weight = float(e.get('weight', 0) or 0)
            except (TypeError, ValueError):
                weight = 0.0
            results.append({
                "date":   self._ts_to_iso(e.get('timestamp')),
                "weight": weight
            })
        return results

    def get_sleep_trend(self, user_id: str, days: int = 30) -> List[Dict]:
        """Vráti trend spánku zoradený chronologicky."""
        entries = self.firebase.get_entries(user_id, 'sleep', days)
        sorted_entries = sorted(entries, key=lambda e: self._ts_to_float(e.get('timestamp')))

        results = []
        for e in sorted_entries:
            try:
                hours = float(e.get('hours', 0) or 0)
            except (TypeError, ValueError):
                hours = 0.0
            results.append({
                "date":    self._ts_to_iso(e.get('timestamp')),
                "hours":   hours,
                "quality": e.get('quality', '')
            })
        return results
