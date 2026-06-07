// backup-date.pipe.ts
import { Pipe, PipeTransform } from '@angular/core';

// Estrae la data YYYY-MM-DD dal nome del file e la formatta in dd/mm/YYYY
@Pipe({ name: 'backupDate', standalone: true })
export class BackupDatePipe implements PipeTransform {
  transform(backupName: string): string {
    const match = backupName.match(/(\d{4}-\d{2}-\d{2})/);
    if (!match) return backupName;

    const [year, month, day] = match[1].split('-');
    return `${day}/${month}/${year}`;
  }
}