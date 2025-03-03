import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-setup-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatInputModule, MatButtonModule, MatDialogModule],
  templateUrl: './setup-dialog.component.html',
  styleUrls: ['./setup-dialog.component.scss'],
})
export class SetupDialogComponent {
  callSign: string = '';
  ipAddress: string = '';

  constructor(
    public dialogRef: MatDialogRef<SetupDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.ipAddress = data.ipAddress; // Pass the IP address to the dialog
  }

  onSave() {
    this.dialogRef.close(this.callSign); // Return the callSign when the dialog is closed
  }

  onCancel() {
    this.dialogRef.close(); // Close the dialog without saving
  }
}