export interface Journal {
  id: string;
  uid: string;
  date: string;
  meals: Meal[];
  activities: Activity[];
  mood?: string;
  water?: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Meal {
  id: string;
  name: string;
  calories: number;
  protein?: number;
  carbs?: number;
  fats?: number;
  time: string;
}

export interface Activity {
  id: string;
  name: string;
  duration: number;
  calories: number;
  time: string;
}

export interface CreateJournalDto {
  uid: string;
  date: string;
}

export interface AddMealDto {
  name: string;
  calories: number;
  protein?: number;
  carbs?: number;
  fats?: number;
  time: string;
}

export interface AddActivityDto {
  name: string;
  duration: number;
  calories: number;
  time: string;
}

export interface UpdateMoodDto {
  mood: string;
}
