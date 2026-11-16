import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';

import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { MatButtonModule } from '@angular/material/button';

import { AuthService } from '../../services/auth.service';
import { AiService } from '../../services/ai.service';
import { CoachContext, EMPTY_ENTRIES } from '../../ai/context';
import { DayPlan, MenuOptions, PlannedIngredient, buildDayPlan, ingredientText } from '../../ai/meal-planner';

type Diet = 'all' | 'vegetarian' | 'vegan';

@Component({
  selector: 'app-jedalnicek',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatDividerModule,
    MatChipsModule,
    MatButtonModule,
    RouterModule
  ],
  templateUrl: './jedalnicek.html',
  styleUrl: './jedalnicek.scss'
})
export class JedalnicekComponent implements OnInit, OnDestroy {
  /** Jedálniček vypočítaný z profilu používateľa (kalorický cieľ, diéta). */
  plan: DayPlan | null = null;
  mealsPerDay = 4;
  diet: Diet = 'all';
  readonly mealOptions = [3, 4, 5];
  readonly dietOptions: Array<{ value: Diet; label: string }> = [
    { value: 'all', label: 'Všetko' },
    { value: 'vegetarian', label: 'Vegetariánsky' },
    { value: 'vegan', label: 'Vegánsky' }
  ];

  private context: CoachContext = { profile: null, entries: { ...EMPTY_ENTRIES }, now: new Date() };
  private userSubscription?: Subscription;

  constructor(private authService: AuthService, private aiService: AiService) { }

  ngOnInit(): void {
    this.regenerate();
    this.userSubscription = this.authService.getCurrentUser().subscribe(user => {
      if (!user?.uid) return;
      this.aiService.getCoachContext(user.uid).subscribe({
        next: ctx => { this.context = ctx; this.regenerate(); },
        error: () => { /* ostane všeobecný jedálniček */ }
      });
    });
  }

  ngOnDestroy(): void {
    this.userSubscription?.unsubscribe();
  }

  regenerate(): void {
    const opts: MenuOptions = {
      mealsPerDay: this.mealsPerDay,
      vegetarian: this.diet === 'vegetarian',
      vegan: this.diet === 'vegan'
    };
    this.plan = buildDayPlan(this.context, opts);
  }

  setMeals(count: number): void {
    this.mealsPerDay = count;
    this.regenerate();
  }

  setDiet(diet: Diet): void {
    this.diet = diet;
    this.regenerate();
  }

  ingredients(list: PlannedIngredient[]): string {
    return list.map(ingredientText).join(', ');
  }
}
