import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { PlatformService } from '../core/platform.service';
import { PublicFooterComponent } from '../shared/public-footer.component';
import { PublicHeaderComponent } from '../shared/public-header.component';

@Component({
  selector: 'app-public-layout',
  standalone: true,
  imports: [RouterOutlet, PublicHeaderComponent, PublicFooterComponent],
  template: `
    <div class="shell">
      <app-public-header />
      <main class="content">
        <router-outlet />
      </main>
      <app-public-footer />
    </div>
  `,
  styles: `
    .shell {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      background:
        radial-gradient(circle at top right, rgba(20,184,166,0.08), transparent 28%),
        linear-gradient(180deg, #f4f9fc 0%, #ffffff 42%, #f7fbfd 100%);
    }
    .content { flex: 1; }
  `,
})
export class PublicLayoutComponent implements OnInit {
  private readonly platform = inject(PlatformService);

  ngOnInit(): void {
    this.platform.load().subscribe({ error: () => undefined });
  }
}
