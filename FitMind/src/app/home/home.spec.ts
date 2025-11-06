import { ComponentFixture, TestBed } from '@angular/core/testing';

import { home } from './home';

describe('Home', () => {
  let component: home;
  let fixture: ComponentFixture<home>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [home]
    })
    .compileComponents();

    fixture = TestBed.createComponent(home);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
