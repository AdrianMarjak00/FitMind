// Fitness profil používateľa
export interface UserProfile {
  userId: string;
  email: string;
  // Osobné údaje
  firstName: string;
  lastName: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  // Fyzické parametre
  height: number; // cm
  currentWeight: number; // kg
  targetWeight: number; // kg
  // Fitness ciele
  fitnessGoal: 'lose_weight' | 'gain_muscle' | 'maintain' | 'improve_health';
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  targetCalories?: number; // Denný cieľ kalórií
  // Zdravotné informácie
  medicalConditions?: string[];
  dietaryRestrictions?: string[];
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

