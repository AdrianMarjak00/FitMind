export interface FoodEntry {
  id?: string;
  name: string;
  calories: number;
  protein?: number;
  carbs?: number;
  fats?: number;
  timestamp: Date | any; // Firestore timestamp
  mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
}

export interface ExerciseEntry {
  id?: string;
  type: string; // napr. "beh", "posilňovanie", "yoga"
  duration: number; // minúty
  intensity?: 'low' | 'medium' | 'high';
  caloriesBurned?: number;
  notes?: string;
  timestamp: Date | any;
}

export interface StressEntry {
  id?: string;
  level: number; // 1-10
  source?: string; // napr. "práca", "rodina"
  notes?: string;
  timestamp: Date | any;
}

export interface MoodEntry {
  id?: string;
  score: number; // 1-5
  note?: string;
  timestamp: Date | any;
}

export interface SleepEntry {
  id?: string;
  hours: number;
  quality?: 'poor' | 'fair' | 'good' | 'excellent';
  timestamp: Date | any;
}

export interface WeightEntry {
  id?: string;
  weight: number; // kg
  timestamp: Date | any;
}

export interface UserFitnessProfile {
  userId: string;
  // Základné informácie
  name?: string;
  age?: number;
  height?: number; // cm
  gender?: 'male' | 'female' | 'other';
  activityLevel?: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  
  // Ciele
  goals?: string[]; // napr. ["schudnúť", "nabrať svaly"]
  targetWeight?: number;
  targetCalories?: number;
  
  // Problémy a preferencie
  problems?: string[]; // napr. ["stres", "spánok"]
  helps?: string[]; // napr. ["prechádzka", "dychové cvičenia"]
  
  // Denné záznamy
  foodEntries?: FoodEntry[];
  exerciseEntries?: ExerciseEntry[];
  stressEntries?: StressEntry[];
  moodEntries?: MoodEntry[];
  sleepEntries?: SleepEntry[];
  weightEntries?: WeightEntry[];
  
  // Metadata
  createdAt?: Date | any;
  updatedAt?: Date | any;
}




