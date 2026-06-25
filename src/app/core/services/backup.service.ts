// backup.service.ts
import { Injectable, inject, signal } from '@angular/core';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';

// Nome base dei file di backup — la data viene appesa al nome
const BACKUP_PREFIX = 'PCGameLibrary_backup_';
// Numero massimo di backup da mantenere
const MAX_BACKUPS = 3;

export interface BackupInfo {
  id: string;
  name: string;
  createdTime: string;
}

@Injectable({ providedIn: 'root' })
export class BackupService {
  private auth = inject(AuthService);

  // Lista dei backup attivi, esposta al template
  readonly backups = signal<BackupInfo[]>([]);
  readonly isRunning = signal(false);

  // Esegue il backup giornaliero se non è già stato fatto oggi
  async runDailyBackupIfNeeded(): Promise<void> {
    await this.auth.ensureValidToken();

    const existingBackups = await this.fetchBackupList();
    this.backups.set(existingBackups);

    if (this.isTodayAlreadyBackedUp(existingBackups)) {
      return;
    }

    this.isRunning.set(true);
    try {
      await this.createBackup();
      // Drive impiega qualche istante ad indicizzare il file appena copiato
      await new Promise(resolve => setTimeout(resolve, 2000));
      const updated = await this.fetchBackupList();
      await this.pruneOldBackups(updated);
      console.log('updated backups:', updated);
      const final = await this.fetchBackupList();
      this.backups.set(final);
    } finally {
      this.isRunning.set(false);
    }
  }

  // Recupera la lista dei backup ordinata per data decrescente
  private async fetchBackupList(): Promise<BackupInfo[]> {
    const token = this.auth.accessToken();
    const query = encodeURIComponent(
      `name contains '${BACKUP_PREFIX}' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`
    );
    const fields = encodeURIComponent('files(id,name,createdTime)');

    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${query}&fields=${fields}&pageSize=20&corpora=user`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!res.ok) throw new Error(`Drive list error: ${res.status}`);
    const data = await res.json();

    // Ordina per data decrescente lato client — non fidarsi dell'orderBy con q
    return ((data.files ?? []) as BackupInfo[]).sort((a, b) =>
      b.createdTime.localeCompare(a.createdTime)
    );
  }

  // Controlla se esiste già un backup con la data di oggi nel nome
  private isTodayAlreadyBackedUp(backups: BackupInfo[]): boolean {
    const today = this.todayString();
    return backups.some(b => b.name.includes(today));
  }

  // Crea una copia del foglio con nome contenente la data odierna
  private async createBackup(): Promise<void> {
    const token = this.auth.accessToken();
    const name = `${BACKUP_PREFIX}${this.todayString()}`;

    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${environment.spreadsheetId}/copy`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name }),
      }
    );

    if (!res.ok) throw new Error(`Drive copy error: ${res.status}`);
  }

  // Elimina i backup oltre il limite massimo (i più vecchi)
  private async pruneOldBackups(backups: BackupInfo[]): Promise<void> {
    // I backup sono già ordinati per data decrescente — quelli da eliminare sono in coda
    const toDelete = backups.slice(MAX_BACKUPS);
    const token = this.auth.accessToken();

    for (const backup of toDelete) {
      await fetch(`https://www.googleapis.com/drive/v3/files/${backup.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
    }
  }

  // Restituisce la data odierna in formato YYYY-MM-DD
  private todayString(): string {
    return new Date().toISOString().slice(0, 10);
  }
}