// Záznamy o jedle
export interface FoodEntry {
  id?: string;
  name: string;
  calories: number;
  protein?: number;
  carbs?: number;
  fats?: number;
  timestamp: Date | any; // Firestore timestamp
  mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  category?: 'food' | 'drink';
}

// Záznamy o tréningoch (workoutEntries)
export interface WorkoutEntry {
  id?: string;
  type: string; // napr. "beh", "posilňovanie", "yoga"
  duration: number; // minúty
  intensity?: 'low' | 'medium' | 'high';
  caloriesBurned?: number;
  notes?: string;
  timestamp: Date | any;
}

// Záznamy o strese
export interface StressEntry {
  id?: string;
  level: number; // 1-10
  source?: string; // napr. "práca", "rodina"
  notes?: string;
  timestamp: Date | any;
}

// Záznamy o nálade
export interface MoodEntry {
  id?: string;
  score: number; // 1-5
  note?: string;
  timestamp: Date | any;
}

// Záznamy o spánku
export interface SleepEntry {
  id?: string;
  hours: number;
  quality?: 'poor' | 'fair' | 'good' | 'excellent';
  timestamp: Date | any;
}

// Záznamy o váhe
export interface WeightEntry {
  id?: string;
  weight: number; // kg
  timestamp: Date | any;
}
