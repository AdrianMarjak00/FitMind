from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta


class CoachService:
    """Generuje personalizované odporúčania a reporty na základe dát používateľa."""

    def __init__(self, firebase_service):
        self.firebase = firebase_service

    @staticmethod
    def _ts_to_date_str(ts) -> str:
        """Skonvertuje Firestore Timestamp na dátumový string 'YYYY-MM-DD'."""
        if ts is None:
            return ''
        try:
            from datetime import timezone
            if hasattr(ts, 'timestamp'):
                return datetime.fromtimestamp(ts.timestamp(), tz=timezone.utc).strftime('%Y-%m-%d')
            if hasattr(ts, 'strftime'):
                return ts.strftime('%Y-%m-%d')
            if isinstance(ts, str):
                return ts[:10]
        except Exception:
            pass
        return ''

    # --- TÝŽDENNÝ REPORT ---

    def generate_weekly_report(self, user_id: str) -> Dict[str, Any]:
        """Generuje komplexný týždenný report pre posledných 7 dní."""
        profile = self.firebase.get_user_profile(user_id)

        food_entries     = self.firebase.get_entries(user_id, 'food',     days=7, limit=200)
        exercise_entries = self.firebase.get_entries(user_id, 'exercise', days=7, limit=100)
        mood_entries     = self.firebase.get_entries(user_id, 'mood',     days=7, limit=50)
        stress_entries   = self.firebase.get_entries(user_id, 'stress',   days=7, limit=50)
        sleep_entries    = self.firebase.get_entries(user_id, 'sleep',    days=7, limit=50)
        weight_entries   = self.firebase.get_entries(user_id, 'weight',   days=7, limit=20)

        report = {
            "period":           "weekly",
            "week_start":       (datetime.now() - timedelta(days=7)).isoformat(),
            "week_end":         datetime.now().isoformat(),
            "summary":          {},
            "achievements":     [],
            "areas_to_improve": [],
            "recommendations":  [],
            "goal_progress":    {}
        }

        # Kalórie
        if food_entries:
            total_calories = sum(float(f.get('calories', 0) or 0) for f in food_entries)
            days_with_food = len(set(
                self._ts_to_date_str(f.get('timestamp'))
                for f in food_entries if f.get('timestamp')
            ))
            avg_calories = total_calories / max(days_with_food, 1)

            report['summary']['calories'] = {
                "total":         round(total_calories, 1),
                "daily_average": round(avg_calories, 1),
                "days_tracked":  days_with_food,
            }

            if profile and profile.get('targetCalories'):
                target = profile['targetCalories']
                diff_pct = ((avg_calories - target) / target) * 100

                report['goal_progress']['calories'] = {
                    "target":     target,
                    "actual":     round(avg_calories, 1),
                    "difference": round(avg_calories - target, 1),
                    "on_track":   abs(diff_pct) <= 10
                }

                if abs(diff_pct) <= 10:
                    report['achievements'].append(f"🎯 Dodržal si kalorický cieľ ({target} kcal/deň)")
                elif diff_pct > 10:
                    report['areas_to_improve'].append(
                        f"⚠️ Priemerný príjem {int(avg_calories)} kcal je nad cieľom ({target} kcal)"
                    )
                    report['recommendations'].append("Zníž porcie alebo vyber zdravšie alternatívy")
        else:
            report['areas_to_improve'].append("❌ Žiadne záznamy o jedle tento týždeň")
            report['recommendations'].append("Začni zaznamenávať jedlá – stačí napísať AI trénerovi čo si jedol")

        # Cvičenie
        if exercise_entries:
            total_minutes  = sum(float(e.get('duration', 0) or 0) for e in exercise_entries)
            workout_count  = len(exercise_entries)
            exercise_types = list(set(e.get('type', 'unknown') for e in exercise_entries))

            report['summary']['exercise'] = {
                "total_minutes": round(total_minutes, 1),
                "workout_count": workout_count,
                "avg_duration":  round(total_minutes / workout_count, 1) if workout_count else 0,
                "types":         exercise_types
            }

            if workout_count >= 5:
                report['achievements'].append(f"💪 {workout_count} tréningov tento týždeň – skvelé!")
            elif workout_count >= 3:
                report['achievements'].append(f"✅ {workout_count} tréningy – dobré tempo!")
            else:
                report['areas_to_improve'].append(f"⚠️ Len {workout_count} tréningy tento týždeň")
                report['recommendations'].append("Snaž sa cvičiť aspoň 3–4× týždenne")

            if total_minutes >= 150:
                report['achievements'].append(f"🏆 {int(total_minutes)} min aktivity – splnil si WHO odporúčanie!")
        else:
            report['areas_to_improve'].append("❌ Žiadne cvičenie tento týždeň")
            report['recommendations'].append("Začni s 20–30 min. denne – napr. chôdza alebo joga")

        # Nálada
        if mood_entries:
            avg_mood = sum(float(m.get('score', 0) or 0) for m in mood_entries) / len(mood_entries)
            report['summary']['mood'] = {
                "average_score": round(avg_mood, 1),
                "entries_count": len(mood_entries)
            }
            if avg_mood >= 7:
                report['achievements'].append(f"😊 Výborná nálada tento týždeň ({avg_mood:.1f}/10)")
            elif avg_mood < 4:
                report['areas_to_improve'].append(f"😔 Nižšia nálada ({avg_mood:.1f}/10)")
                report['recommendations'].append("Viac pohybu, spánku a relaxu môže pomôcť")

        # Spánok
        if sleep_entries:
            avg_sleep = sum(float(s.get('hours', 0) or 0) for s in sleep_entries) / len(sleep_entries)
            report['summary']['sleep'] = {
                "average_hours":  round(avg_sleep, 1),
                "nights_tracked": len(sleep_entries)
            }
            if 7 <= avg_sleep <= 9:
                report['achievements'].append(f"😴 Optimálny spánok ({avg_sleep:.1f}h/noc)")
            elif avg_sleep < 7:
                report['areas_to_improve'].append(f"⚠️ Nedostatok spánku ({avg_sleep:.1f}h)")
                report['recommendations'].append("Snaž sa spať aspoň 7–8 hodín denne")

        # Stres
        if stress_entries:
            avg_stress = sum(float(s.get('level', 0) or 0) for s in stress_entries) / len(stress_entries)
            report['summary']['stress'] = {
                "average_level": round(avg_stress, 1),
                "entries_count": len(stress_entries)
            }
            if avg_stress > 7:
                report['areas_to_improve'].append(f"😰 Vysoký stres ({avg_stress:.1f}/10)")
                report['recommendations'].append("Zaraď relaxačné techniky: meditácia, dychové cvičenia, joga")

        # Váha
        if weight_entries and len(weight_entries) >= 2:
            sorted_weights  = sorted(weight_entries, key=lambda e: self._ts_to_date_str(e.get('timestamp')))
            latest_weight   = float(sorted_weights[-1].get('weight', 0) or 0)
            earliest_weight = float(sorted_weights[0].get('weight', 0) or 0)
            weight_change   = latest_weight - earliest_weight

            report['summary']['weight'] = {
                "current": latest_weight,
                "change":  round(weight_change, 2),
                "entries": len(weight_entries)
            }

            if profile and profile.get('targetWeight'):
                target = profile['targetWeight']
                diff = latest_weight - target
                report['goal_progress']['weight'] = {
                    "target":  target,
                    "current": latest_weight,
                    "to_goal": round(diff, 1)
                }
                if abs(diff) < 2:
                    report['achievements'].append(f"🎯 Si blízko cieľovej váhy ({target} kg)!")

        # Celkové hodnotenie
        achievement_count = len(report['achievements'])
        if achievement_count >= 5:
            report['overall_rating'] = "excellent"
            report['overall_message'] = "🌟 Excelentný týždeň! Pokračuj ďalej!"
        elif achievement_count >= 3:
            report['overall_rating'] = "good"
            report['overall_message'] = "✅ Dobrá práca! Ešte pár vylepšení a budeš na vrchole!"
        else:
            report['overall_rating'] = "needs_improvement"
            report['overall_message'] = "💪 Tento týždeň bol náročný, ale nevzdávaj to!"

        return report

    # --- MESAČNÝ REPORT ---

    def generate_monthly_report(self, user_id: str) -> Dict[str, Any]:
        """Generuje mesačný prehľad za posledných 30 dní."""
        profile          = self.firebase.get_user_profile(user_id)
        food_entries     = self.firebase.get_entries(user_id, 'food',     days=30, limit=500)
        exercise_entries = self.firebase.get_entries(user_id, 'exercise', days=30, limit=300)
        weight_entries   = self.firebase.get_entries(user_id, 'weight',   days=30, limit=100)

        report = {
            "period":          "monthly",
            "month_start":     (datetime.now() - timedelta(days=30)).isoformat(),
            "month_end":       datetime.now().isoformat(),
            "summary":         {},
            "achievements":    [],
            "recommendations": []
        }

        if food_entries:
            total_cal = sum(float(f.get('calories', 0) or 0) for f in food_entries)
            days_tracked = len(set(
                self._ts_to_date_str(f.get('timestamp'))
                for f in food_entries if f.get('timestamp')
            ))
            avg_cal = total_cal / max(days_tracked, 1)

            report['summary']['calories'] = {
                "total":         round(total_cal, 1),
                "daily_average": round(avg_cal, 1),
                "days_tracked":  days_tracked,
                "consistency":   f"{(days_tracked / 30) * 100:.0f}%"
            }
            if days_tracked >= 25:
                report['achievements'].append(f"📊 {days_tracked}/30 dní so záznamami – výborná konzistencia!")

        if exercise_entries:
            total_min   = sum(float(e.get('duration', 0) or 0) for e in exercise_entries)
            workout_cnt = len(exercise_entries)

            report['summary']['exercise'] = {
                "total_minutes":  round(total_min, 1),
                "total_workouts": workout_cnt,
                "avg_per_week":   round(workout_cnt / 4.3, 1),
                "avg_duration":   round(total_min / workout_cnt, 1) if workout_cnt else 0
            }
            if workout_cnt >= 16:
                report['achievements'].append(f"💪 {workout_cnt} tréningov za mesiac – neuveriteľné!")

        if weight_entries and len(weight_entries) >= 2:
            sorted_w = sorted(weight_entries, key=lambda e: self._ts_to_date_str(e.get('timestamp')))
            latest   = float(sorted_w[-1].get('weight', 0) or 0)
            earliest = float(sorted_w[0].get('weight', 0) or 0)
            change   = latest - earliest

            report['summary']['weight'] = {
                "current":      latest,
                "month_change": round(change, 2),
                "trend":        "klesá" if change < 0 else ("rastie" if change > 0 else "stabilná")
            }
            if profile and profile.get('targetWeight'):
                progress = abs(change)
                if progress > 0:
                    report['achievements'].append(f"🎯 Pokrok k cieľu: {progress:.1f} kg tento mesiac!")

        return report

    # --- ODPORÚČANIA ---

    def get_personalized_recommendations(self, user_id: str) -> List[str]:
        """Vráti zoznam max. 5 personalizovaných odporúčaní."""
        profile = self.firebase.get_user_profile(user_id)
        weekly_report = self.generate_weekly_report(user_id)

        recommendations = list(weekly_report.get('recommendations', []))
        ciel = profile.get('fitnessGoal', '') if profile else ''

        if ciel == 'lose_weight':
            recommendations.append("🔥 Pre chudnutie: Kombinácia kardio (3–4×) + silový tréning (2–3×) týždenne")
            recommendations.append("🍎 Kalorický deficit 300–500 kcal denne – nie menej!")
        elif ciel == 'gain_muscle':
            recommendations.append("💪 Pre svalovú hmotu: Silový tréning 4–5× týždenne s progresívnym preťažením")
            recommendations.append("🥩 Proteín: min. 1.6–2.2 g na kg tvojej váhy denne")
        elif ciel == 'improve_health':
            recommendations.append("⚡ Pre energiu: Pravidelný spánok 7–8h + raňajky do hodiny po prebudení")
            recommendations.append("💧 Hydratácia: min. 2–3 litre vody denne")

        if not recommendations:
            recommendations = [
                "🎯 Nastav si konkrétne ciele v profile",
                "📊 Zaznamenávaj jedlo a cvičenie každý deň",
                "💪 Min. 30 min. pohybu denne",
                "😴 Pravidelný spánok 7–8 hodín",
                "💧 Aspoň 2 litre vody denne"
            ]

        return recommendations[:5]

    # --- POKROK K CIEĽOM ---

    def check_goal_progress(self, user_id: str) -> Dict[str, Any]:
        """Vypočíta aktuálny pokrok k stanoveným cieľom."""
        profile = self.firebase.get_user_profile(user_id)
        if not profile:
            return {"error": "Profil nenájdený"}

        progress = {"user_id": user_id, "progress_items": []}

        if profile.get('targetWeight'):
            weight_entries = self.firebase.get_entries(user_id, 'weight', days=90, limit=10)
            if weight_entries:
                sorted_w = sorted(weight_entries, key=lambda e: self._ts_to_date_str(e.get('timestamp')))
                current  = float(sorted_w[-1].get('weight', 0) or 0)
                target   = profile['targetWeight']
                diff     = current - target

                progress['progress_items'].append({
                    "goal":     "Cieľová váha",
                    "target":   f"{target} kg",
                    "current":  f"{current} kg",
                    "to_goal":  f"{diff:+.1f} kg",
                    "on_track": abs(diff) < 5
                })

        if profile.get('targetCalories'):
            food_entries = self.firebase.get_entries(user_id, 'food', days=7, limit=100)
            if food_entries:
                avg_cal = sum(float(f.get('calories', 0) or 0) for f in food_entries) / 7
                target  = profile['targetCalories']
                diff    = avg_cal - target

                progress['progress_items'].append({
                    "goal":     "Denný kalorický cieľ",
                    "target":   f"{target} kcal",
                    "current":  f"{int(avg_cal)} kcal (7-dňový priemer)",
                    "to_goal":  f"{diff:+.0f} kcal",
                    "on_track": abs(diff) <= target * 0.1
                })

        return progress
