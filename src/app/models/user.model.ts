export interface User {
  id: number; // Opcional porque el backend lo genera
  username: string;
  email: string;
  password: string;
  pollas: number[]; // IDs de las pollas en las que participa
}
