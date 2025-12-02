import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OllamaService } from '../services/ollama-ai.service';
import { OllamaResponse } from '../models/ollama-response';

@Component({
  selector: 'app-ollama-ai',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ollama-ai.html',
  styleUrls: ['./ollama-ai.scss'],
})
export class OllamaAi {

  prompt: string = '';
  response: string = '';
  loading: boolean = false;

  constructor(private ollamaService: OllamaService) {}

  sendPrompt() {
    if (!this.prompt.trim()) return;

    this.loading = true;
    this.response = '';

    this.ollamaService.processPrompt(this.prompt).subscribe({
      next: (res: OllamaResponse) => {
        this.response = res.response;
        this.loading = false;
      },
      error: (error) => {
        this.response = 'Chyba: ' + error.message;
        this.loading = false;
      }
    });
  }
}
