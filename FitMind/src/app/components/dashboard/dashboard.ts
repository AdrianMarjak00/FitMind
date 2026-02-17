import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { NgxEchartsModule } from 'ngx-echarts';
import { trigger, transition, animate, style } from '@angular/animations';
import { AuthService } from '../../services/auth.service';
import { UserFitnessService } from '../../services/user-fitness.service';
import { ChartsService } from '../../services/charts.service';
import { PaymentService, SubscriptionStatus } from '../../services/payment.service';
import { UserProfile } from '../../models/user-profile.interface';
import { FoodEntry, WorkoutEntry, WeightEntry, SleepEntry } from '../../models/user-fitness-data.interface';
import { User } from '@angular/fire/auth';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule, FormsModule, NgxEchartsModule,
    MatButtonModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatTableModule, MatIconModule,
    MatDatepickerModule, MatNativeDateModule
  ],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss'],
  animations: [
    trigger('slideIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ]
})
export class DashboardComponent implements OnInit {
  currentUser: User | null = null;
  userId = '';
  userProfile: UserProfile | null = null;
  loading = true;
  showEmailVerificationBanner = false;

  // Grafy (Pridaný waterChart pre fix erroru v HTML)
  caloriesChart: any = {};
  exerciseChart: any = {};
  sleepChart: any = {};
  weightChart: any = {};
  waterChart: any = {}; 

  // Denné štatistiky
  todayStats = {
    calories: { consumed: 0, target: 2000, remaining: 2000 },
    exercise: { minutes: 0, target: 45 },
    weight: { current: 0 }
  };

  selectedPeriod: 'today' | 'week' | 'month' | 'custom' = 'week';
  periodOptions = [
    { id: 'today', label: 'Dnes', days: 1 },
    { id: 'week', label: 'Tento týždeň', days: 7 },
    { id: 'month', label: 'Tento mesiac', days: 30 }
  ];

  activeTab = 'calories';
  tabs = [
    { id: 'calories', label: 'Jedlo', icon: '🍽️' },
    { id: 'exercise', label: 'Pohyb', icon: '💪' },
    { id: 'weight', label: 'Váha', icon: '⚖️' },
    { id: 'sleep', label: 'Spánok', icon: '😴' }
  ];

  // FORMULÁRE
  calorieForm = { foods: '', calories: 0, protein: 0, carbs: 0, fats: 0, meal: 'lunch' };
  exerciseForm = { type: 'cardio', duration: 30, intensity: 'medium' };
  weightForm = { weight: 0 };
  sleepForm = { hours: 8, quality: 'good' as any };

  isPremium = false;

  constructor(
    private authService: AuthService,
    private userFitnessService: UserFitnessService,
    private chartsService: ChartsService,
    private paymentService: PaymentService
  ) { }

  ngOnInit(): void {
    this.authService.getCurrentUser().subscribe(user => {
      this.currentUser = user;
      this.userId = user?.uid || '';
      if (this.userId) {
        this.loadUserProfile();
        this.refreshAllData();
        this.loadSubscriptionStatus();
      }
    });
  }

  calculateCaloriesFromMacros(): void {
    const p = (this.calorieForm.protein || 0) * 4;
    const c = (this.calorieForm.carbs || 0) * 4;
    const f = (this.calorieForm.fats || 0) * 9;
    this.calorieForm.calories = p + c + f;
  }

  refreshAllData(): void {
    if (!this.userId) return;
    this.loading = true;
    const days = this.getFilterDays();

    this.chartsService.getChartData(this.userId, 'calories', days).subscribe(data => {
      this.caloriesChart = this.createPieChart(data.data.by_meal || {}, 'Rozdelenie dňa');
      this.todayStats.calories.consumed = data.data.total_today || 0;
      this.todayStats.calories.remaining = Math.max(0, this.todayStats.calories.target - this.todayStats.calories.consumed);
      this.loading = false;
    });

    this.chartsService.getChartData(this.userId, 'exercise', days).subscribe(data => {
      this.exerciseChart = this.createPieChart(data.data.by_type || {}, 'Typy aktivít');
      this.todayStats.exercise.minutes = data.data.total_minutes_today || 0;
    });

    this.chartsService.getChartData(this.userId, 'weight', 90).subscribe(data => {
      this.weightChart = this.createLineChart(data.data.trend || [], 'Váha', 'weight');
    });

    this.chartsService.getChartData(this.userId, 'sleep', days).subscribe(data => {
      this.sleepChart = this.createBarChart(data.data.by_quality || {}, 'Kvalita spánku');
    });

    this.waterChart = this.createPieChart({}, 'Voda');
  }

  addCalorieEntry(): void {
    if (!this.calorieForm.foods) return;
    this.chartsService.addEntry(this.userId, 'food', this.calorieForm).subscribe(() => this.refreshAllData());
  }

  addWorkoutEntry(): void {
    if (this.exerciseForm.duration <= 0) return;
    this.chartsService.addEntry(this.userId, 'exercise', this.exerciseForm).subscribe(() => this.refreshAllData());
  }

  addWeightEntry(): void {
    if (this.weightForm.weight <= 0) return;
    this.chartsService.addEntry(this.userId, 'weight', this.weightForm).subscribe(() => this.refreshAllData());
  }

  addSleepEntry(): void {
    this.chartsService.addEntry(this.userId, 'sleep', this.sleepForm).subscribe(() => this.refreshAllData());
  }

  getFilterDays(): number {
    const option = this.periodOptions.find(o => o.id === this.selectedPeriod);
    return option ? option.days : 7;
  }

  onPeriodChange(period: any): void {
    this.selectedPeriod = period;
    this.refreshAllData();
  }

  getPercentage(current: number, target: number): number {
    return target <= 0 ? 0 : Math.min((current / target) * 100, 100);
  }

  getCurrentDateMessage(): string {
    return new Date().toLocaleDateString('sk-SK', { weekday: 'long', day: 'numeric', month: 'long' });
  }

  calculateBMI(): string {
    if (this.userProfile?.height && this.userProfile?.currentWeight) {
      const h = this.userProfile.height / 100;
      return (this.userProfile.currentWeight / (h * h)).toFixed(1);
    }
    return '--';
  }

  loadUserProfile() {
    this.userFitnessService.getUserProfile(this.userId).subscribe(p => {
      this.userProfile = p;
      if (p) {
        // Opravené na targetCalories podľa tvojho interface
        this.todayStats.calories.target = p.targetCalories || 2000;
        this.weightForm.weight = p.currentWeight || 0;
      }
    });
  }

  loadSubscriptionStatus() {
    this.paymentService.getPaymentStatus(this.userId).subscribe(res => this.isPremium = this.paymentService.hasPaidPlan(res.subscription));
  }

  // Pomocné funkcie pre grafy (zostávajú nezmenené)
  createPieChart(data: any, title: string) { return { tooltip: { trigger: 'item' }, series: [{ type: 'pie', radius: ['60%', '80%'], data: Object.entries(data).map(([name, value]) => ({ name, value })) }], color: ['#3ddc84', '#3d84dc', '#dc3d84'] }; }
  createLineChart(data: any[], title: string, key: string) { return { xAxis: { type: 'category', data: data.map(d => d.date) }, yAxis: { type: 'value' }, series: [{ data: data.map(d => d[key]), type: 'line', smooth: true, color: '#3ddc84' }] }; }
  createBarChart(data: any, title: string) { return { xAxis: { type: 'category', data: Object.keys(data) }, yAxis: { type: 'value' }, series: [{ data: Object.values(data), type: 'bar', color: '#843ddc' }] }; }
  translate(k: string) { return k; }
}