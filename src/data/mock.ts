import type { Complaint, QuizQuestion, Status, User } from '../types';

export const citizenUser: User = { name: 'Aarav Sharma', email: 'aarav@example.com', role: 'citizen' };
export const adminUser: User = { name: 'Municipal Admin', email: 'admin@enagrik.in', role: 'admin' };
export const INITIAL_POINTS = 45;

export const CATEGORIES = ['Overflowing Bin', 'Garbage on Road', 'Missed Collection', 'Illegal Dumping', 'Improper Segregation', 'Other'];
export const STATUSES: Status[] = ['Submitted', 'Under Review', 'In Progress', 'Resolved'];

export const initialComplaints: Complaint[] = [
  { id: 'EN-2026-1001', citizen: 'Aarav Sharma', category: 'Overflowing Bin', title: 'Bin overflowing near Sector 12 Park',
    description: 'The public bin near the park gate has been overflowing for two days and waste is spreading on the footpath.',
    location: 'Sector 12 Park', priority: 'High', status: 'In Progress', date: '30 Sep 2026', adminRemark: 'Collection team has been assigned.' },
  { id: 'EN-2026-1002', citizen: 'Aarav Sharma', category: 'Garbage on Road', title: 'Garbage pile near Main Market',
    description: 'A large garbage pile is blocking part of the road near the vegetable stalls.',
    location: 'Main Market', priority: 'Medium', status: 'Resolved', date: '28 Sep 2026', adminRemark: 'Area cleaned successfully.' },
  { id: 'EN-2026-1003', citizen: 'Aarav Sharma', category: 'Missed Collection', title: 'Waste was not collected from Green Residency',
    description: 'The garbage van did not visit our lane for the last three days.',
    location: 'Green Residency', priority: 'Medium', status: 'Submitted', date: '30 Sep 2026', adminRemark: 'Pending review.' },
];

export const commonIssuesBase: Record<string, number> = { 'Overflowing Bin': 10, 'Garbage on Road': 7, 'Missed Collection': 6, 'Illegal Dumping': 5 };

export const quizQuestions: QuizQuestion[] = [
  { q: 'Vegetable peels belong to which category?', options: ['Wet Waste', 'Dry Waste', 'E-Waste', 'Hazardous Waste'], answer: 0 },
  { q: 'Old newspapers and clean plastic bottles are…', options: ['Wet Waste', 'Dry Waste', 'E-Waste', 'Hazardous Waste'], answer: 1 },
  { q: 'A broken mobile charger should go to…', options: ['Wet Waste', 'Dry Waste', 'E-Waste', 'Hazardous Waste'], answer: 2 },
  { q: 'Expired medicines and used CFL bulbs are…', options: ['Wet Waste', 'Dry Waste', 'E-Waste', 'Hazardous Waste'], answer: 3 },
  { q: 'What is the correct way to use bins?', options: ['Mix all waste in one bag', 'Keep wet and dry waste separate', 'Put hazardous waste with wet waste', 'Burn waste in the open'], answer: 1 },
];

export const tips = [
  { title: 'Wet waste', text: 'Food scraps, vegetable peels, flowers.', color: 'bg-green-100 text-green-800' },
  { title: 'Dry waste', text: 'Paper, plastic, metal, clean packaging.', color: 'bg-blue-100 text-blue-800' },
  { title: 'E-waste', text: 'Phones, chargers, batteries.', color: 'bg-yellow-100 text-yellow-800' },
  { title: 'Hazardous waste', text: 'Bulbs, chemicals, medicines.', color: 'bg-red-100 text-red-800' },
];
