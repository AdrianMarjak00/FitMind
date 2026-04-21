import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TestPythonService, Polozka } from '../../services/test-python.service';

@Component({
  selector: 'app-test-python',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './test-python.html',
  styleUrl: './test-python.scss'
})
export class TestPythonComponent implements OnInit {
  polozky: Polozka[] = [];
  nova: Polozka = { nazov: '', cena: 0 };
  sprava = '';
  chyba = '';

  constructor(private testService: TestPythonService) {}

  ngOnInit(): void {
    this.nacitajPolozky();
  }

  nacitajPolozky(): void {
    this.chyba = '';
    this.testService.getPolozky().subscribe({
      next: (data) => { this.polozky = data; },
      error: () => { this.chyba = 'Python server nie je spustený. Spusti: uvicorn main:app --port 8001'; }
    });
  }

  odosliPolozku(): void {
    if (!this.nova.nazov.trim() || this.nova.cena <= 0) {
      this.chyba = 'Zadaj platný názov a cenu väčšiu ako 0.';
      return;
    }
    this.chyba = '';
    this.testService.pridajPolozku({ ...this.nova }).subscribe({
      next: () => {
        this.sprava = `"${this.nova.nazov}" bolo odoslané do Pythonu a uložené!`;
        this.nova = { nazov: '', cena: 0 };
        this.nacitajPolozky();
      },
      error: () => { this.chyba = 'Python server nie je spustený. Spusti: uvicorn main:app --port 8001'; }
    });
  }
}
