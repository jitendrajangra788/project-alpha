import { Component, inject } from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { ClinicalService } from '../../core/clinical.service';

@Component({
  selector: 'app-doctor-prescription',
  standalone: true,
  imports: [ReactiveFormsModule, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  template: `
    <h1>Write prescription</h1>
    <mat-card>
      <form [formGroup]="form" (ngSubmit)="submit()">
        <mat-form-field appearance="outline" class="full">
          <mat-label>Patient ID</mat-label>
          <input matInput formControlName="patient_id" />
        </mat-form-field>
        <mat-form-field appearance="outline" class="full">
          <mat-label>Booking ID (optional)</mat-label>
          <input matInput formControlName="booking_id" />
        </mat-form-field>
        <mat-form-field appearance="outline" class="full">
          <mat-label>Diagnosis</mat-label>
          <input matInput formControlName="diagnosis" />
        </mat-form-field>
        <mat-form-field appearance="outline" class="full">
          <mat-label>Instructions</mat-label>
          <textarea matInput rows="3" formControlName="instructions"></textarea>
        </mat-form-field>

        <div formArrayName="medicines">
          @for (m of medicines.controls; track $index; let i = $index) {
            <div [formGroupName]="i" class="med">
              <mat-form-field appearance="outline"><mat-label>Medicine</mat-label><input matInput formControlName="medicine_name" /></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Dosage</mat-label><input matInput formControlName="dosage" /></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Frequency</mat-label><input matInput formControlName="frequency" /></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Duration</mat-label><input matInput formControlName="duration" /></mat-form-field>
            </div>
          }
        </div>
        <button mat-button type="button" (click)="addMedicine()">Add medicine</button>
        <button mat-flat-button color="primary" [disabled]="form.invalid || loading">
          {{ loading ? 'Saving...' : 'Finalize prescription' }}
        </button>
      </form>
      @if (message) { <p>{{ message }}</p> }
    </mat-card>
  `,
  styles: `
    mat-card { padding: 1rem; max-width: 900px; }
    .full { width: 100%; display: block; }
    .med { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.5rem; }
    @media (max-width: 800px) { .med { grid-template-columns: 1fr; } }
  `,
})
export class DoctorPrescriptionComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ClinicalService);
  loading = false;
  message = '';

  readonly form = this.fb.nonNullable.group({
    patient_id: ['', Validators.required],
    booking_id: [''],
    diagnosis: [''],
    instructions: [''],
    medicines: this.fb.array([this.medicineGroup()]),
  });

  get medicines(): FormArray {
    return this.form.get('medicines') as FormArray;
  }

  medicineGroup() {
    return this.fb.nonNullable.group({
      medicine_name: ['', Validators.required],
      dosage: [''],
      frequency: [''],
      duration: [''],
    });
  }

  addMedicine(): void {
    this.medicines.push(this.medicineGroup());
  }

  submit(): void {
    this.loading = true;
    const raw = this.form.getRawValue();
    this.api
      .createPrescription({
        patient_id: raw.patient_id,
        booking_id: raw.booking_id || null,
        diagnosis: raw.diagnosis,
        instructions: raw.instructions,
        medicines: raw.medicines,
      })
      .subscribe({
        next: () => {
          this.loading = false;
          this.message = 'Prescription finalized and added to patient timeline.';
        },
        error: (err) => {
          this.loading = false;
          this.message = typeof err?.error?.detail === 'string' ? err.error.detail : 'Failed';
        },
      });
  }
}
