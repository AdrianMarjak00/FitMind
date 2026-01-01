import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { NgxEchartsModule } from 'ngx-echarts';
import { ChartsService } from '../services/charts.service';
import { AuthService } from '../services/auth.service';
import { AiService } from '../services/ai.service';
import { StatsService } from '../services/stats.service';
import { User } from '@angular/fire/auth';
import { Activity } from '../models/activity.model';
import { MatCard } from "@angular/material/card";

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    NgxEchartsModule,
    FormsModule,
    MatButtonModule,
    MatInputModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatCard
],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss']
})
export class DashboardComponent implements OnInit {
  currentUser: User | null = null;
  userId = '';
  loading = true;
  isProcessingAi = false;
  aiInputText = '';
  errorMessage = '';
  recentActivities: Activity[] = [];

  // Chart data
  caloriesChart: any = {};
  exerciseChart: any = {};
  moodChart: any = {};
  stressChart: any = {};
  sleepChart: any = {};
  weightChart: any = {};

  constructor(
    private chartsService: ChartsService,
    private authService: AuthService,
    private aiService: AiService,
    private statsService: StatsService
  ) {}

  ngOnInit(): void {
    this.authService.getCurrentUser().subscribe(user => {
      this.currentUser = user;
      this.userId = user?.uid || '';
      if (this.userId) {
        this.loadDashboardData();
      }
    });
  }

  loadDashboardData(): void {
    this.loading = true;
    this.errorMessage = '';

    // Load charts
    this.loadCharts();
    
    // Load recent activities
    this.statsService.getRecentActivities(this.userId).subscribe({
      next: data => {
        this.recentActivities = data;
        this.loading = false;
      },
      error: err => {
        this.errorMessage = 'Failed to load activities.';
        this.loading = false;
      }
    });
  }

  loadCharts(): void {
    // Calories Pie Chart
    this.chartsService.getChartData(this.userId, 'calories', 7).subscribe(data => {
      this.caloriesChart = this.createPieChart(data.data.by_meal, 'Calories by Meal');
    });

    // Exercise Pie Chart
    this.chartsService.getChartData(this.userId, 'exercise', 7).subscribe(data => {
      this.exerciseChart = this.createPieChart(data.data.by_type, 'Exercise by Type');
    });

    // Mood Line Chart
    this.chartsService.getChartData(this.userId, 'mood', 30).subscribe(data => {
      this.moodChart = this.createLineChart(data.data.trend, 'Mood', 'score');
    });

    // Stress Line Chart
    this.chartsService.getChartData(this.userId, 'stress', 30).subscribe(data => {
      this.stressChart = this.createLineChart(data.data.trend, 'Stress', 'level');
    });

    // Sleep Bar Chart
    this.chartsService.getChartData(this.userId, 'sleep', 7).subscribe(data => {
      this.sleepChart = this.createBarChart(data.data.by_quality, 'Sleep Quality');
    });

    // Weight Line Chart
    this.chartsService.getChartData(this.userId, 'weight', 90).subscribe(data => {
      this.weightChart = this.createLineChart(data.data.trend, 'Weight', 'weight');
    });
  }
  
  processAiInput(): void {
    if (!this.userId || !this.aiInputText) return;

    this.isProcessingAi = true;
    this.errorMessage = '';
    const rawInput = this.aiInputText;

    this.aiService.processInputForActivity(this.userId, rawInput).subscribe({
      next: (activity: Activity | null) => {
        if (activity) {
          // Save the processed activity to the database
          this.statsService.saveActivity(this.userId, activity).subscribe({
            next: () => {
              this.aiInputText = ''; // Clear input
              this.isProcessingAi = false;
              this.loadDashboardData(); // Reload charts and activities
            },
            error: err => {
              this.errorMessage = 'AI processed the data, but failed to save it.';
              this.isProcessingAi = false;
            }
          });
        } else {
          this.errorMessage = 'AI could not extract valid activity data from your input.';
          this.isProcessingAi = false;
        }
      },
      error: err => {
        this.errorMessage = 'Failed to connect to AI service.';
        this.isProcessingAi = false;
      }
    });
  }

  // Chart creation helper methods (Kept existing logic, only changed title strings)

  createPieChart(data: any, title: string): any {
    if (!data || Object.keys(data).length === 0) {
      return { title: { text: title }, series: [{ type: 'pie', data: [] }] };
    }
    
    const chartData = Object.entries(data || {}).map(([name, value]) => ({
      name,
      value: value || 0
    }));

    return {
      title: { text: title, left: 'center' },
      tooltip: { trigger: 'item' },
      series: [{
        type: 'pie',
        radius: ['40%', '70%'],
        data: chartData,
        emphasis: { itemStyle: { shadowBlur: 10, shadowOffsetX: 0 } }
      }]
    };
  }

  createLineChart(data: any[], title: string, valueKey: string): any {
    if (!data || data.length === 0) {
      return { title: { text: title }, series: [{ data: [], type: 'line' }] };
    }
    
    const dates = data.map(d => {
      if (d.date?.seconds) {
        return new Date(d.date.seconds * 1000).toLocaleDateString();
      }
      return d.date || '';
    });
    const values = data.map(d => d[valueKey] || 0);

    return {
      title: { text: title, left: 'center' },
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: dates },
      yAxis: { type: 'value' },
      series: [{
        data: values,
        type: 'line',
        smooth: true
      }]
    };
  }

  createBarChart(data: any, title: string): any {
    if (!data || Object.keys(data).length === 0) {
      return { title: { text: title }, series: [{ type: 'bar', data: [] }] };
    }
    
    const chartData = Object.entries(data || {}).map(([name, value]) => ({
      name,
      value: value || 0
    }));

    return {
      title: { text: title, left: 'center' },
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: chartData.map(d => d.name) },
      yAxis: { type: 'value' },
      series: [{
        data: chartData.map(d => d.value),
        type: 'bar'
      }]
    };
  }
}