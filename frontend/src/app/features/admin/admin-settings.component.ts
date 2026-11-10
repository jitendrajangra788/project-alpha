import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { PlatformService } from '../../core/platform.service';

@Component({
  selector: 'app-admin-settings',
  standalone: true,
  imports: [ReactiveFormsModule, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  template: `
    <h1>Platform settings</h1>
    <mat-card>
      <form [formGroup]="form" (ngSubmit)="save()">
        <mat-form-field appearance="outline" class="full">
          <mat-label>Brand name</mat-label>
          <input matInput formControlName="brand_name" />
        </mat-form-field>
        <mat-form-field appearance="outline" class="full">
          <mat-label>Tagline</mat-label>
          <input matInput formControlName="tagline" />
        </mat-form-field>
        <mat-form-field appearance="outline" class="full">
          <mat-label>Support email</mat-label>
          <input matInput formControlName="support_email" />
        </mat-form-field>
        <mat-form-field appearance="outline" class="full">
          <mat-label>Support phone</mat-label>
          <input matInput formControlName="support_phone" />
        </mat-form-field>
        <button mat-flat-button color="primary" [disabled]="form.invalid || saving">
          {{ saving ? 'Saving...' : 'Save settings' }}
        </button>
      </form>
      @if (message) { <p>{{ message }}</p> }
    </mat-card>
  `,
  styles: `
    mat-card { padding: 1.25rem; max-width: 560px; }
    .full { width: 100%; display: block; margin-bottom: 0.5rem; }
  `,
})
export class AdminSettingsComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly platform = inject(PlatformService);
  saving = false;
  message = '';

  readonly form = this.fb.nonNullable.group({
    brand_name: ['CareConnect', Validators.required],
    tagline: [''],
    support_email: [''],
    support_phone: [''],
  });

  ngOnInit(): void {
    this.platform.load().subscribe({
      next: (s) =>
        this.form.patchValue({
          brand_name: s.brand_name,
          tagline: s.tagline || '',
          support_email: s.support_email || '',
          support_phone: s.support_phone || '',
        }),
    });
  }

  save(): void {
    this.saving = true;
    this.platform.update(this.form.getRawValue()).subscribe({
      next: () => {
        this.saving = false;
        this.message = 'Settings saved';
      },
      error: () => {
        this.saving = false;
        this.message = 'Save failed';
      },
    });
  }
}
