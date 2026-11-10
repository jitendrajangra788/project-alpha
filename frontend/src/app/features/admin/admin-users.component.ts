import { Component, OnInit, inject } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { AdminService } from '../../core/admin.service';
import { User } from '../../core/models';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [MatTableModule],
  template: `
    <h1>Users</h1>
    <table mat-table [dataSource]="users" class="table">
      <ng-container matColumnDef="full_name">
        <th mat-header-cell *matHeaderCellDef>Name</th>
        <td mat-cell *matCellDef="let u">{{ u.full_name }}</td>
      </ng-container>
      <ng-container matColumnDef="mobile">
        <th mat-header-cell *matHeaderCellDef>Mobile</th>
        <td mat-cell *matCellDef="let u">{{ u.mobile }}</td>
      </ng-container>
      <ng-container matColumnDef="email">
        <th mat-header-cell *matHeaderCellDef>Email</th>
        <td mat-cell *matCellDef="let u">{{ u.email || '—' }}</td>
      </ng-container>
      <ng-container matColumnDef="roles">
        <th mat-header-cell *matHeaderCellDef>Roles</th>
        <td mat-cell *matCellDef="let u">{{ u.roles.join(', ') }}</td>
      </ng-container>
      <tr mat-header-row *matHeaderRowDef="cols"></tr>
      <tr mat-row *matRowDef="let row; columns: cols"></tr>
    </table>
  `,
  styles: `
    .table { width: 100%; background: white; }
  `,
})
export class AdminUsersComponent implements OnInit {
  private readonly admin = inject(AdminService);
  users: User[] = [];
  cols = ['full_name', 'mobile', 'email', 'roles'];

  ngOnInit(): void {
    this.admin.users().subscribe({ next: (res) => (this.users = res.items) });
  }
}
