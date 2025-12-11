import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Jedalnicek } from './jedalnicek';

describe('Jedalnicek', () => {
  let component: Jedalnicek;
  let fixture: ComponentFixture<Jedalnicek>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Jedalnicek]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Jedalnicek);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
