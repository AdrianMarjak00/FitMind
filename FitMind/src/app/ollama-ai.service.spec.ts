import { TestBed } from '@angular/core/testing';

import { OllamaAIService } from './ollama-ai.service';

describe('OllamaAIService', () => {
  let service: OllamaAIService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(OllamaAIService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
