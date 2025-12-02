import { Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';

@Component({
  selector: 'app-piechart',
  standalone: true,
  imports: [MatCardModule, MatButtonModule, MatIconModule, BaseChartDirective],
  templateUrl: './piechart.html',
  styleUrls: ['./piechart.scss']
})
export class PiechartComponent {

  public pieChartType: ChartType = 'pie';

  public pieChartData: ChartData<'pie', number[], string | string[]> = {
    labels: ['Kardio (35%)', 'Silový tréning (45%)', 'Relax/Jóga (20%)'],
    datasets: [
      {
        data: [35, 45, 20],
        backgroundColor: ['#ef233c', '#8d99ae', '#2b2d42'],
        hoverBackgroundColor: ['#d90429', '#7f8a9e', '#1e1f2b']
      }
    ]
  };

  public pieChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    plugins: {
      legend: { display: true, position: 'top' }
    }
  };

  public randomize(): void {
    this.pieChartData.datasets[0].data = [
      Math.round(Math.random() * 100),
      Math.round(Math.random() * 100),
      Math.round(Math.random() * 100)
    ];
  }
}
