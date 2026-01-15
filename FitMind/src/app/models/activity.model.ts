export interface Activity {
  id?: string;
  userId: string;
  
  type: 'Workout' | 'Nutrition' | 'Other'; 
  description: string;
  
  timestamp: Date;
  
  caloriesIn?: number;
  caloriesOut?: number;

  durationMin?: number; 
  distanceKm?: number;
  
  rawInput: string;
}

export interface WeeklyCaloriesData {
  day: string;
  caloriesIn: number;
  caloriesOut: number;
}