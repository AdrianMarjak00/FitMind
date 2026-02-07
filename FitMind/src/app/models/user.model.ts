// User model types and interfaces

export type Gender = 'male' | 'female' | 'other';
export type ActivityLevel = 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | 'extremely_active';
export type PrimaryGoal = 'lose_weight' | 'gain_weight' | 'maintain_weight' | 'build_muscle' | 'improve_fitness';
export type DietType = 'none' | 'vegetarian' | 'vegan' | 'keto' | 'paleo' | 'mediterranean' | 'low_carb';

export const ACTIVITY_LEVEL_LABELS: Record<ActivityLevel, string> = {
    sedentary: 'Sed avý (žiadne cvičenie)',
    lightly_active: 'Ľahko aktívny (1-3x týždenne)',
    moderately_active: 'Stredne aktívny (3-5x týždenne)',
    very_active: 'Veľmi aktívny (6-7x týždenne)',
    extremely_active: 'Extrémne aktívny (2x denne)'
};

export const GOAL_LABELS: Record<PrimaryGoal, string> = {
    lose_weight: 'Schudnúť',
    gain_weight: 'Pribr ať',
    maintain_weight: 'Udržať váhu',
    build_muscle: 'Budovať svaly',
    improve_fitness: 'Zlepšiť kondíciu'
};

export const DIET_TYPE_LABELS: Record<DietType, string> = {
    none: 'Žiadna diéta',
    vegetarian: 'Vegetariánska',
    vegan: 'Vegánska',
    keto: 'Ketogénna',
    paleo: 'Paleo',
    mediterranean: 'Stredomorská',
    low_carb: 'Nízkosacharidová'
};

export interface CreateUserProfileDto {
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    gender: Gender;
    height: number;
    currentWeight: number;
    targetWeight: number;
    activityLevel: ActivityLevel;
}

export interface UpdateGoalsDto {
    primary: PrimaryGoal;
    targetDate: string;
    weeklyGoal: number;
}

export interface UpdatePreferencesDto {
    allergies?: string[];
    dietType?: DietType;
    dislikedFoods?: string[];
    preferredCuisines?: string[];
}
