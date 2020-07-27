import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { GeomCreateComponent } from './geom-create.component';

describe('GeomCreateComponent', () => {
  let component: GeomCreateComponent;
  let fixture: ComponentFixture<GeomCreateComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ GeomCreateComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(GeomCreateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
