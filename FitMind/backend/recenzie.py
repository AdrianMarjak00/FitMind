# Coach Service - Pokročilé analytické a personalizované kouč funkcie
# Tento súbor obsahuje funkcie pre generovanie personalizovaných odporúčaní a reportov

from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta

class CoachService:
    """
    Service pre pokročilé kouč funkcie
    - Personalizované týždenné/mesačné reporty
    - Analýza trendov a pokroku
    - Generovanie odporúčaní
    - Sledovanie cieľov
    """
    
    def __init__(self, firebase_service):
        """
        Args:
            firebase_service: Instance FirebaseService pre prístup k databáze
        """
        self.firebase = firebase_service
    
    def generate_weekly_report(self, user_id: str) -> Dict[str, Any]:
        """
        Generuje týždenný report pre používateľa
        
        Args:
            user_id: ID používateľa
            
        Returns:
            Slovník s týždenným reportom (kalórie, cvičenie, nálada, dosiahnutia, odporúčania)
        """
        # Získaj profil a dáta za posledných 7 dní
        profile = self.firebase.get_user_profile(user_id)
        
        food_entries = self.firebase.get_entries(user_id, 'food', days=7, limit=100)
        exercise_entries = self.firebase.get_entries(user_id, 'exercise', days=7, limit=100)
        mood_entries = self.firebase.get_entries(user_id, 'mood', days=7, limit=100)
        stress_entries = self.firebase.get_entries(user_id, 'stress', days=7, limit=100)
        sleep_entries = self.firebase.get_entries(user_id, 'sleep', days=7, limit=100)
        weight_entries = self.firebase.get_entries(user_id, 'weight', days=7, limit=100)
        
        report = {
            "period": "weekly",
            "week_start": (datetime.now() - timedelta(days=7)).isoformat(),
            "week_end": datetime.now().isoformat(),
            "summary": {},
            "achievements": [],
            "areas_to_improve": [],
            "recommendations": [],
            "goal_progress": {}
        }
        
        # === KALÓRIE ===
        if food_entries:
            total_calories = sum(f.get('calories', 0) for f in food_entries)
            avg_calories = total_calories / 7  # Priemer na deň
            
            report['summary']['calories'] = {
                "total": total_calories,
                "daily_average": round(avg_calories, 1),
                "days_tracked": len(set(f.get('timestamp') for f in food_entries if 'timestamp' in f)),
                "highest_day": max((f.get('calories', 0) for f in food_entries), default=0),
                "lowest_day": min((f.get('calories', 0) for f in food_entries), default=0)
            }
            
            # Porovnaj s cieľom
            if profile and profile.get('targetCalories'):
                target = profile['targetCalories']
                diff = avg_calories - target
                diff_percent = (diff / target) * 100
                
                report['goal_progress']['calories'] = {
                    "target": target,
                    "actual": round(avg_calories, 1),
                    "difference": round(diff, 1),
                    "percentage": round(diff_percent, 1),
                    "on_track": abs(diff_percent) <= 10  # ±10% je OK
                }
                
                if abs(diff_percent) <= 10:
                    report['achievements'].append(f"🎯 Dodržal si kalorický cieľ ({target} kcal/deň)")
                elif diff_percent > 10:
                    report['areas_to_improve'].append(f"⚠️ Priemerný príjem {int(avg_calories)} kcal je nad cieľom ({target} kcal)")
                    report['recommendations'].append("Zníž porcie alebo vyber zdravšie alternatívy")
        else:
            report['areas_to_improve'].append("❌ Žiadne záznamy o jedle tento týždeň")
            report['recommendations'].append("Začni zaznamenávať všetky jedlá pre lepší prehľad")
        
        # === CVIČENIE ===
        if exercise_entries:
            total_minutes = sum(e.get('duration', 0) for e in exercise_entries)
            workout_count = len(exercise_entries)
            
            report['summary']['exercise'] = {
                "total_minutes": total_minutes,
                "workout_count": workout_count,
                "avg_duration": round(total_minutes / workout_count, 1) if workout_count > 0 else 0,
                "types": list(set(e.get('type', 'unknown') for e in exercise_entries))
            }
            
            # Hodnotenie
            if workout_count >= 5:
                report['achievements'].append(f"💪 {workout_count} tréningov tento týždeň - skvelé!")
            elif workout_count >= 3:
                report['achievements'].append(f"✅ {workout_count} tréningy - dobré tempo!")
            else:
                report['areas_to_improve'].append(f"⚠️ Len {workout_count} tréningy tento týždeň")
                report['recommendations'].append("Snaž sa cvičiť aspoň 3-4x týždenne")
            
            if total_minutes >= 150:  # WHO odporúčanie
                report['achievements'].append(f"🏆 {total_minutes} minút aktivity - splnil si WHO odporúčanie!")
        else:
            report['areas_to_improve'].append("❌ Žiadne cvičenie tento týždeň")
            report['recommendations'].append("Začni s 20-30 min. denne - napr. rýchla chôdza alebo joga")
        
        # === NÁLADA ===
        if mood_entries:
            avg_mood = sum(m.get('score', 0) for m in mood_entries) / len(mood_entries)
            report['summary']['mood'] = {
                "average_score": round(avg_mood, 1),
                "entries_count": len(mood_entries)
            }
            
            if avg_mood >= 4:
                report['achievements'].append(f"😊 Priemerne skvelá nálada ({avg_mood:.1f}/5)")
            elif avg_mood < 2.5:
                report['areas_to_improve'].append(f"😔 Nižšia nálada ({avg_mood:.1f}/5)")
                report['recommendations'].append("Zvýš pohyb, spánok a relaxáciu. Ak pretrvá, konzultuj odborníka")
        
        # === SPÁNOK ===
        if sleep_entries:
            avg_sleep = sum(s.get('hours', 0) for s in sleep_entries) / len(sleep_entries)
            report['summary']['sleep'] = {
                "average_hours": round(avg_sleep, 1),
                "nights_tracked": len(sleep_entries)
            }
            
            if avg_sleep >= 7 and avg_sleep <= 9:
                report['achievements'].append(f"😴 Optimálny spánok ({avg_sleep:.1f}h)")
            elif avg_sleep < 7:
                report['areas_to_improve'].append(f"⚠️ Nedostatok spánku ({avg_sleep:.1f}h)")
                report['recommendations'].append("Snaž sa spať aspoň 7-8 hodín denne")
        
        # === STRES ===
        if stress_entries:
            avg_stress = sum(s.get('level', 0) for s in stress_entries) / len(stress_entries)
            report['summary']['stress'] = {
                "average_level": round(avg_stress, 1),
                "entries_count": len(stress_entries)
            }
            
            if avg_stress > 7:
                report['areas_to_improve'].append(f"😰 Vysoký stres ({avg_stress:.1f}/10)")
                report['recommendations'].append("Zaraď relaxačné techniky: meditácia, dychové cvičenia, joga")
        
        # === VÁHA ===
        if weight_entries and len(weight_entries) >= 2:
            weights = sorted(weight_entries, key=lambda x: x.get('timestamp', datetime.now()), reverse=True)
            latest_weight = weights[0].get('weight', 0)
            oldest_weight = weights[-1].get('weight', 0)
            weight_change = latest_weight - oldest_weight
            
            report['summary']['weight'] = {
                "current": latest_weight,
                "change": round(weight_change, 2),
                "entries_count": len(weight_entries)
            }
            
            if profile and profile.get('targetWeight'):
                target = profile['targetWeight']
                diff = latest_weight - target
                report['goal_progress']['weight'] = {
                    "target": target,
                    "current": latest_weight,
                    "to_goal": round(diff, 1)
                }
                
                if abs(diff) < 2:
                    report['achievements'].append(f"🎯 Si blízko cieľovej váhy ({target} kg)")
        
        # === CELKOVÉ HODNOTENIE ===
        achievement_score = len(report['achievements'])
        if achievement_score >= 5:
            report['overall_rating'] = "excellent"
            report['overall_message'] = "🌟 Excelentný týždeň! Pokračuj ďalej!"
        elif achievement_score >= 3:
            report['overall_rating'] = "good"
            report['overall_message'] = "✅ Dobrá práca! Ešte pár vylepšení a budeš top!"
        else:
            report['overall_rating'] = "needs_improvement"
            report['overall_message'] = "💪 Tento týždeň bol náročný, ale nevzdávaj to! Ďalší bude lepší."
        
        return report
    
    def generate_monthly_report(self, user_id: str) -> Dict[str, Any]:
        """
        Generuje mesačný report pre používateľa
        
        Args:
            user_id: ID používateľa
            
        Returns:
            Slovník s mesačným reportom
        """
        # Podobné ako týždenný, ale za 30 dní
        profile = self.firebase.get_user_profile(user_id)
        
        food_entries = self.firebase.get_entries(user_id, 'food', days=30, limit=500)
        exercise_entries = self.firebase.get_entries(user_id, 'exercise', days=30, limit=500)
        weight_entries = self.firebase.get_entries(user_id, 'weight', days=30, limit=100)
        
        report = {
            "period": "monthly",
            "month_start": (datetime.now() - timedelta(days=30)).isoformat(),
            "month_end": datetime.now().isoformat(),
            "summary": {},
            "trends": {},
            "achievements": [],
            "recommendations": []
        }
        
        # Kalórie - trend
        if food_entries:
            total_calories = sum(f.get('calories', 0) for f in food_entries)
            days_tracked = len(set(
                datetime.fromtimestamp(f.get('timestamp').timestamp()).date() 
                for f in food_entries 
                if 'timestamp' in f and hasattr(f.get('timestamp'), 'timestamp')
            ))
            
            avg_calories = total_calories / max(days_tracked, 1)
            
            report['summary']['calories'] = {
                "total": total_calories,
                "daily_average": round(avg_calories, 1),
                "days_tracked": days_tracked,
                "consistency": f"{(days_tracked/30)*100:.0f}%"
            }
            
            if days_tracked >= 25:
                report['achievements'].append(f"📊 {days_tracked}/30 dní zaznamenané - výborná konzistencia!")
        
        # Cvičenie - trend
        if exercise_entries:
            total_minutes = sum(e.get('duration', 0) for e in exercise_entries)
            workout_count = len(exercise_entries)
            
            report['summary']['exercise'] = {
                "total_minutes": total_minutes,
                "total_workouts": workout_count,
                "avg_per_week": round(workout_count / 4.3, 1),
                "avg_duration": round(total_minutes / workout_count, 1) if workout_count > 0 else 0
            }
            
            if workout_count >= 16:  # 4x týždenne
                report['achievements'].append(f"💪 {workout_count} tréningov za mesiac - si beast!")
        
        # Váha - trend za mesiac
        if weight_entries and len(weight_entries) >= 2:
            weights = sorted(weight_entries, key=lambda x: x.get('timestamp', datetime.now()), reverse=True)
            latest = weights[0].get('weight', 0)
            oldest = weights[-1].get('weight', 0)
            change = latest - oldest
            
            report['summary']['weight'] = {
                "current": latest,
                "month_change": round(change, 2),
                "trend": "decreasing" if change < 0 else "increasing" if change > 0 else "stable"
            }
            
            if profile and profile.get('targetWeight'):
                target = profile['targetWeight']
                progress = oldest - latest if oldest > target else latest - oldest
                
                if progress > 0:
                    report['achievements'].append(f"🎯 Pokrok k cieľu: {abs(change):.1f}kg!")
        
        return report
    
    def get_personalized_recommendations(self, user_id: str) -> List[str]:
        """
        Generuje personalizované odporúčania na základe aktuálneho stavu používateľa
        
        Args:
            user_id: ID používateľa
            
        Returns:
            Zoznam personalizovaných odporúčaní
        """
        profile = self.firebase.get_user_profile(user_id)
        recommendations = []
        
        # Získaj týždenný report pre analýzu
        weekly_report = self.generate_weekly_report(user_id)
        
        # Pridaj odporúčania z reportu
        recommendations.extend(weekly_report.get('recommendations', []))
        
        # Personalizované odporúčania podľa cieľov
        if profile and profile.get('goals'):
            goals = profile['goals']
            
            if 'chudnutie' in str(goals).lower() or 'schudnúť' in str(goals).lower():
                recommendations.append("🔥 Pre chudnutie: Kombinácia kardio (3-4x) + silový tréning (2-3x)")
                recommendations.append("🍎 Calorický deficit 300-500 kcal denne")
            
            if 'svaly' in str(goals).lower() or 'sila' in str(goals).lower():
                recommendations.append("💪 Pre svalovú hmotu: Silový tréning 4-5x týždenne")
                recommendations.append("🥩 Vysoký proteínový príjem (1.6-2.2g na kg váhy)")
            
            if 'energia' in str(goals).lower():
                recommendations.append("⚡ Pre energiu: Pravidelný spánok 7-8h + raňajky do hodiny po prebudení")
                recommendations.append("💧 Hydratácia: min. 2-3L vody denne")
            
            if 'stres' in str(goals).lower() or 'relax' in str(goals).lower():
                recommendations.append("🧘 Meditácia alebo dychové cvičenia 10 min. denne")
                recommendations.append("🌳 Čas v prírode aspoň 30 min. denne")
        
        # Ak nie sú žiadne odporúčania, pridaj všeobecné
        if not recommendations:
            recommendations = [
                "🎯 Nastav si konkrétne ciele v profile",
                "📊 Začni zaznamenávať jedlo a cvičenie denne",
                "💪 Minimálne 30 min. pohybu denne",
                "😴 Pravidelný spánok 7-8 hodín",
                "💧 Hydratácia - aspoň 2L vody denne"
            ]
        
        return recommendations[:5]  # Max 5 odporúčaní
    
    def check_goal_progress(self, user_id: str) -> Dict[str, Any]:
        """
        Kontroluje pokrok k stanoveným cieľom
        
        Args:
            user_id: ID používateľa
            
        Returns:
            Slovník s pokrokom k jednotlivým cieľom
        """
        profile = self.firebase.get_user_profile(user_id)
        
        if not profile:
            return {"error": "Profile not found"}
        
        progress = {
            "user_id": user_id,
            "goals": profile.get('goals', []),
            "progress_items": []
        }
        
        # Cieľová váha
        if profile.get('targetWeight'):
            weight_entries = self.firebase.get_entries(user_id, 'weight', days=90, limit=100)
            if weight_entries:
                current_weight = weight_entries[0].get('weight', 0)
                target_weight = profile['targetWeight']
                difference = current_weight - target_weight
                
                progress['progress_items'].append({
                    "goal": "Cieľová váha",
                    "target": f"{target_weight} kg",
                    "current": f"{current_weight} kg",
                    "difference": f"{difference:+.1f} kg",
                    "percentage": round((1 - abs(difference) / target_weight) * 100, 1) if target_weight > 0 else 0,
                    "on_track": abs(difference) < 5
                })
        
        # Denný kalorický cieľ
        if profile.get('targetCalories'):
            food_entries = self.firebase.get_entries(user_id, 'food', days=7, limit=100)
            if food_entries:
                avg_calories = sum(f.get('calories', 0) for f in food_entries) / 7
                target_calories = profile['targetCalories']
                difference = avg_calories - target_calories
                
                progress['progress_items'].append({
                    "goal": "Denný kalorický cieľ",
                    "target": f"{target_calories} kcal",
                    "current": f"{int(avg_calories)} kcal",
                    "difference": f"{difference:+.0f} kcal",
                    "percentage": round((target_calories / avg_calories) * 100, 1) if avg_calories > 0 else 0,
                    "on_track": abs(difference) <= target_calories * 0.1  # ±10%
                })
        
        return progress

