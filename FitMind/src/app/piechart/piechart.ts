import { Component } from '@angular/core';
import { NgxEchartsModule } from 'ngx-echarts';
import { StatsService } from '../services/stats.service';
import { Stats } from '../models/stats.interface';
@Component({
  selector: 'app-graph',
  standalone: true,
  imports: [NgxEchartsModule],
  templateUrl: './piechart.html',
  styleUrls: ['./piechart.scss'],
})
export class Piechart {
  
  chartOptions: any = {};
  loading = true;

  constructor(private statsService: StatsService) {}

  ngOnInit(): void {
    this.statsService.getStats().subscribe((data: Stats[]) => {
      this.setChartOptions(data);
      this.loading = false;
    });
  }

  setChartOptions(data: Stats[]) {
    this.chartOptions = {
      tooltip: {
        trigger: 'item'
      },
      legend: {
        top: 'bottom'
      },
      series: [
        {
          name: 'Pie Stats',
          type: 'pie',
          radius: ['40%', '70%'],     // donut
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 10,
            borderColor: '#000',
            borderWidth: 2
          },
          label: {
            show: true,
            formatter: '{b}: {c}'
          },
          emphasis: {
            scale: true
          },
          data: data   // Firestore data priamo v 'name'/'value'
        }
      ]
    };
  }
}
