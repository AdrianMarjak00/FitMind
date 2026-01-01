import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgxEchartsModule } from 'ngx-echarts';
import { ChartsService } from '../services/charts.service';
import { AuthService } from '../services/auth.service';
import { User } from '@angular/fire/auth';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, NgxEchartsModule],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss']
})
export class DashboardComponent implements OnInit {
  currentUser: User | null = null;
  userId = '';
  loading = true;
  
  // Grafové dáta
  caloriesChart: any = {};
  exerciseChart: any = {};
  moodChart: any = {};
  stressChart: any = {};
  sleepChart: any = {};
  weightChart: any = {};

  constructor(
    private chartsService: ChartsService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.authService.getCurrentUser().subscribe(user => {
      this.currentUser = user;
      this.userId = user?.uid || '';
      if (this.userId) {
        this.loadCharts();
      }
    });
  }

  loadCharts(): void {
    this.loading = true;
    
    // Kalórie Pie Chart
    this.chartsService.getChartData(this.userId, 'calories', 7).subscribe(data => {
      this.caloriesChart = this.createPieChart(data.data.by_meal, 'Kalórie podľa jedla');
    });

    // Cvičenie Pie Chart
    this.chartsService.getChartData(this.userId, 'exercise', 7).subscribe(data => {
      this.exerciseChart = this.createPieChart(data.data.by_type, 'Cvičenie podľa typu');
    });

    // Nálada Line Chart
    this.chartsService.getChartData(this.userId, 'mood', 30).subscribe(data => {
      this.moodChart = this.createLineChart(data.data.trend, 'Nálada', 'score');
    });

    // Stres Line Chart
    this.chartsService.getChartData(this.userId, 'stress', 30).subscribe(data => {
      this.stressChart = this.createLineChart(data.data.trend, 'Stres', 'level');
    });

    // Spánok Bar Chart
    this.chartsService.getChartData(this.userId, 'sleep', 7).subscribe(data => {
      this.sleepChart = this.createBarChart(data.data.by_quality, 'Kvalita spánku');
    });

    // Váha Line Chart
    this.chartsService.getChartData(this.userId, 'weight', 90).subscribe(data => {
      this.weightChart = this.createLineChart(data.data.trend, 'Váha', 'weight');
    });

    this.loading = false;
  }

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



