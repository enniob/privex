import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SetupDialogComponent } from './setup-dialog.component';

describe('SetupDialogComponent', () => {
  let component: SetupDialogComponent;
  let fixture: ComponentFixture<SetupDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SetupDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SetupDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
