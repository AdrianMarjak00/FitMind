import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OllamaAi } from './ollama-ai';

describe('OllamaAi', () => {
  let component: OllamaAi;
  let fixture: ComponentFixture<OllamaAi>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OllamaAi]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OllamaAi);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
