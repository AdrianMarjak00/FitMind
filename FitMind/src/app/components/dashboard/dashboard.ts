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
import { trigger, state, style, transition, animate } from '@angular/animations';
import { Observable } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { UserFitnessService } from '../../services/user-fitness.service';
import { ChartsService } from '../../services/charts.service';
import { PaymentService, SubscriptionStatus } from '../../services/payment.service';
import { UserProfile } from '../../models/user-profile.interface';
import { FoodEntry, WorkoutEntry, WeightEntry, MoodEntry, SleepEntry, StressEntry } from '../../models/user-fitness-data.interface';
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
        style({ transform: 'translateX(100%)' }),
        animate('300ms ease-out', style({ transform: 'translateX(0)' }))
      ]),
      transition(':leave', [
        animate('300ms ease-in', style({ transform: 'translateX(100%)' }))
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

  // Grafy
  caloriesChart: any = {};
  calorieCategoryChart: any = {};
  exerciseChart: any = {};
  moodChart: any = {};
  stressChart: any = {};
  sleepChart: any = {};
  weightChart: any = {};

  // Detailné záznamy
  recentFoodEntries: FoodEntry[] = [];
  recentWorkoutEntries: WorkoutEntry[] = [];
  recentWeightEntries: WeightEntry[] = [];
  recentMoodEntries: MoodEntry[] = [];
  recentSleepEntries: SleepEntry[] = [];
  recentStressEntries: StressEntry[] = [];

  // Zobrazenie detailného panelu
  showDetailsPanel = false;
  selectedDetailType: 'food' | 'exercise' | 'weight' | 'mood' | 'sleep' | 'stress' | null = null;

  // 🆕 Denné štatistiky
  todayStats = {
    calories: { consumed: 0, target: 2000, remaining: 2000 },
    water: { consumed: 0, target: 2000 }, // ml
    exercise: { minutes: 0, target: 30 },
    steps: { count: 0, target: 10000 }
  };

  // 🆕 Týždenný súhrn
  weeklyStats = {
    calories: { total: 0, avg: 0, days: 0 },
    exercise: { total: 0, count: 0 },
    weight: { current: 0, change: 0 }
  };

  // 🗓️ FILTROVANIE OBDOBIA
  selectedPeriod: 'today' | 'week' | 'month' | 'custom' = 'week';
  periodOptions = [
    { id: 'today', label: 'Dnes', days: 1 },
    { id: 'week', label: 'Tento týždeň', days: 7 },
    { id: 'month', label: 'Tento mesiac', days: 30 },
    { id: 'custom', label: 'Vlastné', days: 0 }
  ];

  // Vlastný rozsah dátumov
  customDateFrom: Date | null = null;
  customDateTo: Date | null = null;
  showCustomDatePicker = false;

  // Aktívna záložka
  activeTab = 'calories';
  tabs = [
    { id: 'calories', label: 'Kalórie', icon: '🍽️' },
    { id: 'exercise', label: 'Cvičenie', icon: '💪' },
    { id: 'weight', label: 'Váha', icon: '⚖️' },
    { id: 'mood', label: 'Nálada', icon: '😊' },
    { id: 'sleep', label: 'Spánok', icon: '😴' },
    { id: 'stress', label: 'Stres', icon: '😰' }
  ];

  // Formuláre
  calorieForm = {
    meal: 'breakfast',
    foods: '',
    calories: 0,
    protein: 0,
    carbs: 0,
    fats: 0,
    category: 'food' as 'food' | 'drink',
    autoCalculate: true  // Auto-kalkulácia kalórií z makronutrientov
  };
  exerciseForm = { type: 'cardio', duration: 0, intensity: 'medium', caloriesBurned: 0 };
  weightForm = { weight: 0 };
  moodForm = { score: 5, note: '' };
  sleepForm = { hours: 0, quality: 'good' };
  stressForm = { level: 1, source: '' };

  // AI návrhy
  showAISuggestions = true; // Zobrazené automaticky
  aiSuggestions: string[] = [];

  // Premium
  isPremium = false;
  subscription: SubscriptionStatus | null = null;

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

      // Skontroluj či má overený email (iba pre email/password users)
      if (user && user.providerData.some(p => p?.providerId === 'password')) {
        this.showEmailVerificationBanner = !user.emailVerified;
      }

      if (this.userId) {
        this.loadUserProfile();
        this.refreshAllData();
        // Načítaj AI návrhy po načítaní dát
        setTimeout(() => this.loadAISuggestions(), 2000);
      } else {
        this.loading = false;
      }
    });
  }

  // === PREMIUM FUNKCIE ===

  loadSubscriptionStatus(): void {
    if (!this.userId) return;
    this.paymentService.getPaymentStatus(this.userId).subscribe({
      next: (response) => {
        this.subscription = response.subscription;
        this.isPremium = this.paymentService.hasPaidPlan(response.subscription);
      },
      error: () => {
        this.isPremium = false;
      }
    });
  }

  exportToCSV(): void {
    if (!this.isPremium) {
      alert('Export dát je dostupný len pre Premium používateľov.');
      return;
    }

    const rows: string[] = [];

    // Header
    rows.push('Typ,Dátum,Názov/Typ,Hodnota,Detaily');

    // Food entries
    this.recentFoodEntries.forEach(e => {
      const date = this.formatDateForExport(e.timestamp);
      rows.push(`Jedlo,${date},${e.name},${e.calories} kcal,"P:${e.protein || 0}g C:${e.carbs || 0}g T:${e.fats || 0}g"`);
    });

    // Workout entries
    this.recentWorkoutEntries.forEach(e => {
      const date = this.formatDateForExport(e.timestamp);
      rows.push(`Tréning,${date},${e.type},${e.duration} min,${e.intensity || ''}`);
    });

    // Weight entries
    this.recentWeightEntries.forEach(e => {
      const date = this.formatDateForExport(e.timestamp);
      rows.push(`Váha,${date},-,${e.weight} kg,-`);
    });

    // Mood entries
    this.recentMoodEntries.forEach(e => {
      const date = this.formatDateForExport(e.timestamp);
      rows.push(`Nálada,${date},-,${e.score}/10,${e.note || ''}`);
    });

    // Sleep entries
    this.recentSleepEntries.forEach(e => {
      const date = this.formatDateForExport(e.timestamp);
      rows.push(`Spánok,${date},-,${e.hours} h,${e.quality || ''}`);
    });

    // Stress entries
    this.recentStressEntries.forEach(e => {
      const date = this.formatDateForExport(e.timestamp);
      rows.push(`Stres,${date},-,${e.level}/10,${e.source || ''}`);
    });

    // Download
    const csvContent = rows.join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `fitmind-export-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  }

  formatDateForExport(timestamp: any): string {
    if (!timestamp) return '';
    let date: Date;
    if (timestamp.toDate) {
      date = timestamp.toDate();
    } else if (timestamp.seconds) {
      date = new Date(timestamp.seconds * 1000);
    } else {
      date = new Date(timestamp);
    }
    return date.toISOString().split('T')[0];
  }

  resendVerificationEmail(): void {
    this.authService.sendVerificationEmail().subscribe({
      next: () => {
        alert('Verifikačný email bol odoslaný! Skontroluj svoju schránku.');
      },
      error: () => {
        alert('Nepodarilo sa odoslať email. Skús to znova neskôr.');
      }
    });
  }

  dismissEmailBanner(): void {
    this.showEmailVerificationBanner = false;
  }

  // Načítaj posledné záznamy pre detailné zobrazenie
  loadRecentEntries(): void {
    const days = this.getFilterDays();
    this.userFitnessService.getRecentEntries(this.userId, days).subscribe({
      next: entries => {
        this.recentFoodEntries = entries.food;
        this.recentWorkoutEntries = entries.workout;
        this.recentWeightEntries = entries.weight;
        this.recentMoodEntries = entries.mood;
        this.recentSleepEntries = entries.sleep;
        this.recentStressEntries = entries.stress;
      },
      error: () => { }
    });
  }

  loadUserProfile(): void {
    this.userFitnessService.getUserProfile(this.userId).subscribe({
      next: profile => {
        this.userProfile = profile;
        if (profile) {
          this.weightForm.weight = profile.currentWeight || 0;
          this.todayStats.calories.target = profile.targetCalories || 2000;
          this.todayStats.calories.remaining = this.todayStats.calories.target;
        }
      },
      error: () => {
        // Profile might not exist yet or permission denied
        // This is OK for new users
      }
    });
  }

  // 🆕 Načítaj denné štatistiky
  loadTodayStats(): void {
    // Kalórie dnes
    this.chartsService.getChartData(this.userId, 'calories', 1).subscribe({
      next: data => {
        this.todayStats.calories.consumed = data.data.total || 0;
        this.todayStats.calories.remaining =
          this.todayStats.calories.target - this.todayStats.calories.consumed;
      },
      error: () => { }
    });

    // Cvičenie dnes
    this.chartsService.getChartData(this.userId, 'exercise', 1).subscribe({
      next: data => {
        this.todayStats.exercise.minutes = data.data.total_minutes || 0;
      },
      error: () => { }
    });
  }

  // 🆕 Načítaj týždenné štatistiky
  loadWeeklyStats(): void {
    this.chartsService.getChartData(this.userId, 'calories', 7).subscribe({
      next: data => {
        this.weeklyStats.calories.total = data.data.total || 0;
        this.weeklyStats.calories.avg = data.data.average || 0;
        this.weeklyStats.calories.days = data.data.count || 0;
      },
      error: () => { }
    });

    this.chartsService.getChartData(this.userId, 'exercise', 7).subscribe({
      next: data => {
        this.weeklyStats.exercise.total = data.data.total_minutes || 0;
        this.weeklyStats.exercise.count = data.data.count || 0;
      },
      error: () => { }
    });
  }

  // 🆕 Počítaj percentá
  getPercentage(current: number, target: number): number {
    if (target === 0) return 0;
    return Math.min((current / target) * 100, 100);
  }

  // 🆕 Aktuálny dátum
  getCurrentDateMessage(): string {
    const today = new Date();
    const days = ['Nedeľa', 'Pondelok', 'Utorok', 'Streda', 'Štvrtok', 'Piatok', 'Sobota'];
    const months = ['januára', 'februára', 'marca', 'apríla', 'mája', 'júna',
      'júla', 'augusta', 'septembra', 'októbra', 'novembra', 'decembra'];
    return `${days[today.getDay()]}, ${today.getDate()}. ${months[today.getMonth()]} ${today.getFullYear()}`;
  }

  calculateBMI(): string {
    if (this.userProfile && this.userProfile.height && this.userProfile.currentWeight) {
      const heightInMeters = this.userProfile.height / 100;
      const bmi = this.userProfile.currentWeight / (heightInMeters * heightInMeters);
      return bmi.toFixed(1);
    }
    return '--';
  }

  // Získaj počet dní pre aktuálny filter (od dnes dozadu)
  getFilterDays(): number {
    if (this.selectedPeriod !== 'custom') {
      const option = this.periodOptions.find(o => o.id === this.selectedPeriod);
      return option ? option.days : 7;
    }

    // Pre vlastný rozsah počítame dni od DNES po ZAČIATOK rozsahu
    if (this.customDateFrom) {
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      const diffTime = today.getTime() - this.customDateFrom.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return Math.max(1, diffDays);
    }

    return 7; // Default
  }

  // Zmena obdobia
  onPeriodChange(period: string): void {
    this.selectedPeriod = period as any;

    if (period === 'custom') {
      this.showCustomDatePicker = true;
    } else {
      this.showCustomDatePicker = false;
      this.refreshAllData();
    }
  }

  // Aplikovať vlastný rozsah dátumov
  applyCustomDateRange(): void {
    if (this.customDateFrom && this.customDateTo) {
      this.showCustomDatePicker = false;
      this.refreshAllData();
    }
  }

  // Získaj popis aktuálneho obdobia
  getPeriodLabel(): string {
    const days = this.getFilterDays();
    if (days === 1) return 'Dnes';
    if (days <= 7) return `${days} dní`;
    if (days <= 31) return `${days} dní`;
    return `${days} dní`;
  }


  // ===== PRIDÁVANIE ZÁZNAMOV =====

  addCalorieEntry(): void {
    if (!this.userId || !this.calorieForm.foods || this.calorieForm.calories <= 0) {
      alert('⚠️ Vyplňte názov jedla a kalórie');
      return;
    }

    this.userFitnessService.addFoodEntry(this.userId, {
      name: this.calorieForm.foods,
      calories: this.calorieForm.calories,
      protein: this.calorieForm.protein || 0,
      carbs: this.calorieForm.carbs || 0,
      fats: this.calorieForm.fats || 0,
      mealType: this.calorieForm.meal as any,
      category: this.calorieForm.category,
      timestamp: new Date()
    }).subscribe({
      next: () => {
        alert('✅ Záznam o jedle pridaný!');
        this.calorieForm = { meal: 'breakfast', foods: '', calories: 0, protein: 0, carbs: 0, fats: 0, category: 'food', autoCalculate: true };
        this.refreshAllData();
      },
      error: err => alert('❌ Chyba: ' + (err.message || 'Neznáma chyba'))
    });
  }

  addWorkoutEntry(): void {
    if (!this.userId || this.exerciseForm.duration <= 0) {
      alert('⚠️ Zadajte trvanie cvičenia');
      return;
    }

    this.userFitnessService.addWorkoutEntry(this.userId, {
      type: this.exerciseForm.type,
      duration: this.exerciseForm.duration,
      intensity: this.exerciseForm.intensity as any,
      caloriesBurned: this.exerciseForm.caloriesBurned || 0,
      timestamp: new Date()
    }).subscribe({
      next: () => {
        alert('✅ Záznam o cvičení pridaný!');
        this.exerciseForm = { type: 'cardio', duration: 0, intensity: 'medium', caloriesBurned: 0 };
        this.refreshAllData();
      },
      error: err => alert('❌ Chyba: ' + (err.message || 'Neznáma chyba'))
    });
  }

  addWeightEntry(): void {
    if (!this.userId || this.weightForm.weight <= 0) {
      alert('⚠️ Zadajte váhu');
      return;
    }

    this.userFitnessService.addWeightEntry(this.userId, {
      weight: this.weightForm.weight,
      timestamp: new Date()
    }).subscribe({
      next: () => {
        alert('✅ Váha zaznamenaná!');
        this.refreshAllData();
      },
      error: err => alert('❌ Chyba: ' + (err.message || 'Neznáma chyba'))
    });
  }

  // Refresh všetkých dát s koordinovaným loadingom
  refreshAllData(): void {
    if (!this.userId) return;
    this.loading = true;
    let completed = 0;
    const total = 6; // todayStats, weeklyStats, charts_food, charts_exercise, entries_food, entries_exercise

    const checkDone = () => {
      completed++;
      if (completed >= total) {
        this.loading = false;
      }
    };

    // 1. Dnešné štatistiky
    this.chartsService.getChartData(this.userId, 'calories', 1).subscribe({
      next: data => {
        this.todayStats.calories.consumed = data.data.total || 0;
        this.todayStats.calories.remaining = Math.max(0, this.todayStats.calories.target - this.todayStats.calories.consumed);
        checkDone();
      },
      error: () => checkDone()
    });

    // 2. Týždenné štatistiky
    this.chartsService.getChartData(this.userId, 'calories', 7).subscribe({
      next: data => {
        this.weeklyStats.calories.total = data.data.total || 0;
        this.weeklyStats.calories.avg = data.data.average || 0;
        checkDone();
      },
      error: () => checkDone()
    });

    // 3. Grafy - Jedlo
    this.chartsService.getChartData(this.userId, 'calories', this.getFilterDays()).subscribe({
      next: data => {
        this.caloriesChart = this.createPieChart(data.data.by_meal || {}, 'Kalórie podľa jedla');
        this.calorieCategoryChart = this.createPieChart(data.data.by_category || {}, 'Stravovací pomer');
        checkDone();
      },
      error: () => checkDone()
    });

    // 4. Grafy - Cvičenie
    this.chartsService.getChartData(this.userId, 'exercise', this.getFilterDays()).subscribe({
      next: data => {
        this.exerciseChart = this.createPieChart(data.data.by_type || {}, 'Cvičenie podľa typu');
        checkDone();
      },
      error: () => checkDone()
    });

    // 5. Posledné záznamy - Jedlo
    this.chartsService.getEntries(this.userId, 'food', this.getFilterDays()).subscribe({
      next: (entries: any) => { this.recentFoodEntries = entries; checkDone(); },
      error: () => checkDone()
    });

    // 6. Posledné záznamy - Cvičenie
    this.chartsService.getEntries(this.userId, 'exercise', this.getFilterDays()).subscribe({
      next: (entries: any) => { this.recentWorkoutEntries = entries; checkDone(); },
      error: () => checkDone()
    });

    // Ostatné záznamy (Váha, Nálada, Spánok, Stres) - na pozadí
    this.loadRemainingEntries();

    // Na pozadí (neblokuje loading)
    this.loadExtraCharts();
    this.loadAISuggestions();
    this.loadSubscriptionStatus();

    // Poistka proti zaseknutiu
    setTimeout(() => { if (this.loading) this.loading = false; }, 5000);
  }

  // Načítaj zvyšné záznamy na pozadí
  loadRemainingEntries(): void {
    const days = this.getFilterDays();
    this.chartsService.getEntries(this.userId, 'weight', days).subscribe((res: any) => this.recentWeightEntries = res);
    this.chartsService.getEntries(this.userId, 'mood', days).subscribe((res: any) => this.recentMoodEntries = res);
    this.chartsService.getEntries(this.userId, 'sleep', days).subscribe((res: any) => this.recentSleepEntries = res);
    this.chartsService.getEntries(this.userId, 'stress', days).subscribe((res: any) => this.recentStressEntries = res);
  }

  // Načítaj zvyšné grafy (Váha, Nálada, Stres, Spánok) na pozadí
  loadExtraCharts(): void {
    const days = this.getFilterDays();

    this.chartsService.getChartData(this.userId, 'mood', Math.max(days, 30)).subscribe({
      next: data => this.moodChart = this.createLineChart(data.data.trend || [], 'Nálada', 'score')
    });
    this.chartsService.getChartData(this.userId, 'stress', Math.max(days, 30)).subscribe({
      next: data => this.stressChart = this.createLineChart(data.data.trend || [], 'Stres', 'level')
    });
    this.chartsService.getChartData(this.userId, 'sleep', days).subscribe({
      next: data => this.sleepChart = this.createBarChart(data.data.by_quality || {}, 'Kvalita spánku')
    });
    this.chartsService.getChartData(this.userId, 'weight', Math.max(days, 90)).subscribe({
      next: data => this.weightChart = this.createLineChart(data.data.trend || [], 'Váha', 'weight')
    });
  }

  // Formátuj timestamp na čitateľný dátum
  formatDate(timestamp: any): string {
    if (!timestamp) return '';

    let date: Date;
    if (timestamp.toDate) {
      date = timestamp.toDate();
    } else if (timestamp.seconds) {
      date = new Date(timestamp.seconds * 1000);
    } else {
      date = new Date(timestamp);
    }

    return date.toLocaleDateString('sk-SK', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Otvor detail panel pre konkrétny typ
  openDetailsPanel(type: 'food' | 'exercise' | 'weight' | 'mood' | 'sleep' | 'stress'): void {
    this.selectedDetailType = type;
    this.showDetailsPanel = true;
  }

  // Zatvor detail panel
  closeDetailsPanel(): void {
    this.showDetailsPanel = false;
    this.selectedDetailType = null;
  }

  // Získaj záznamy pre aktuálne vybraný typ
  getSelectedEntries(): any[] {
    switch (this.selectedDetailType) {
      case 'food': return this.recentFoodEntries;
      case 'exercise': return this.recentWorkoutEntries;
      case 'weight': return this.recentWeightEntries;
      case 'mood': return this.recentMoodEntries;
      case 'sleep': return this.recentSleepEntries;
      case 'stress': return this.recentStressEntries;
      default: return [];
    }
  }

  // Získaj názov pre aktuálne vybraný typ
  getDetailTitle(): string {
    switch (this.selectedDetailType) {
      case 'food': return '🍽️ Detaily jedál';
      case 'exercise': return '💪 Detaily cvičení';
      case 'weight': return '⚖️ Detaily váhy';
      case 'mood': return '😊 Detaily nálady';
      case 'sleep': return '😴 Detaily spánku';
      case 'stress': return '😰 Detaily stresu';
      default: return 'Detaily';
    }
  }

  // 🆕 Automaticky vypočítaj kalórie z makronutrientov
  calculateCaloriesFromMacros(): void {
    if (this.calorieForm.autoCalculate) {
      const protein = this.calorieForm.protein || 0;
      const carbs = this.calorieForm.carbs || 0;
      const fats = this.calorieForm.fats || 0;

      // Proteíny: 4 kcal/g, Sacharidy: 4 kcal/g, Tuky: 9 kcal/g
      this.calorieForm.calories = Math.round(
        (protein * 4) + (carbs * 4) + (fats * 9)
      );
    }
  }

  // 🆕 Vypočítaj nutričné skóre (percentá makronutrientov)
  getNutritionScore(entry: FoodEntry): { protein: number, carbs: number, fats: number } {
    const total = (entry.protein || 0) + (entry.carbs || 0) + (entry.fats || 0);
    if (total === 0) return { protein: 0, carbs: 0, fats: 0 };

    return {
      protein: Math.round(((entry.protein || 0) / total) * 100),
      carbs: Math.round(((entry.carbs || 0) / total) * 100),
      fats: Math.round(((entry.fats || 0) / total) * 100)
    };
  }

  // 🆕 Denný nutričný súhrn
  getDailyNutritionSummary(): { protein: number, carbs: number, fats: number, calories: number } {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayEntries = this.recentFoodEntries.filter(entry => {
      let entryDate: Date;
      if (entry.timestamp.toDate) {
        entryDate = entry.timestamp.toDate();
      } else if (entry.timestamp.seconds) {
        entryDate = new Date(entry.timestamp.seconds * 1000);
      } else {
        entryDate = new Date(entry.timestamp);
      }
      entryDate.setHours(0, 0, 0, 0);
      return entryDate.getTime() === today.getTime();
    });

    return todayEntries.reduce((acc, entry) => ({
      protein: acc.protein + (entry.protein || 0),
      carbs: acc.carbs + (entry.carbs || 0),
      fats: acc.fats + (entry.fats || 0),
      calories: acc.calories + entry.calories
    }), { protein: 0, carbs: 0, fats: 0, calories: 0 });
  }

  // 🆕 Toggle AI návrhy
  toggleAISuggestions(): void {
    this.showAISuggestions = !this.showAISuggestions;
    if (this.showAISuggestions && this.aiSuggestions.length === 0) {
      this.loadAISuggestions();
    }
  }

  // 🗑️ DELETE FUNKCIE
  deleteEntry(entryId: string | undefined, type: 'food' | 'exercise' | 'weight' | 'mood' | 'sleep' | 'stress'): void {
    if (!entryId) {
      alert('❌ Záznam nemá ID, nemôže byť vymazaný');
      return;
    }

    if (!confirm('Naozaj chcete vymazať tento záznam?')) return;

    let deleteObs: Observable<void>;

    switch (type) {
      case 'food':
        deleteObs = this.userFitnessService.deleteFoodEntry(this.userId, entryId);
        break;
      case 'exercise':
        deleteObs = this.userFitnessService.deleteWorkoutEntry(this.userId, entryId);
        break;
      case 'weight':
        deleteObs = this.userFitnessService.deleteWeightEntry(this.userId, entryId);
        break;
      case 'mood':
        deleteObs = this.userFitnessService.deleteMoodEntry(this.userId, entryId);
        break;
      case 'sleep':
        deleteObs = this.userFitnessService.deleteSleepEntry(this.userId, entryId);
        break;
      case 'stress':
        deleteObs = this.userFitnessService.deleteStressEntry(this.userId, entryId);
        break;
      default:
        return;
    }

    deleteObs.subscribe({
      next: () => {
        alert('✅ Záznam vymazaný!');
        this.refreshAllData();
      },
      error: err => alert('❌ Chyba pri vymazávaní: ' + (err.message || 'Neznáma chyba'))
    });
  }

  loadAISuggestions(): void {
    const summary = this.getDailyNutritionSummary();
    const remaining = this.todayStats.calories.remaining;

    this.aiSuggestions = [];

    if (remaining > 500) {
      this.aiSuggestions.push('💡 Zostáva veľa kalórií - skúste pridať plnohodnotné jedlo');

      if (summary.protein < 50) {
        this.aiSuggestions.push('🥩 Nízky príjem bielkovín - odporúčam kuracie prsia, tuniak alebo cottage cheese');
      }

      if (summary.fats < 30) {
        this.aiSuggestions.push('🥑 Málo zdravých tukov - pridajte avokádo, orechy alebo olivový olej');
      }
    } else if (remaining < 200 && remaining > 0) {
      this.aiSuggestions.push('✅ Skoro splnený denný cieľ! Môžete si dať ľahkú večeru');
      this.aiSuggestions.push('🥗 Odporúčam: zeleninu, jogurt alebo ovocie');
    } else if (remaining <= 0) {
      this.aiSuggestions.push('⚠️ Prekročili ste denný limit - zajtra to vyrovnajte cvičením');
    }
  }

  addMoodEntry(): void {
    if (!this.userId || this.moodForm.score < 1 || this.moodForm.score > 10) {
      alert('⚠️ Zadajte platnú hodnotu (1-10)');
      return;
    }

    this.userFitnessService.addMoodEntry(this.userId, {
      score: this.moodForm.score,
      note: this.moodForm.note,
      timestamp: new Date()
    }).subscribe({
      next: () => {
        alert('✅ Nálada zaznamenaná!');
        this.moodForm = { score: 5, note: '' };
        this.refreshAllData();
      },
      error: err => alert('❌ Chyba: ' + (err.message || 'Neznáma chyba'))
    });
  }

  addSleepEntry(): void {
    if (!this.userId || this.sleepForm.hours <= 0) {
      alert('⚠️ Zadajte hodiny spánku');
      return;
    }

    this.userFitnessService.addSleepEntry(this.userId, {
      hours: this.sleepForm.hours,
      quality: this.sleepForm.quality as any,
      timestamp: new Date()
    }).subscribe({
      next: () => {
        alert('✅ Spánok zaznamenaný!');
        this.sleepForm = { hours: 0, quality: 'good' };
        this.refreshAllData();
      },
      error: err => alert('❌ Chyba: ' + (err.message || 'Neznáma chyba'))
    });
  }

  addStressEntry(): void {
    if (!this.userId || this.stressForm.level < 1 || this.stressForm.level > 10) {
      alert('⚠️ Zadajte platnú hodnotu (1-10)');
      return;
    }

    this.userFitnessService.addStressEntry(this.userId, {
      level: this.stressForm.level,
      source: this.stressForm.source,
      timestamp: new Date()
    }).subscribe({
      next: () => {
        alert('✅ Stres zaznamenaný!');
        this.stressForm = { level: 1, source: '' };
        this.refreshAllData();
      },
      error: err => alert('❌ Chyba: ' + (err.message || 'Neznáma chyba'))
    });
  }

  // ===== TVORBA GRAFOV =====

  createPieChart(data: any, title: string): any {
    console.log(`[CHART] Data for ${title}:`, data);
    if (!data || Object.keys(data).length === 0) {
      return {
        title: { text: title, left: 'center', textStyle: { color: '#666' } },
        series: [{
          type: 'pie',
          radius: ['40%', '70%'],
          data: [{ value: 1, name: 'Zatiaľ žiadne dáta', itemStyle: { color: '#1a1a1a' } }],
          label: { show: true, position: 'center', formatter: '{b}', color: '#555' },
          silent: true
        }]
      };
    }

    const chartData = Object.entries(data)
      .filter(([_, val]) => (val as number) > 0)
      .map(([name, value]) => ({
        name: this.translateKey(name),
        value: value || 0
      }));

    if (chartData.length === 0) {
      return {
        title: { text: title, left: 'center', textStyle: { color: '#666' } },
        series: [{
          type: 'pie',
          radius: ['40%', '70%'],
          data: [{ value: 1, name: 'Zatiaľ žiadne dáta', itemStyle: { color: '#1a1a1a' } }],
          label: { show: true, position: 'center', formatter: '{b}', color: '#555' },
          silent: true
        }]
      };
    }

    return {
      title: { text: title, left: 'center', textStyle: { color: '#3ddc84' } },
      tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
      legend: { bottom: 0, textStyle: { color: '#cfcfcf' }, itemGap: 10 },
      color: ['#3ddc84', '#26a69a', '#66bb6a', '#9ccc65', '#d4e157', '#ffee58'],
      series: [{
        type: 'pie',
        radius: ['40%', '70%'],
        data: chartData,
        itemStyle: {
          borderRadius: 8,
          borderColor: '#121212',
          borderWidth: 2
        },
        label: {
          color: '#cfcfcf',
          formatter: '{b}: {c}'
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(61, 220, 132, 0.5)'
          }
        }
      }]
    };
  }

  // Pomocná funkcia na preklad kľúčov v grafoch
  translateKey(key: string): string {
    const translations: any = {
      'breakfast': '🍳 Raňajky',
      'lunch': '🍱 Obed',
      'dinner': '🍽️ Večera',
      'snack': '🍎 Desiata',
      'other': '❓ Iné',
      'food': '🥫 Jedlo',
      'drink': '🥤 Nápoj',
      'cardio': '🏃 Kardio',
      'strength': '🏋️ Sila',
      'flexibility': '🧘 Flexibilita',
      'sports': '⚽ Šport'
    };
    return translations[key] || key;
  }

  createLineChart(data: any[], title: string, valueKey: string): any {
    if (!data || data.length === 0) {
      return {
        title: { text: title, left: 'center', textStyle: { color: '#3ddc84' } },
        xAxis: { type: 'category', data: [] },
        yAxis: { type: 'value' },
        series: [{ data: [], type: 'line' }]
      };
    }

    const dates = data.map(d => {
      if (d.date?.seconds) {
        return new Date(d.date.seconds * 1000).toLocaleDateString('sk-SK');
      }
      return d.date || '';
    });
    const values = data.map(d => d[valueKey] || 0);

    return {
      title: { text: title, left: 'center', textStyle: { color: '#3ddc84' } },
      tooltip: { trigger: 'axis' },
      xAxis: {
        type: 'category',
        data: dates,
        axisLine: { lineStyle: { color: '#333' } },
        axisLabel: { color: '#cfcfcf' }
      },
      yAxis: {
        type: 'value',
        axisLine: { lineStyle: { color: '#333' } },
        axisLabel: { color: '#cfcfcf' },
        splitLine: { lineStyle: { color: '#1e1e1e' } }
      },
      series: [{
        data: values,
        type: 'line',
        smooth: true,
        itemStyle: { color: '#3ddc84' },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(61, 220, 132, 0.3)' },
              { offset: 1, color: 'rgba(61, 220, 132, 0.05)' }
            ]
          }
        }
      }]
    };
  }

  createBarChart(data: any, title: string): any {
    if (!data || Object.keys(data).length === 0) {
      return {
        title: { text: title, left: 'center', textStyle: { color: '#3ddc84' } },
        xAxis: { type: 'category', data: [] },
        yAxis: { type: 'value' },
        series: [{ type: 'bar', data: [] }]
      };
    }

    const chartData = Object.entries(data).map(([name, value]) => ({
      name,
      value: value || 0
    }));

    return {
      title: { text: title, left: 'center', textStyle: { color: '#3ddc84' } },
      tooltip: { trigger: 'axis' },
      xAxis: {
        type: 'category',
        data: chartData.map(d => d.name),
        axisLine: { lineStyle: { color: '#333' } },
        axisLabel: { color: '#cfcfcf' }
      },
      yAxis: {
        type: 'value',
        axisLine: { lineStyle: { color: '#333' } },
        axisLabel: { color: '#cfcfcf' },
        splitLine: { lineStyle: { color: '#1e1e1e' } }
      },
      series: [{
        data: chartData.map(d => d.value),
        type: 'bar',
        itemStyle: {
          color: '#3ddc84',
          borderRadius: [4, 4, 0, 0]
        },
        emphasis: {
          itemStyle: {
            color: '#51ff89'
          }
        }
      }]
    };
  }
}

