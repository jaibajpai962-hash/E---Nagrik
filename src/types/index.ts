export type Role = 'citizen' | 'admin';
export type Status = 'Submitted' | 'Under Review' | 'In Progress' | 'Resolved';
export type Priority = 'Low' | 'Medium' | 'High';
export interface User { name: string; email: string; role: Role }
export interface Complaint {
  id: string; citizen: string; category: string; title: string; description: string;
  location: string; priority: Priority; status: Status; date: string; adminRemark: string; photo?: string;
}
export type NewComplaint = Omit<Complaint, 'id' | 'citizen' | 'status' | 'date' | 'adminRemark'>;
export interface ToastMsg { text: string; type: 'success' | 'error' }
export interface QuizQuestion { q: string; options: string[]; answer: number }
